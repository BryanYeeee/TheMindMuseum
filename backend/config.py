import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MESHY_API_KEY = os.environ.get("MESHY_API_KEY")

# Must be set to a public URL (e.g. ngrok) for Meshy to fetch images.
# Without it, 3D generation is skipped and model_url will be null.
# Example: https://abc123.ngrok-free.app
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5000")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static", "images")

LLM_MIN_CONCEPTS = 4
LLM_MAX_CONCEPTS = 6

MESHY_POLL_INTERVAL = 5   # seconds between polls
MESHY_POLL_TIMEOUT = 300  # seconds before giving up
