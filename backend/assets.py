"""
Position and artifact configuration.

There are 14 positions (indices 0–13). The client maps these to
3D coordinates on its side. Lower indices = more important facts.
"""

NUM_POSITIONS = 14


def validate_position_index(index: int) -> bool:
    return 0 <= index < NUM_POSITIONS
