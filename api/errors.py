"""
Custom exception hierarchy for THERMA.
Per brain/09_ERROR_HANDLING.md.
"""


class ThermaError(Exception):
    """Base exception for all THERMA application errors."""
    pass


class UnsourcedMaterialError(ThermaError):
    """Raised when a material property row lacks an authoritative cited source."""
    pass


class UnknownMaterialError(ThermaError):
    """Raised when an unknown material identifier is requested."""
    pass


class SolverDivergedError(ThermaError):
    """Raised when the numerical solver diverges (NaN, Inf, or |T| > 500 K)."""
    pass


class WeatherUnavailableError(ThermaError):
    """Raised when weather data is unreachable and no cache or fallback is available."""
    pass


class ContractViolationError(ThermaError):
    """Raised when internal data violates brain/07_API_CONTRACT.md."""
    pass
