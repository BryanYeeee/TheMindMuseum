"""Gemini API client for artifact design and image generation."""

from __future__ import annotations

import json
import logging
import os
import uuid

from google import genai
from google.genai import types

from models import ArtifactResult

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# Text generation – artifact descriptions
# ---------------------------------------------------------------------------

DESIGN_PROMPT = """\
You are a museum curator designing an exhibit. Based on the following text content,
create exactly {num_artifacts} museum artifacts. Each artifact should be a physical
object that could be displayed in a museum and relates to the content.

For each artifact provide the following fields:
1. "name"  – A concise, evocative name for the artifact.
2. "description" – A 2-3 sentence description of the artifact and its historical or
   cultural significance.
3. "visual_description" – A richly detailed visual description of the artifact
   suitable for generating a reference image. Include details about shape, colour,
   material, texture, approximate size, and any decorative elements. Describe a
   single standalone physical object against a neutral background.

Return ONLY a JSON array of objects with these three fields. No markdown fences.

Text content:
{text}
"""


def design_world(text: str, num_artifacts: int) -> list[ArtifactResult]:
    """Ask Gemini to invent *num_artifacts* museum pieces from *text*."""

    prompt = DESIGN_PROMPT.format(num_artifacts=num_artifacts, text=text)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    artifacts_data: list[dict] = json.loads(response.text)

    artifacts: list[ArtifactResult] = []
    for item in artifacts_data:
        artifacts.append(
            ArtifactResult(
                id=str(uuid.uuid4()),
                name=item["name"],
                description=item["description"],
                visual_description=item["visual_description"],
            )
        )

    return artifacts


# ---------------------------------------------------------------------------
# Image generation – visual descriptions → PNG bytes
# ---------------------------------------------------------------------------

IMAGE_PROMPT = (
    "Generate a photorealistic image of a museum artifact on a clean white "
    "background. The artifact: {description}"
)


def generate_artifact_image(visual_description: str) -> bytes:
    """Generate a PNG image from a visual description using Imagen 3."""

    prompt = IMAGE_PROMPT.format(description=visual_description)

    try:
        # Primary: Imagen 4.0 via the google-genai SDK
        result = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png",
            ),
        )
        image_bytes: bytes = result.generated_images[0].image.image_bytes
        logger.info("Image generated via Imagen 4 (%d bytes)", len(image_bytes))
        return image_bytes

    except Exception as imagen_err:
        logger.warning("Imagen 4 failed (%s), falling back to Gemini Flash image gen", imagen_err)

    # Fallback: Gemini 2.5 Flash with native image generation
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            logger.info(
                "Image generated via Gemini Flash (%d bytes, %s)",
                len(part.inline_data.data),
                part.inline_data.mime_type,
            )
            return part.inline_data.data

    raise RuntimeError("Neither Imagen 3 nor Gemini Flash produced an image")
