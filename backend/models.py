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
