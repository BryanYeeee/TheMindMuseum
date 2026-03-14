import io
import json
import os
import threading
import time
import uuid

from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
from PyPDF2 import PdfReader

from models import ResolvedAsset, ResolvedArtifact, JobResult
from assets import WORLD_SLOTS, ARTIFACT_SLOTS
from gemini_client import design_world
from model_generator import generate_model, GENERATED_MODELS_DIR

app = Flask(__name__, static_folder="static")
CORS(app)

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

    return text, None


def _emit(job_id: str, event: dict):
    """Append an event to the job's event list."""
    jobs[job_id]["events"].append(event)


def _run_job(job_id: str, text: str):
    """Background worker — runs the full world generation pipeline."""
    try:
        # Step 1: Gemini world design
        _emit(job_id, {"status": "summarizing", "message": "Analyzing input with Gemini..."})
        world_design = design_world(text)

        # Step 2: Generate 3D models for each artifact
        total = len(world_design.artifacts)
        _emit(job_id, {"status": "generating_models", "progress": f"0/{total}"})

        artifact_model_files: list[str] = []
        for i, artifact in enumerate(world_design.artifacts):
            filename = generate_model(artifact.visual_description)
            artifact_model_files.append(filename)
            _emit(job_id, {"status": "generating_models", "progress": f"{i + 1}/{total}"})

        # Step 3: Assemble result — resolve slot IDs to positions
        _emit(job_id, {"status": "assembling", "message": "Building world layout..."})

        resolved_assets = []
        for ap in world_design.asset_placements:
            slot = WORLD_SLOTS[ap.slot_id]
            resolved_assets.append(ResolvedAsset(
                asset_id=ap.asset_id,
                slot_id=ap.slot_id,
                position=slot["position"],
                rotation=slot["rotation"],
                scale=slot["scale"],
            ))

        resolved_artifacts = []
        for artifact, model_file in zip(world_design.artifacts, artifact_model_files):
            slot = ARTIFACT_SLOTS[artifact.slot_id]
            resolved_artifacts.append(ResolvedArtifact(
                name=artifact.name,
                lore=artifact.lore,
                fact=artifact.fact,
                model_url=f"/api/models/{model_file}",
                slot_id=artifact.slot_id,
                position=slot["position"],
                rotation=slot["rotation"],
            ))

        result = JobResult(
            summary=world_design.summary,
            theme=world_design.theme,
            world=resolved_assets,
            artifacts=resolved_artifacts,
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
    """Accept text or PDF, kick off async world generation, return job ID."""
    text, error = _extract_text_from_request()
    if error:
        return error

    job_id = uuid.uuid4().hex
    jobs[job_id] = {
        "status": "queued",
        "events": [{"status": "queued"}],
        "result": None,
        "error": None,
        "done": threading.Event(),
    }

    thread = threading.Thread(target=_run_job, args=(job_id, text), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id}), 202


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
