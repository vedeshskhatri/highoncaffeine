"""Vectorized multi-design array packing for batch simulation.

Owner: Vedesh
Packs N heterogeneous shelter designs into fixed-width 2D arrays of shape (MAX_NODES, N).
Inactive nodes are masked with active=False, C=inf, K=0 to guarantee zero thermal leakage.
"""

from typing import Any, List, Sequence
from engine.types import Design, NodeArray


def pack(designs: Sequence[Design], max_nodes: int = 256) -> NodeArray:
    """Pack N design specifications into a single vectorized NodeArray structure.

    Args:
        designs: Sequence of N shelter designs
        max_nodes: Fixed row dimension of network matrix

    Returns:
        NodeArray containing padded C, K, T arrays and active mask

    Raises:
        NotImplementedError: Until implemented in Phase V5
    """
    raise NotImplementedError("PHASE V5 — not yet implemented")


def unpack(packed_results: Any) -> List[Any]:
    """Unpack batch simulation results into individual design performance records.

    Args:
        packed_results: Output array from batch solver

    Returns:
        List of per-design performance objects

    Raises:
        NotImplementedError: Until implemented in Phase V5
    """
    raise NotImplementedError("PHASE V5 — not yet implemented")
