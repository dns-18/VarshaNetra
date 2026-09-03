"""
VarshaNetra full model (Sections 4, 5, 12).

Shared encoder ("Satellite + Radar + Weather + Wind + NWP" fused
representation) followed by separate prediction heads for rainfall and
flood tasks (multi-task learning, Section 5), with Monte-Carlo-dropout
uncertainty estimation available at inference time (Section 12).

Optionally (use_drainage_gnn=True) also fuses a Section 8 river/drainage
connectivity signal — see models/gnn.py — into the flood head, on top of
the five main branches.
"""
from __future__ import annotations

from typing import Dict

import torch
import torch.nn as nn

from varshanetra.models.encoders import (ConvLSTMSequenceEncoder,
                                          TabularTransformerEncoder,
                                          StaticMLPEncoder)
from varshanetra.models.fusion import CrossAttentionGatingFusion
from varshanetra.models.gnn import DrainageGNNEncoder


class RainfallHead(nn.Module):
    """Regression + classification + probability, per Model A of Section 1."""

    def __init__(self, embed_dim: int, n_categories: int, dropout: float = 0.1):
        super().__init__()
        self.trunk = nn.Sequential(
            nn.Linear(embed_dim, embed_dim), nn.ReLU(), nn.Dropout(dropout)
        )
        self.regression_head = nn.Linear(embed_dim, 1)          # rainfall mm
        self.classification_head = nn.Linear(embed_dim, n_categories)  # category logits
        self.heavy_prob_head = nn.Linear(embed_dim, 1)          # heavy-rain probability logit

    def forward(self, x):
        h = self.trunk(x)
        return {
            "rain_mm": torch.relu(self.regression_head(h)).squeeze(-1),
            "rain_class_logits": self.classification_head(h),
            "heavy_rain_prob_logits": self.heavy_prob_head(h).squeeze(-1),
        }


class FloodHead(nn.Module):
    """Flood probability + inundation depth + (optional) spatial extent
    segmentation logits, per Model B of Section 1."""

    def __init__(self, embed_dim: int, dropout: float = 0.1, seg_output_size: int | None = None):
        super().__init__()
        self.trunk = nn.Sequential(
            nn.Linear(embed_dim, embed_dim), nn.ReLU(), nn.Dropout(dropout)
        )
        self.flood_prob_head = nn.Linear(embed_dim, 1)
        self.depth_head = nn.Linear(embed_dim, 1)
        self.seg_output_size = seg_output_size
        if seg_output_size:
            self.seg_head = nn.Linear(embed_dim, seg_output_size)

    def forward(self, x):
        h = self.trunk(x)
        out = {
            "flood_prob_logits": self.flood_prob_head(h).squeeze(-1),
            "depth_m": torch.relu(self.depth_head(h)).squeeze(-1),
        }
        if self.seg_output_size:
            out["seg_logits"] = self.seg_head(h)
        return out


