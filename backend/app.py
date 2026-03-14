import io
import json
import os
import threading
import time
import uuid

from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
from PyPDF2 import PdfReader

from models import ArtifactResult, JobResult
from gemini_client import design_world
from model_generator import generate_model, GENERATED_MODELS_DIR

app = Flask(__name__, static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit
CORS(app)

MAX_TEXT_CHARS = 500_000  # ~125K tokens — safe margin for Gemini context window


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum upload size is 16 MB."}), 413


# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------
# Each job: {"status": str, "events": list[dict], "result": dict|None,
#            "error": str|None, "done": threading.Event}
jobs: dict[str, dict] = {}


def _extract_text_from_request() -> tuple[str | None, tuple | None]:
    """Extract text from the incoming request (JSON, form, or PDF).
    Returns (text, error_response) — one will be None."""
    text = None

    if "pdf" in request.files:
        pdf_file = request.files["pdf"]
        if pdf_file.filename == "":
            return None, (jsonify({"error": "Empty filename"}), 400)
        try:
            reader = PdfReader(io.BytesIO(pdf_file.read()))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            return None, (jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 400)

    elif request.is_json:
        text = request.get_json().get("text")

    elif "text" in request.form:
        text = request.form.get("text")

    if not text or not text.strip():
        return None, (jsonify({"error": "No text or PDF provided"}), 400)

    # Truncate to stay within Gemini's context window
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]

    return text, None


def _emit(job_id: str, event: dict):
    """Append an event to the job's event list."""
    jobs[job_id]["events"].append(event)


def _run_job(job_id: str, text: str, full_generation: bool = False):
    """Background worker — runs the full world generation pipeline."""
    try:
        # Step 1: Gemini world design
        _emit(job_id, {"status": "summarizing", "message": "Analyzing input with Gemini..."})
        world_design = design_world(text)

        # Step 2: Sort artifacts by position_index (importance order)
        sorted_artifacts = sorted(world_design.artifacts, key=lambda a: a.position_index)

        # Dev mode: only generate 3D model for the first artifact
        if not full_generation:
            _emit(job_id, {"status": "dev_mode", "message": f"Dev mode: generating 1/{len(sorted_artifacts)} models (pass full_generation=true for all)"})

        # Step 3: Generate image + 3D model for each artifact
        total = len(sorted_artifacts)
        _emit(job_id, {"status": "generating_models", "progress": f"0/{total}",
                        "message": "Generating images and 3D models..."})

        artifact_results: list[ArtifactResult] = []
        for i, artifact in enumerate(sorted_artifacts):
            # Dev mode: only generate the first model, rest get placeholder URLs
            if not full_generation and i >= 1:
                ar = ArtifactResult(
                    name=artifact.name,
                    lore=artifact.lore,
                    fact=artifact.fact,
                    model_url="",
                )
                artifact_results.append(ar)
                _emit(job_id, {"status": "artifact_ready", "index": i, "total": total,
                                "artifact": ar.model_dump()})
                continue

            _emit(job_id, {"status": "generating_models", "progress": f"{i}/{total}",
                            "message": f"Generating: {artifact.name}"})
            filename = generate_model(artifact.visual_description)
            ar = ArtifactResult(
                name=artifact.name,
                lore=artifact.lore,
                fact=artifact.fact,
                model_url=f"/api/models/{filename}",
            )
            artifact_results.append(ar)
            _emit(job_id, {"status": "artifact_ready", "index": i, "total": total,
                            "artifact": ar.model_dump()})

        # Step 4: Complete
        result = JobResult(
            artifacts=artifact_results,
        )

        jobs[job_id]["result"] = result.model_dump()
        jobs[job_id]["status"] = "completed"
        _emit(job_id, {"status": "completed", "result": result.model_dump()})

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        _emit(job_id, {"status": "failed", "error": str(e)})

    finally:
        jobs[job_id]["done"].set()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/generate-world", methods=["POST"])
def generate_world():
    """Accept text or PDF, kick off async world generation, return job ID.

    Optional parameter:
        full_generation (bool): If true, generate all 14 3D models.
            Defaults to false (dev mode — only generates 1 model to save cost).
    """
    text, error = _extract_text_from_request()
    if error:
        return error

    # Check for full_generation flag in JSON body or query param
    full_generation = False
    if request.is_json:
        full_generation = bool(request.get_json().get("full_generation", False))
    elif request.args.get("full_generation", "").lower() in ("true", "1"):
        full_generation = True

    job_id = uuid.uuid4().hex
    jobs[job_id] = {
        "status": "queued",
        "events": [{"status": "queued"}],
        "result": None,
        "error": None,
        "done": threading.Event(),
    }

    thread = threading.Thread(target=_run_job, args=(job_id, text, full_generation), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "full_generation": full_generation}), 202


@app.route("/api/jobs/<job_id>/events")
def job_events(job_id):
    """SSE endpoint — streams status events until the job completes or fails."""
    if job_id not in jobs:
        return jsonify({"error": "Unknown job ID"}), 404

    def event_stream():
        sent = 0
        while True:
            job = jobs[job_id]
            events = job["events"]

            # Yield any new events
            while sent < len(events):
                evt = events[sent]
                yield f"data: {json.dumps(evt)}\n\n"
                sent += 1

                # Stop streaming after terminal events
                if evt.get("status") in ("completed", "failed"):
                    return

            # Wait briefly before checking for new events
            time.sleep(0.3)

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/api/models/<filename>")
def serve_model(filename):
    """Serve a generated .glb model file."""
    filepath = os.path.join(GENERATED_MODELS_DIR, filename)
    if not os.path.isfile(filepath):
        return jsonify({"status": "generating", "message": "Model not ready yet"}), 202
    return send_from_directory(GENERATED_MODELS_DIR, filename, mimetype="model/gltf-binary")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
