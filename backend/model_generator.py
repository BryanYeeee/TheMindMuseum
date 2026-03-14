"""
3D model generation pipeline:
  1. Gemini generates an image from the visual description
  2. Hunyuan3D-2.1 API converts the image into a .glb 3D model

Requires HUNYUAN3D_API_URL environment variable pointing to the
Hunyuan3D-2.1 API server (e.g. http://hunyuan3d:8081).
"""

import base64
import logging
import os
import time
import uuid

import requests

from gemini_client import generate_image

logger = logging.getLogger(__name__)

GENERATED_MODELS_DIR = os.path.join(os.path.dirname(__file__), "generated_models")
HUNYUAN3D_TIMEOUT = 300  # seconds — model generation can be slow
HUNYUAN3D_POLL_INTERVAL = 3  # seconds between status checks


def _get_hunyuan3d_url() -> str:
    """Get the Hunyuan3D API base URL from environment."""
    url = os.environ.get("HUNYUAN3D_API_URL", "http://localhost:8081")
    return url.rstrip("/")


def _generate_3d_sync(image_bytes: bytes) -> bytes:
    """
    Send an image to Hunyuan3D and get back a GLB model.
    Uses the async /send endpoint + polling /status for robustness.

    Args:
        image_bytes: Raw PNG image bytes.

    Returns:
        Raw GLB model bytes.
    """
    base_url = _get_hunyuan3d_url()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # Start async generation
    payload = {
        "image": image_b64,
        "texture": True,
        "seed": 1234,
        "type": "glb",
        "remove_background": True,
        "octree_resolution": 256,
        "num_inference_steps": 5,
        "guidance_scale": 5.0,
    }

    resp = requests.post(f"{base_url}/send", json=payload, timeout=30)
    resp.raise_for_status()
    uid = resp.json()["uid"]
    logger.info(f"Hunyuan3D task started: {uid}")

    # Poll for completion
    deadline = time.time() + HUNYUAN3D_TIMEOUT
    while time.time() < deadline:
        status_resp = requests.get(f"{base_url}/status/{uid}", timeout=15)
        status_resp.raise_for_status()
        status_data = status_resp.json()

        if status_data["status"] == "completed":
            model_b64 = status_data["model_base64"]
            return base64.b64decode(model_b64)

        if status_data["status"] == "error":
            raise RuntimeError(f"Hunyuan3D generation failed: {status_data.get('message', 'unknown error')}")

        logger.debug(f"Hunyuan3D status: {status_data['status']} — polling again in {HUNYUAN3D_POLL_INTERVAL}s")
        time.sleep(HUNYUAN3D_POLL_INTERVAL)

    raise RuntimeError(f"Hunyuan3D generation timed out after {HUNYUAN3D_TIMEOUT}s")


def _generate_3d_direct(image_bytes: bytes) -> bytes:
    """
    Send an image to Hunyuan3D using the synchronous /generate endpoint.
    Falls back to this if the async approach isn't needed.

    Args:
        image_bytes: Raw PNG image bytes.

    Returns:
        Raw GLB model bytes.
    """
    base_url = _get_hunyuan3d_url()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "image": image_b64,
        "texture": True,
        "seed": 1234,
        "type": "glb",
        "remove_background": True,
        "octree_resolution": 256,
        "num_inference_steps": 5,
        "guidance_scale": 5.0,
    }

    resp = requests.post(f"{base_url}/generate", json=payload, timeout=HUNYUAN3D_TIMEOUT)
    resp.raise_for_status()
    return resp.content


def generate_model(visual_description: str) -> str:
    """
    Generate a 3D model (.glb) for an artifact based on its visual description.

    Pipeline:
      1. Gemini generates an image from the visual_description
      2. Hunyuan3D-2.1 converts the image into a GLB mesh

    Args:
        visual_description: A text description of what the artifact looks like.

    Returns:
        The filename of the generated .glb file (relative to GENERATED_MODELS_DIR).
    """
    os.makedirs(GENERATED_MODELS_DIR, exist_ok=True)

    filename = f"artifact_{uuid.uuid4().hex[:12]}.glb"
    filepath = os.path.join(GENERATED_MODELS_DIR, filename)

    # Step 1: Generate image from text description
    logger.info(f"Generating image for: {visual_description[:80]}...")
    image_bytes = generate_image(visual_description)
    logger.info(f"Image generated ({len(image_bytes)} bytes)")

    # Step 2: Convert image to 3D model via Hunyuan3D
    logger.info("Sending image to Hunyuan3D for 3D generation...")
    try:
        glb_bytes = _generate_3d_sync(image_bytes)
    except (requests.ConnectionError, requests.Timeout) as e:
        logger.warning(f"Hunyuan3D async approach failed ({e}), trying direct endpoint...")
        glb_bytes = _generate_3d_direct(image_bytes)

    with open(filepath, "wb") as f:
        f.write(glb_bytes)

    logger.info(f"3D model saved: {filename} ({len(glb_bytes)} bytes)")
    return filename