class VarshaNetraModel(nn.Module):
    def __init__(self, model_cfg: Dict, n_rain_categories: int = 6,
                 n_lead_times: int = 7, mc_dropout: bool = True,
                 use_drainage_gnn: bool = False, gnn_in_features: int = 4):
        super().__init__()
        d = model_cfg["embed_dim"]
        enc = model_cfg["encoders"]

        self.satellite_encoder = ConvLSTMSequenceEncoder(
            enc["satellite"]["in_channels"], enc["satellite"]["hidden_channels"], d
        )
        self.radar_encoder = ConvLSTMSequenceEncoder(
            enc["radar"]["in_channels"], enc["radar"]["hidden_channels"], d
        )
        self.meteorology_encoder = TabularTransformerEncoder(
            enc["meteorology"]["in_features"], enc["meteorology"]["hidden"],
            enc["meteorology"]["n_layers"], enc["meteorology"]["n_heads"], d,
        )
        self.nwp_encoder = TabularTransformerEncoder(
            enc["nwp"]["in_features"], enc["nwp"]["hidden"],
            enc["nwp"]["n_layers"], enc["nwp"]["n_heads"], d,
        )
        self.static_encoder = StaticMLPEncoder(
            enc["static"]["in_features"], enc["static"]["hidden"], d
        )

        self.fusion = CrossAttentionGatingFusion(
            d, num_branches=5, num_heads=model_cfg["fusion"]["num_heads"],
            dropout=model_cfg["fusion"]["dropout"], n_lead_times=n_lead_times,
        )

        self.shared_trunk = nn.Sequential(
            nn.Linear(d, d), nn.ReLU(),
            nn.Dropout(model_cfg["fusion"]["dropout"]),
        )

        # Rainfall predictions also feed the flood model (Section 1: "The
        # rainfall model should provide precipitation forecasts/features to
        # the flood model") — concatenate rainfall head outputs into the
        # flood head's input.
        self.rainfall_head = RainfallHead(d, n_rain_categories)
        flood_in_dim = d + 3  # +rain_mm, heavy_prob, top-1 category score

        # Section 8: explicit river/drainage connectivity for flood
        # prediction via a GNN branch (models/gnn.py). Optional — disabled
        # unless the caller passes use_drainage_gnn=True AND supplies
        # `graph_edge_index`/`graph_edge_weight`/`graph_node_features` in the
        # batch at forward() time, since it needs a precomputed drainage
        # graph (see gnn.py::build_drainage_graph) which most callers won't
        # have wired up yet on the MVP's synthetic/tabular data.
        self.use_drainage_gnn = use_drainage_gnn
        if use_drainage_gnn:
            self.drainage_gnn = DrainageGNNEncoder.build(
                in_features=gnn_in_features, hidden=d, embed_dim=d,
            )
            flood_in_dim += d

        self.flood_input_proj = nn.Linear(flood_in_dim, d)
        self.flood_head = FloodHead(d)

        self.mc_dropout = mc_dropout

    def encode(self, batch: Dict[str, torch.Tensor], lead_time_idx: torch.Tensor):
        sat = self.satellite_encoder(batch["satellite_seq"])
        radar = self.radar_encoder(batch["radar_seq"])
        met = self.meteorology_encoder(batch["meteorology_seq"])
        nwp = self.nwp_encoder(batch["nwp_seq"])
        static = self.static_encoder(batch["static_feat"])

        fused, gate_weights = self.fusion([sat, radar, met, nwp, static], lead_time_idx)
        shared = self.shared_trunk(fused)
        return shared, gate_weights

    def forward(self, batch: Dict[str, torch.Tensor], lead_time_idx: torch.Tensor):
        shared, gate_weights = self.encode(batch, lead_time_idx)

        rain_out = self.rainfall_head(shared)
        rain_class_score = torch.softmax(rain_out["rain_class_logits"], dim=-1).max(dim=-1).values
        flood_in_parts = [
            shared,
            rain_out["rain_mm"].unsqueeze(-1),
            torch.sigmoid(rain_out["heavy_rain_prob_logits"]).unsqueeze(-1),
            rain_class_score.unsqueeze(-1),
        ]

        if self.use_drainage_gnn:
            # batch must additionally supply the precomputed drainage graph
            # (see models/gnn.py::build_drainage_graph + graph_to_tensors)
            # and, for each sample in the batch, an index into that graph's
            # node ordering identifying which grid cell it corresponds to.
            node_embeds = self.drainage_gnn(
                batch["graph_node_features"], batch["graph_edge_index"], batch["graph_edge_weight"]
            )  # (n_graph_nodes, d)
            sample_node_embeds = node_embeds[batch["graph_node_idx"]]  # (B, d)
            flood_in_parts.append(sample_node_embeds)

        flood_in = torch.cat(flood_in_parts, dim=-1)
        flood_in = self.flood_input_proj(flood_in)
        flood_out = self.flood_head(flood_in)

        preds = {**rain_out, **flood_out, "gate_weights": gate_weights}
        return preds

    @torch.no_grad()
    def predict_with_uncertainty(self, batch, lead_time_idx, n_passes: int = 20):
        """Monte-Carlo dropout uncertainty (Section 12). Keeps dropout layers
        active across `n_passes` stochastic forward passes and reports the
        mean and std of each continuous output — the std is reported as the
        model's `uncertainty` field in the API output schema."""
        was_training = self.training
        self.train()  # enable dropout
        for m in self.modules():
            if isinstance(m, nn.MultiheadAttention):
                m.eval()  # keep attention deterministic; only MLP/dropout stochastic

        rain_samples, depth_samples, flood_prob_samples = [], [], []
        for _ in range(n_passes):
            out = self.forward(batch, lead_time_idx)
            rain_samples.append(out["rain_mm"].unsqueeze(0))
            depth_samples.append(out["depth_m"].unsqueeze(0))
            flood_prob_samples.append(torch.sigmoid(out["flood_prob_logits"]).unsqueeze(0))

        self.train(was_training)

        rain_stack = torch.cat(rain_samples, dim=0)
        depth_stack = torch.cat(depth_samples, dim=0)
        flood_stack = torch.cat(flood_prob_samples, dim=0)

        return {
            "rain_mm_mean": rain_stack.mean(0), "rain_mm_std": rain_stack.std(0),
            "depth_m_mean": depth_stack.mean(0), "depth_m_std": depth_stack.std(0),
            "flood_prob_mean": flood_stack.mean(0), "flood_prob_std": flood_stack.std(0),
        }
