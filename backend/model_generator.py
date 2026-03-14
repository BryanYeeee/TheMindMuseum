"""Hunyuan3D-2.1 async client – image → GLB 3D model."""

from __future__ import annotations

import base64
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

HUNYUAN3D_API_URL = os.environ.get("HUNYUAN3D_API_URL", "").rstrip("/")

GENERATED_MODELS_DIR = os.path.join("static", "models")
os.makedirs(GENERATED_MODELS_DIR, exist_ok=True)

POLL_INTERVAL = 5  # seconds between status checks
POLL_TIMEOUT = 600  # max seconds to wait for a single model


def generate_model(image_bytes: bytes, artifact_id: str) -> str:
    """Submit an image to Hunyuan3D, poll until done, save .glb, return URL path.

    Parameters
    ----------
    image_bytes : bytes
        Raw PNG/JPEG image data.
    artifact_id : str
        Unique identifier used as the filename stem.

    Returns
    -------
    str
        The URL path (relative to server root) where the GLB can be downloaded,
        e.g. ``/models/abcd-1234.glb``.
    """

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

    # ---- submit async job ------------------------------------------------
    logger.info("Submitting model generation for artifact %s", artifact_id)
    resp = requests.post(f"{HUNYUAN3D_API_URL}/send", json=payload, timeout=30)
    resp.raise_for_status()
    uid = resp.json().get("uid")
    if not uid:
        raise RuntimeError("No uid returned from Hunyuan3D /send")
    logger.info("Hunyuan3D job uid=%s for artifact %s", uid, artifact_id)

    # ---- poll for completion ---------------------------------------------
    deadline = time.time() + POLL_TIMEOUT

    while time.time() < deadline:
        try:
            status_resp = requests.get(
                f"{HUNYUAN3D_API_URL}/status/{uid}", timeout=30
            )
            status_resp.raise_for_status()
            data = status_resp.json()
        except Exception as e:
            logger.warning("Status poll failed (uid=%s): %s", uid, e)
            time.sleep(POLL_INTERVAL)
            continue

        status = data.get("status", "unknown")
        logger.debug("uid=%s status=%s", uid, status)

        if status == "completed":
            model_b64 = data.get("model_base64", "")
            if not model_b64:
                raise RuntimeError("Completed response has no model_base64")

            model_bytes = base64.b64decode(model_b64)
            out_path = os.path.join(GENERATED_MODELS_DIR, f"{artifact_id}.glb")
            with open(out_path, "wb") as f:
                f.write(model_bytes)

            url = f"/models/{artifact_id}.glb"
            logger.info(
                "Model saved for artifact %s (%d bytes) → %s",
                artifact_id,
                len(model_bytes),
                url,
            )
            return url

        if status == "error":
            raise RuntimeError(f"Hunyuan3D generation error: {data}")

        time.sleep(POLL_INTERVAL)

    raise TimeoutError(f"Hunyuan3D generation timed out after {POLL_TIMEOUT}s")
