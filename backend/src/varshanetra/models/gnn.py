"""
Graph Neural Network branch for river/drainage connectivity (Section 8):

    "For flood prediction, explicitly model connectivity between:
     - upstream/downstream river cells
     - drainage cells
     - low-elevation urban cells"

`encoders.py` previously only *mentioned* this as an extension point. This
module implements it: a small message-passing GNN over an explicit
drainage/river graph, producing one embedding per grid cell that the flood
head can use alongside (or instead of) the static-terrain MLP embedding.

Design notes
------------
* The graph is built from data already in the static feature set
  (`distance_to_river_m`, `elevation_m`, `drainage_density`) plus explicit
  river topology if available (`river_network` in the dataset design doc's
  static features) — see `build_drainage_graph`.
* Edges are directed downstream->upstream is NOT assumed; instead each edge
  carries a scalar "downhill-ness" (elevation drop / distance) so the GNN
  can learn flow direction from data rather than it being hard-coded, while
  still being initialized sensibly (message weight higher for edges that
  flow toward lower elevation, since water does).
* Implemented with plain PyTorch (no torch_geometric dependency, since that
  package isn't in requirements.txt / wasn't verified available) — a
  from-scratch sparse message-passing layer using `index_add_`, which is
  standard practice when avoiding an extra heavy dependency for a small
  number of message-passing layers.
* Like the rest of `models/`, this requires torch and has been
  **syntax-checked only** (`python -m py_compile`), not executed, per the
  same environment constraints documented in training/train.py.
"""
from __future__ import annotations

from typing import Dict, Tuple

import numpy as np


def build_drainage_graph(
    static_df,
    k_neighbors: int = 4,
    grid_col: str = "grid_id",
    lat_col: str = "lat",
    lon_col: str = "lon",
    elevation_col: str = "elevation_m",
) -> Dict[str, np.ndarray]:
    """Builds a k-nearest-neighbor graph over grid cells (proxy for
    river/drainage adjacency when explicit river-network vector data isn't
    available — replace with real upstream/downstream topology from a DEM
    flow-accumulation analysis or a river-network shapefile in production,
    see dataset design doc Section 4 "river_network").

    Returns a dict with:
        edge_index: (2, E) int array of [source, target] node indices
        edge_weight: (E,) float array — normalized downhill-ness in [0, 1],
            higher where water is more likely to actually flow along that
            edge (steeper drop over a shorter distance).
        node_order: (N,) array of grid_id, defining the index<->grid_id
            mapping edge_index refers to.
    """
    from scipy.spatial import cKDTree

    static_df = static_df.drop_duplicates(grid_col).reset_index(drop=True)
    coords = static_df[[lat_col, lon_col]].to_numpy()
    elevation = static_df[elevation_col].to_numpy() if elevation_col in static_df else np.zeros(len(static_df))
    n = len(static_df)
    k = min(k_neighbors + 1, n)  # +1 because the query includes the node itself

    tree = cKDTree(coords)
    dists, idx = tree.query(coords, k=k)
    dists, idx = np.atleast_2d(dists), np.atleast_2d(idx)

    sources, targets, weights = [], [], []
    for i in range(n):
        for j_pos in range(1, idx.shape[1]):  # skip self (j_pos=0)
            j = idx[i, j_pos]
            dist_deg = max(dists[i, j_pos], 1e-6)
            dist_m = dist_deg * 111_000
            drop = elevation[i] - elevation[j]  # positive if i is higher than j (flow i->j)
            downhill_ness = max(drop, 0.0) / dist_m
            sources.append(i)
            targets.append(j)
            weights.append(downhill_ness)

    weights = np.array(weights, dtype=np.float32)
    if weights.max() > 0:
        weights = weights / weights.max()
    # give flat/uphill edges a small non-zero floor so the graph stays
    # connected for message passing even where there's no clear downhill
    # direction (e.g. flat urban terrain, still hydrologically connected
    # via drainage infrastructure not captured by raw elevation).
    weights = np.clip(weights, 0.05, 1.0)

    return {
        "edge_index": np.stack([np.array(sources), np.array(targets)]),
        "edge_weight": weights,
        "node_order": static_df[grid_col].to_numpy(),
    }


class DrainageGNNEncoder:
    """Lazily defines the actual nn.Module so this file stays importable
    (and its graph-building helper above testable) without torch installed.
    Call `.build()` once torch is available to get the real nn.Module."""

    @staticmethod
    def build(in_features: int, hidden: int, embed_dim: int, n_layers: int = 2,
               dropout: float = 0.1):
        import torch
        import torch.nn as nn

        class _MessagePassingLayer(nn.Module):
            def __init__(self, in_dim: int, out_dim: int):
                super().__init__()
                self.msg_proj = nn.Linear(in_dim, out_dim)
                self.self_proj = nn.Linear(in_dim, out_dim)
                self.act = nn.ReLU()

            def forward(self, x: "torch.Tensor", edge_index: "torch.Tensor",
                        edge_weight: "torch.Tensor") -> "torch.Tensor":
                # x: (N, in_dim); edge_index: (2, E); edge_weight: (E,)
                src, dst = edge_index[0], edge_index[1]
                messages = self.msg_proj(x[src]) * edge_weight.unsqueeze(-1)   # (E, out_dim)
                aggregated = torch.zeros(
                    x.size(0), messages.size(-1), device=x.device, dtype=messages.dtype
                )
                aggregated.index_add_(0, dst, messages)
                # normalize by in-degree so high-connectivity nodes (e.g.
                # confluence points) don't just get bigger-magnitude
                # embeddings purely from having more edges
                degree = torch.zeros(x.size(0), device=x.device, dtype=messages.dtype)
                degree.index_add_(0, dst, edge_weight)
                aggregated = aggregated / (degree.unsqueeze(-1) + 1e-6)
                return self.act(self.self_proj(x) + aggregated)

        class DrainageGNN(nn.Module):
            """Message-passing GNN over the drainage/river graph
            (Section 8). Input: per-node static+dynamic features (e.g.
            elevation, drainage density, current river_stage, recent
            rainfall). Output: one embed_dim vector per node, usable as an
            additional branch embedding in the fusion layer, or concatenated
            directly into FloodHead's input for flood-specific spatial
            connectivity (Section 8's explicit ask)."""

            def __init__(self):
                super().__init__()
                dims = [in_features] + [hidden] * (n_layers - 1) + [embed_dim]
                self.layers = nn.ModuleList([
                    _MessagePassingLayer(dims[i], dims[i + 1]) for i in range(len(dims) - 1)
                ])
                self.dropout = nn.Dropout(dropout)

            def forward(self, x: "torch.Tensor", edge_index: "torch.Tensor",
                        edge_weight: "torch.Tensor") -> "torch.Tensor":
                h = x
                for i, layer in enumerate(self.layers):
                    h = layer(h, edge_index, edge_weight)
                    if i < len(self.layers) - 1:
                        h = self.dropout(h)
                return h  # (N, embed_dim) — one embedding per grid cell

        return DrainageGNN()


def graph_to_tensors(graph: Dict[str, np.ndarray]):
    """Converts `build_drainage_graph`'s numpy output into the torch tensors
    `DrainageGNN.forward` expects. Kept separate from `build_drainage_graph`
    so the graph-construction logic (numpy/scipy only) stays testable
    without torch installed."""
    import torch

    edge_index = torch.tensor(graph["edge_index"], dtype=torch.long)
    edge_weight = torch.tensor(graph["edge_weight"], dtype=torch.float32)
    return edge_index, edge_weight
