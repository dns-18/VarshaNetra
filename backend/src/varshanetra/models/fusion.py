"""
Fusion layer (Section 4): Cross-Attention + Feature Gating.

Learns, per example, how much to trust each modality (satellite, radar,
meteorology, NWP, static terrain) — e.g. radar should dominate during active
precipitation, satellite thermal evolution should dominate pre-convection,
NWP should dominate at long lead times, ground gauges provide local bias
correction. Rather than hard-coding those rules, the gate is a learned
function of all five branch embeddings plus an explicit lead-time embedding,
so the network can recover exactly this behavior (verifiable post-hoc via
the gate-weight outputs, which the explainability module surfaces).
"""
from __future__ import annotations

import torch
import torch.nn as nn


class CrossAttentionGatingFusion(nn.Module):
    def __init__(self, embed_dim: int, num_branches: int = 5, num_heads: int = 4,
                 dropout: float = 0.1, n_lead_times: int = 7):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_branches = num_branches

        self.cross_attn = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, batch_first=True
        )
        self.lead_time_embed = nn.Embedding(n_lead_times, embed_dim)

        # Gate: takes concatenated branch embeddings + lead-time embedding,
        # outputs one softmax weight per branch.
        self.gate_net = nn.Sequential(
            nn.Linear(embed_dim * (num_branches + 1), embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, num_branches),
        )
        self.norm = nn.LayerNorm(embed_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, branch_embeds: list[torch.Tensor], lead_time_idx: torch.Tensor):
        """
        branch_embeds: list of (B, embed_dim) tensors, one per branch, in a
            fixed order [satellite, radar, meteorology, nwp, static].
        lead_time_idx: (B,) long tensor indexing into rainfall_lead_hours.
        Returns: fused (B, embed_dim), gate_weights (B, num_branches) for
            interpretability (Section 15 — "which source drove this warning").
        """
        stacked = torch.stack(branch_embeds, dim=1)          # (B, n_branches, D)
        lead_embed = self.lead_time_embed(lead_time_idx)     # (B, D)

        # cross-attention: each branch attends to all branches (incl. itself),
        # conditioned implicitly through the lead-time-augmented query
        query = stacked + lead_embed.unsqueeze(1)
        attn_out, _ = self.cross_attn(query, stacked, stacked)
        attended = self.norm(stacked + self.dropout(attn_out))   # (B, n_branches, D)

        gate_input = torch.cat(
            [attended.reshape(attended.size(0), -1), lead_embed], dim=1
        )
        gate_logits = self.gate_net(gate_input)               # (B, n_branches)
        gate_weights = torch.softmax(gate_logits, dim=1)       # sums to 1 over branches

        fused = (attended * gate_weights.unsqueeze(-1)).sum(dim=1)  # (B, D)
        return fused, gate_weights
