from pydantic import BaseModel, field_validator
from typing import Optional


class AssetPlacement(BaseModel):
    """An assignment of a world-building asset to a placement slot."""
    asset_id: str
    slot_id: str


class ArtifactSpec(BaseModel):
    """A memory artifact designed by Gemini — lore encodes a key fact."""
    name: str
    lore: str
    fact: str
    visual_description: str
    slot_id: str


class WorldDesign(BaseModel):
    """The full world design returned by Gemini."""
    summary: str
    theme: str
    asset_placements: list[AssetPlacement]
    artifacts: list[ArtifactSpec]


# --- Resolved models (with positions filled in from slot catalog) ---

class ResolvedAsset(BaseModel):
    """Asset placement with coordinates resolved from the slot catalog."""
    asset_id: str
    slot_id: str
    position: list[float]
    rotation: list[float]
    scale: list[float]


class ResolvedArtifact(BaseModel):
    """Artifact with lore, model URL, and resolved position."""
    name: str
    lore: str
    fact: str
    model_url: str
    slot_id: str
    position: list[float]
    rotation: list[float]


class JobResult(BaseModel):
    """Final result sent to the client."""
    summary: str
    theme: str
    world: list[ResolvedAsset]
    artifacts: list[ResolvedArtifact]
