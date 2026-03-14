import time
import requests
from config import MESHY_API_KEY, MESHY_POLL_INTERVAL, MESHY_POLL_TIMEOUT

_BASE_URL = "https://api.meshy.ai"


def image_to_3d(public_image_url: str) -> str | None:
    """
    Submit an image-to-3D task on Meshy.ai and poll until complete.

    Returns the GLB model URL on success, None on failure or timeout.

    NOTE: public_image_url must be publicly reachable (not localhost).
    For local development, set PUBLIC_BASE_URL to an ngrok tunnel URL.
    """
    if not MESHY_API_KEY:
        return None

    headers = {"Authorization": f"Bearer {MESHY_API_KEY}"}

    try:
        resp = requests.post(
            f"{_BASE_URL}/v1/image-to-3d",
            headers=headers,
            json={"image_url": public_image_url, "enable_pbr": False},
            timeout=30,
        )
        resp.raise_for_status()
        task_id = resp.json()["result"]
    except Exception:
        return None

    deadline = time.time() + MESHY_POLL_TIMEOUT
    while time.time() < deadline:
        time.sleep(MESHY_POLL_INTERVAL)
        try:
            status_resp = requests.get(
                f"{_BASE_URL}/v1/image-to-3d/{task_id}",
                headers=headers,
                timeout=30,
            )
            status_resp.raise_for_status()
            data = status_resp.json()
        except Exception:
            continue

        if data["status"] == "SUCCEEDED":
            return data["model_urls"]["glb"]
        if data["status"] in ("FAILED", "EXPIRED"):
            return None

    return None  # Timeout
