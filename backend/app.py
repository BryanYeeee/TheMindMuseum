import io
import uuid

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader

from jobs import job_store
from pipeline import start_pipeline

app = Flask(__name__, static_folder="static")
CORS(app)


@app.route("/api/generate-world", methods=["POST"])
def generate_world():
    text = None

    if "pdf" in request.files:
        pdf_file = request.files["pdf"]
        if pdf_file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
        try:
            reader = PdfReader(io.BytesIO(pdf_file.read()))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 400

    elif request.is_json:
        text = request.get_json().get("text")

    elif "text" in request.form:
        text = request.form.get("text")

    if not text or not text.strip():
        return jsonify({"error": "No text or PDF provided"}), 400

    job_id = uuid.uuid4().hex
    job_store.create_job(job_id)
    start_pipeline(job_id, text.strip())

    return jsonify({"job_id": job_id}), 202


@app.route("/api/status/<job_id>", methods=["GET"])
def get_status(job_id):
    job = job_store.get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
