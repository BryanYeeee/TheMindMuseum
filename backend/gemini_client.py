"""Gemini API client for artifact design and image generation."""

from __future__ import annotations

import json
import io
import logging
import os
import uuid

from PIL import Image as PILImage

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
    "with a clean white background. "
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
    "Generate a flat 2D artwork in LANDSCAPE orientation (wider than tall, "
    "approximately 14:9 aspect ratio). The image MUST fill "
    "the entire frame edge-to-edge with absolutely no border, margin, "
    "mat, wall, shadow, or any surrounding context visible. Do NOT render "
    "the artwork hanging on a wall or sitting on an easel — produce ONLY "
    "the artwork itself as if scanned from a canvas. "
    "The artwork: {description}"
)


def _trim_whitespace_borders(img: PILImage.Image, threshold: int = 240) -> PILImage.Image:
    """Remove near-white (or near-black) borders from an image.

    Scans inward from each edge and crops away rows/columns whose average
    brightness is above *threshold* (white border) or below 255-threshold
    (black border).  Returns the trimmed image, or the original if no
    significant border is found.
    """
    import numpy as np

    arr = np.array(img.convert("RGB"), dtype=np.float32)
    row_mean = arr.mean(axis=(1, 2))  # per-row average brightness
    col_mean = arr.mean(axis=(0, 2))  # per-col average brightness

    def _content_range(means, length):
        lo, hi = 0, length - 1
        while lo < length and (means[lo] > threshold or means[lo] < (255 - threshold)):
            lo += 1
        while hi > lo and (means[hi] > threshold or means[hi] < (255 - threshold)):
            hi -= 1
        return lo, hi

    top, bottom = _content_range(row_mean, len(row_mean))
    left, right = _content_range(col_mean, len(col_mean))

    # Only crop if we'd keep at least 85 % of each dimension (guard against
    # over-aggressive trimming on mostly-white artwork).
    h, w = arr.shape[:2]
    if (bottom - top + 1) < 0.85 * h or (right - left + 1) < 0.85 * w:
        return img

    return img.crop((left, top, right + 1, bottom + 1))


def _crop_to_14_9(image_bytes: bytes) -> bytes:
    """Trim whitespace borders then centre-crop to exactly 14:9."""
    img = PILImage.open(io.BytesIO(image_bytes))

    # Step 1: Remove any near-white / near-black borders the model produced
    img = _trim_whitespace_borders(img)

    # Step 2: Centre-crop to 14:9
    w, h = img.size
    target_ratio = 14 / 9
    current_ratio = w / h

    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_ratio < target_ratio:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


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
                aspect_ratio="16:9",
            ),
        )
        image_bytes: bytes = result.generated_images[0].image.image_bytes
        image_bytes = _crop_to_14_9(image_bytes)
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
            cropped = _crop_to_14_9(part.inline_data.data)
            logger.info(
                "Painting image generated via Gemini Flash (%d bytes, %s)",
                len(cropped),
                part.inline_data.mime_type,
            )
            return cropped

    raise RuntimeError("Neither Imagen 4 nor Gemini Flash produced a painting image")
