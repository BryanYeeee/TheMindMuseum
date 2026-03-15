import io
import json
import os
import threading
import time
import uuid
from rag_agent.rag import rag, ingest_local_file as rag_ingest_file
from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
from PyPDF2 import PdfReader

from models import ArtifactResult, JobResult, PaintingResult, PaintingJobResult
from gemini_client import design_world, generate_artifact_image, design_paintings, generate_painting_image
from model_generator import generate_model, GENERATED_MODELS_DIR
from quiz.quiz import quiz

GENERATED_PAINTINGS_DIR = os.path.join("static", "paintings")
os.makedirs(GENERATED_PAINTINGS_DIR, exist_ok=True)

UPLOADS_DIR = os.path.join("static", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# 🔴 DEBUG ONLY — DELETE AFTER TESTING
DEBUG_LOG_FILE = os.path.join("static", "debug_artifacts.log")
_debug_log_lock = threading.Lock()

app = Flask(__name__, static_folder="static")
app.register_blueprint(rag, url_prefix="/agent")
app.register_blueprint(quiz, url_prefix="/quiz")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit
CORS(app)

MAX_TEXT_CHARS = 500_000  # ~125K tokens — safe margin for Gemini context window

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------
jobs: dict[str, JobResult] = {}
painting_jobs: dict[str, PaintingJobResult] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_text(req) -> str:
    """Extract text via pdf_key, inline text, or legacy file upload."""
    body = req.get_json(silent=True) or {}

    # 1. Look up previously-uploaded PDF by key (read from disk)
    pdf_key = req.form.get("pdf_key") or body.get("pdf_key", "")
    if pdf_key:
        pdf_path = os.path.join(UPLOADS_DIR, f"{pdf_key}.pdf")
        if not os.path.isfile(pdf_path):
            return ""  # invalid key
        reader = PdfReader(pdf_path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text[:MAX_TEXT_CHARS]

    # 2. Legacy: inline file upload
    if "file" in req.files:
        file = req.files["file"]
        if file.filename and file.filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file.read()))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            return text[:MAX_TEXT_CHARS]

    # 3. Fall back to plaintext field
    text = req.form.get("text") or body.get("text", "")
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


def _process_painting_job(job_id: str):
    """Background thread: generate an image for every painting."""
    job = painting_jobs.get(job_id)
    if not job:
        return

    job.status = "in_progress"

    for painting in job.paintings:
        try:
            painting.status = "generating_image"
            image_bytes = generate_painting_image(painting.visual_description)

            out_path = os.path.join(GENERATED_PAINTINGS_DIR, f"{painting.id}.png")
            with open(out_path, "wb") as f:
                f.write(image_bytes)

            painting.image_url = f"/paintings/{painting.id}.png"
            painting.status = "complete"
        except Exception as exc:
            painting.status = "error"
            painting.error = str(exc)

    job.status = "complete"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/upload", methods=["POST"])
