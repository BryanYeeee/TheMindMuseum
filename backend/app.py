import io
import json
import os
import threading
import time
import uuid
from rag_agent.rag import rag
from quiz.quiz import quiz
from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
from PyPDF2 import PdfReader

from models import ArtifactResult, JobResult
from gemini_client import design_world, generate_artifact_image
from model_generator import generate_model, GENERATED_MODELS_DIR

app = Flask(__name__, static_folder="static")
app.register_blueprint(rag, url_prefix="/agent")
app.register_blueprint(quiz, url_prefix="/quiz")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit
CORS(app)

MAX_TEXT_CHARS = 500_000  # ~125K tokens — safe margin for Gemini context window

# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------
jobs: dict[str, JobResult] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_text(req) -> str:
    """Extract text from the request – either a ``text`` field or a PDF upload."""
    if "file" in req.files:
        file = req.files["file"]
        if file.filename and file.filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file.read()))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            return text[:MAX_TEXT_CHARS]

    # Fall back to plaintext field (form-data or JSON body)
    text = req.form.get("text") or (req.get_json(silent=True) or {}).get("text", "")
    return text[:MAX_TEXT_CHARS]


def _get_num_artifacts(req) -> int:
    val = req.form.get("num_artifacts") or (req.get_json(silent=True) or {}).get("num_artifacts")
    if not val:
        raise ValueError("num_artifacts is required")
    return int(val)


def _process_job(job_id: str):
    """Background thread: generate an image then a 3D model for every artifact."""
    job = jobs.get(job_id)
    if not job:
        return

    job.status = "in_progress"

    for artifact in job.artifacts:
        try:
            artifact.status = "generating_image"
            image_bytes = generate_artifact_image(artifact.visual_description)

            artifact.status = "generating_model"
            model_url = generate_model(image_bytes, artifact.id)

            artifact.model_url = model_url
            artifact.status = "complete"
        except Exception as exc:
            artifact.status = "error"
            artifact.error = str(exc)

    job.status = "complete"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/design", methods=["POST"])
def design():
    """Accept text/PDF + num_artifacts, return artifact list, kick off 3D gen."""
    try:
        num_artifacts = _get_num_artifacts(request)
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400

    text = _extract_text(request)
    if not text.strip():
        return jsonify({"error": "No text content provided. Send a 'text' field or upload a PDF."}), 400

    try:
        artifacts = design_world(text, num_artifacts)
    except Exception as exc:
        return jsonify({"error": f"Failed to generate artifacts: {exc}"}), 500

    job_id = str(uuid.uuid4())
    job = JobResult(job_id=job_id, artifacts=artifacts, status="pending")
    jobs[job_id] = job

    # Kick off background image → 3-D pipeline
    threading.Thread(target=_process_job, args=(job_id,), daemon=True).start()

    return jsonify(job.model_dump())


@app.route("/design/stream/<job_id>")
def design_stream(job_id):
    """SSE endpoint – pushes ``artifact_update`` events as models finish."""
    if job_id not in jobs:
        return jsonify({"error": "Job not found"}), 404

    def event_stream():
        job = jobs[job_id]
        # Track last-seen status so we only emit on change
        last_statuses: dict[str, str] = {a.id: a.status for a in job.artifacts}

        while True:
            for artifact in job.artifacts:
                if artifact.status != last_statuses.get(artifact.id):
                    last_statuses[artifact.id] = artifact.status
                    payload = {
                        "id": artifact.id,
                        "name": artifact.name,
                        "status": artifact.status,
                        "model_url": artifact.model_url,
                        "error": artifact.error,
                    }
                    yield f"event: artifact_update\ndata: {json.dumps(payload)}\n\n"

            if job.status == "complete":
                yield f"event: job_complete\ndata: {json.dumps({'job_id': job_id})}\n\n"
                break

            time.sleep(1)

    return Response(event_stream(), content_type="text/event-stream")


@app.route("/models/<path:filename>")
def serve_model(filename):
    """Serve generated .glb files from the models directory."""
    return send_from_directory(GENERATED_MODELS_DIR, filename)


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum upload size is 16 MB."}), 413


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
