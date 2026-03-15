from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ArtifactResult(BaseModel):
    """A single museum artifact with metadata and optional 3D model."""

    id: str
    name: str
    description: str
    visual_description: str
    model_url: Optional[str] = None
    status: str = "pending"  # pending | generating_image | generating_model | complete | error
    error: Optional[str] = None


class JobResult(BaseModel):
    """A design job containing multiple artifacts being generated."""

    job_id: str
    artifacts: list[ArtifactResult]
    status: str = "pending"  # pending | in_progress | complete


class PaintingResult(BaseModel):
    """A single museum painting with metadata and generated image."""

    id: str
    name: str
    description: str
    visual_description: str
    image_url: Optional[str] = None
    status: str = "pending"  # pending | generating_image | complete | error
    error: Optional[str] = None


class PaintingJobResult(BaseModel):
    """A painting job containing multiple paintings being generated."""

    job_id: str
    paintings: list[PaintingResult]
    status: str = "pending"  # pending | in_progress | complete