def upload_pdf():
    """Upload a PDF, extract & store its text, return a ``pdf_key``."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted."}), 400

    raw = file.read()
    reader = PdfReader(io.BytesIO(raw))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    text = text[:MAX_TEXT_CHARS]

    if not text.strip():
        return jsonify({"error": "Could not extract any text from the PDF."}), 400

    pdf_key = str(uuid.uuid4())

    # Persist PDF to disk
    out_path = os.path.join(UPLOADS_DIR, f"{pdf_key}.pdf")
    with open(out_path, "wb") as f:
        f.write(raw)

    # Auto-ingest into RAG vector store so quiz & agent are ready
    try:
        rag_ingest_file(out_path)
    except Exception as exc:
        # Non-fatal: the PDF is saved, RAG just won't have it yet
        import logging
        logging.getLogger(__name__).warning("Auto-ingest failed: %s", exc)

    return jsonify({"pdf_key": pdf_key, "char_count": len(text)})


@app.route("/artifacts/design", methods=["POST"])
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


@app.route("/artifacts/stream/<job_id>")
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

    return Response(event_stream(), content_type="text/event-stream",
                    headers={"Cache-Control": "no-cache",
                             "Access-Control-Allow-Origin": "*"})


@app.route("/models/<path:filename>")
def serve_model(filename):
    """Serve generated .glb files from the models directory."""
    return send_from_directory(GENERATED_MODELS_DIR, filename)


# ---------------------------------------------------------------------------
# Painting routes
# ---------------------------------------------------------------------------

@app.route("/paintings/design", methods=["POST"])
def paintings_design():
    """Accept text/PDF + num_paintings, return painting list, kick off image gen."""
    try:
        val = request.form.get("num_paintings") or (request.get_json(silent=True) or {}).get("num_paintings")
        if not val:
            raise ValueError("num_paintings is required")
        num_paintings = int(val)
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400

    text = _extract_text(request)
    if not text.strip():
        return jsonify({"error": "No text content provided. Send a 'text' field or upload a PDF."}), 400

    try:
        paintings = design_paintings(text, num_paintings)
    except Exception as exc:
        return jsonify({"error": f"Failed to generate paintings: {exc}"}), 500

    job_id = str(uuid.uuid4())
    job = PaintingJobResult(job_id=job_id, paintings=paintings, status="pending")
    painting_jobs[job_id] = job

    threading.Thread(target=_process_painting_job, args=(job_id,), daemon=True).start()

    return jsonify(job.model_dump())


@app.route("/paintings/stream/<job_id>")
def paintings_stream(job_id):
    """SSE endpoint – pushes ``painting_update`` events as images finish."""
    if job_id not in painting_jobs:
        return jsonify({"error": "Job not found"}), 404

    def event_stream():
        job = painting_jobs[job_id]
        last_statuses: dict[str, str] = {p.id: p.status for p in job.paintings}

        while True:
            for painting in job.paintings:
                if painting.status != last_statuses.get(painting.id):
                    last_statuses[painting.id] = painting.status
                    payload = {
                        "id": painting.id,
                        "name": painting.name,
                        "status": painting.status,
                        "image_url": painting.image_url,
                        "error": painting.error,
                    }
                    yield f"event: painting_update\ndata: {json.dumps(payload)}\n\n"

            if job.status == "complete":
                yield f"event: job_complete\ndata: {json.dumps({'job_id': job_id})}\n\n"
                break

            time.sleep(1)

    return Response(event_stream(), content_type="text/event-stream",
                    headers={"Cache-Control": "no-cache",
                             "Access-Control-Allow-Origin": "*"})


@app.route("/paintings/<path:filename>")
def serve_painting(filename):
    """Serve generated painting images."""
    return send_from_directory(GENERATED_PAINTINGS_DIR, filename)


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum upload size is 16 MB."}), 413


# ============================================================
# 🔴 DEBUG ONLY — DELETE THIS BLOCK AFTER TESTING 🔴
# ============================================================
@app.route("/debug/log", methods=["POST"])
def debug_log():
    """Append frontend debug log entries to a file."""
    body = request.get_json(silent=True) or {}
    lines = body.get("lines", [])
    if not lines:
        return jsonify({"status": "no lines"}), 200
    with _debug_log_lock:
        with open(DEBUG_LOG_FILE, "a", encoding="utf-8") as f:
            for line in lines:
                f.write(line + "\n")
    return jsonify({"status": "ok", "written": len(lines)}), 200


@app.route("/debug/log", methods=["GET"])
def debug_log_read():
    """Read the debug log file."""
    if not os.path.exists(DEBUG_LOG_FILE):
        return jsonify({"log": "(empty — no log file yet)"}), 200
    with open(DEBUG_LOG_FILE, "r", encoding="utf-8") as f:
        return jsonify({"log": f.read()}), 200


@app.route("/debug/log", methods=["DELETE"])
def debug_log_clear():
    """Clear the debug log file."""
    if os.path.exists(DEBUG_LOG_FILE):
        os.remove(DEBUG_LOG_FILE)
    return jsonify({"status": "cleared"}), 200
# ============================================================


if __name__ == "__main__":
    # Use 'stat' reloader (polling) for reliable hot-reload in Docker on Windows.
    # The default 'auto' reloader tries inotify which doesn't work across
    # Docker bind-mount volumes from a Windows host.
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000,
        use_reloader=True,
        reloader_type="stat",
        reloader_interval=1,
    )
