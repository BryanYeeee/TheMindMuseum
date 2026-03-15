"""Gemini API client for artifact design and image generation."""

from __future__ import annotations

import json
import logging
import os
import uuid

from google import genai
from google.genai import types

from models import ArtifactResult, PaintingResult

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# Text generation – artifact descriptions
# ---------------------------------------------------------------------------

DESIGN_PROMPT = """\
You are a museum curator designing an exhibit. Based on the following text content,
create exactly {num_artifacts} museum artifacts. Each artifact must be a three-
dimensional physical object that looks impressive when displayed on a museum podium.

IMPORTANT constraints – every artifact MUST:
- Be a solid, 3-dimensional object with clear volume and depth (NO flat items such
  as scrolls, maps, coins, medallions, pages, tablets, plaques, cards, or paintings).
- Be an appropriate size for a podium display – roughly 15 cm to 80 cm in its
  largest dimension. Nothing tiny (e.g. a ring or pin) and nothing enormous (e.g. a
  full suit of armour or a vehicle).
- Have visual interest from multiple angles (sculptures, statuettes, ornate vessels,
  mechanised devices, globes, helmets, decorated boxes, figurines, etc.).

For each artifact provide the following fields:
1. "name"  – A concise, evocative name for the artifact.
2. "description" – A 2-3 sentence description of the artifact and its historical or
   cultural significance.
3. "visual_description" – A richly detailed visual description of the artifact
   suitable for generating a reference image. Include details about shape, colour,
   material, texture, approximate size, and any decorative elements. Emphasise the
   three-dimensional form and how it would look sitting on a podium. Describe a
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
# Text generation – painting descriptions
# ---------------------------------------------------------------------------

PAINTING_DESIGN_PROMPT = """\
You are a museum curator designing a painting exhibit. Based on the following text
content, create exactly {num_paintings} paintings that could hang in a museum and
relate to the content.

For each painting provide the following fields:
1. "name"  – A concise, evocative title for the painting.
2. "description" – A 2-3 sentence description of the painting and its artistic or
   cultural significance.
3. "visual_description" – A richly detailed visual description of the painting's
   content suitable for generating the artwork. Include details about style (e.g.
   oil on canvas, watercolour, impressionist, etc.), colour palette, composition,
   subject matter, lighting, mood, and any notable artistic techniques.
   IMPORTANT: Describe ONLY the artwork itself – the scene, subjects, and artistic
   style. Do NOT mention a frame, wall, gallery, museum setting, or any
   surrounding context. The image will be placed into a frame later.

Return ONLY a JSON array of objects with these three fields. No markdown fences.

Text content:
{text}
"""


def design_paintings(text: str, num_paintings: int) -> list[PaintingResult]:
    """Ask Gemini to invent *num_paintings* museum paintings from *text*."""

    prompt = PAINTING_DESIGN_PROMPT.format(num_paintings=num_paintings, text=text)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    paintings_data: list[dict] = json.loads(response.text)

    paintings: list[PaintingResult] = []
    for item in paintings_data:
        paintings.append(
            PaintingResult(
                id=str(uuid.uuid4()),
                name=item["name"],
                description=item["description"],
                visual_description=item["visual_description"],
            )
        )

    return paintings


# ---------------------------------------------------------------------------
# Image generation – visual descriptions → PNG bytes
# ---------------------------------------------------------------------------

IMAGE_PROMPT = (
    "Generate a photorealistic image of a three-dimensional museum artifact "
    "sitting on a small display podium against a clean white background. "
    "The object should have clear volume and depth, viewed at a slight "
    "three-quarter angle to showcase its 3D form. The artifact: {description}"
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


# ---------------------------------------------------------------------------
# Image generation – painting descriptions → PNG bytes
# ---------------------------------------------------------------------------

PAINTING_IMAGE_PROMPT = (
    "Generate a flat 2D image artwork viewed straight-on. The artwork MUST fill "
    "the entire image edge-to-edge with absolutely no border, margin, frame, "
    "mat, wall, shadow, or any surrounding context visible. Do NOT render "
    "the artwork hanging on a wall or sitting on an easel — produce ONLY "
    "the artwork itself"
    "The artwork: {description}"
)


def generate_painting_image(visual_description: str) -> bytes:
    """Generate a PNG image of a painting from a visual description."""

    prompt = PAINTING_IMAGE_PROMPT.format(description=visual_description)

    try:
        result = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png",
            ),
        )
        image_bytes: bytes = result.generated_images[0].image.image_bytes
        logger.info("Painting image generated via Imagen 4 (%d bytes)", len(image_bytes))
        return image_bytes

    except Exception as imagen_err:
        logger.warning("Imagen 4 failed (%s), falling back to Gemini Flash image gen", imagen_err)

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
                "Painting image generated via Gemini Flash (%d bytes, %s)",
                len(part.inline_data.data),
                part.inline_data.mime_type,
            )
            return part.inline_data.data

    raise RuntimeError("Neither Imagen 4 nor Gemini Flash produced a painting image")
