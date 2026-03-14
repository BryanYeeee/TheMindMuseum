from pydantic import BaseModel


class ArtifactSpec(BaseModel):
    """A memory artifact designed by Gemini — lore encodes a key fact."""
    name: str
    lore: str
    fact: str
    visual_description: str
    position_index: int


class WorldDesign(BaseModel):
    """The world design returned by Gemini."""
    artifacts: list[ArtifactSpec]


class ArtifactResult(BaseModel):
    """Artifact sent to the client — includes model URL."""
    name: str
    lore: str
    fact: str
    model_url: str


class JobResult(BaseModel):
    """Final result sent to the client."""
    artifacts: list[ArtifactResult]
