"""
Branch encoders (Section 4 of the build spec).

Branch A — Satellite Thermal Encoder      : ConvLSTM over IR/thermal frames
Branch B — Radar Encoder                  : ConvLSTM over reflectivity frames
Branch C — Meteorological Feature Encoder : Transformer over tabular ground obs
Branch D — NWP Encoder                    : Transformer over NWP forecast sequence
Branch E — Static Terrain Encoder         : MLP over DEM/LULC/soil/drainage

Each branch outputs a single `embed_dim`-sized vector per (grid_cell, time)
so the fusion layer (models/fusion.py) can attend across modalities.

NOTE ON SPATIAL SHAPE: the MVP treats each grid cell's k-nearest-neighbour
patch as a small "image" (see features/thermo_wind.py neighbor_idx) rather
than assuming a full regular raster is always available — this keeps the
encoder usable both for gridded rasters (reshape neighbors into a patch) and
for point/station data with irregular spacing (Section 8 notes GNNs as the
right tool for river/drainage connectivity; graph_layers.py below is the
extension point for that).
"""
from __future__ import annotations

import torch
import torch.nn as nn


class ConvLSTMCell(nn.Module):
    """Standard single-layer ConvLSTM cell (Shi et al., 2015)."""

    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super().__init__()
        padding = kernel_size // 2
        self.hidden_channels = hidden_channels
        self.conv = nn.Conv2d(
            in_channels + hidden_channels, 4 * hidden_channels,
            kernel_size=kernel_size, padding=padding,
        )

    def forward(self, x, state):
        h, c = state
        combined = torch.cat([x, h], dim=1)
        gates = self.conv(combined)
        i, f, o, g = torch.chunk(gates, 4, dim=1)
        i, f, o = torch.sigmoid(i), torch.sigmoid(f), torch.sigmoid(o)
        g = torch.tanh(g)
        c_next = f * c + i * g
        h_next = o * torch.tanh(c_next)
        return h_next, c_next

    def init_state(self, batch_size, height, width, device):
        shape = (batch_size, self.hidden_channels, height, width)
        return torch.zeros(*shape, device=device), torch.zeros(*shape, device=device)


class ConvLSTMEncoder(nn.Module):
    """Encodes a sequence of small spatial patches
    (B, T, C, H, W) -> (B, embed_dim). Used for both the satellite thermal
    branch and the radar branch — same architecture, different weights and
    input channel counts, matching Section 4's recommendation."""

    def __init__(self, in_channels: int, hidden_channels: int, embed_dim: int,
                 patch_size: int = 3):
        super().__init__()
        self.cell = ConvLSTMCell(in_channels, hidden_channels)
        self.patch_size = patch_size
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.proj = nn.Linear(hidden_channels, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, C, H, W)
        b, t, c, h, w = x.shape
        state = self.cell.init_state(b, h, w, x.device)
        for step in range(t):
            state = self.cell(x[:, step], state)
        h_final, _ = state
        pooled = self.pool(h_final).flatten(1)   # (B, hidden_channels)
        return self.proj(pooled)                 # (B, embed_dim)


class ConvLSTMSequenceEncoder(nn.Module):
    """Convenience wrapper for the common case where each 'pixel' is just a
    flat feature vector per grid cell (no true raster available in the MVP
    synthetic dataset). Reshapes (B, T, F) -> (B, T, F, 1, 1) so the same
    ConvLSTM machinery works uniformly; swap in true (H, W) patches once
    raster-aligned satellite/radar tiles are available in production."""

    def __init__(self, in_features: int, hidden_channels: int, embed_dim: int):
        super().__init__()
        self.encoder = ConvLSTMEncoder(in_features, hidden_channels, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, t, f = x.shape
        x = x.view(b, t, f, 1, 1)
        return self.encoder(x)


class TabularTransformerEncoder(nn.Module):
    """Branch C / D: a small Transformer over a short causal history window
    of tabular features (meteorology or NWP), producing one embedding per
    (grid_cell, time)."""

    def __init__(self, in_features: int, hidden: int, n_layers: int, n_heads: int,
                 embed_dim: int, dropout: float = 0.1, max_len: int = 32):
        super().__init__()
        self.input_proj = nn.Linear(in_features, hidden)
        self.pos_embed = nn.Parameter(torch.randn(1, max_len, hidden) * 0.02)
        layer = nn.TransformerEncoderLayer(
            d_model=hidden, nhead=n_heads, dim_feedforward=hidden * 4,
            dropout=dropout, batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(layer, num_layers=n_layers)
        self.out_proj = nn.Linear(hidden, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, F) — causal window, most recent step last
        b, t, _ = x.shape
        h = self.input_proj(x) + self.pos_embed[:, :t, :]
        # causal mask: step i can't attend to steps > i
        mask = torch.triu(torch.ones(t, t, device=x.device) * float("-inf"), diagonal=1)
        h = self.transformer(h, mask=mask)
        return self.out_proj(h[:, -1, :])   # embedding at the most recent step


class StaticMLPEncoder(nn.Module):
    """Branch E: static terrain features (DEM, slope, LULC one-hot, soil,
    drainage density, distance-to-river, historical flood frequency)."""

    def __init__(self, in_features: int, hidden: int, embed_dim: int, dropout: float = 0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, embed_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
