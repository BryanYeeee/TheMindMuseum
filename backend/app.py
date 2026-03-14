from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
import io

app = Flask(__name__)
CORS(app)


@app.route("/api/generate-world", methods=["POST"])
def generate_world():
    """
    Accepts either:
      - JSON body with a "text" field, or
      - A multipart form upload with a "pdf" file (and optional "text" field)
    Returns the extracted text for now.
    """
    text = None

    # --- Handle multipart/form-data (PDF upload) ---
    if "pdf" in request.files:
        pdf_file = request.files["pdf"]
        if pdf_file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        try:
            reader = PdfReader(io.BytesIO(pdf_file.read()))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages_text)
        except Exception as e:
            return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 400

    # --- Handle JSON body with plain text ---
    elif request.is_json:
        body = request.get_json()
        text = body.get("text")

    # --- Handle form field without file ---
    elif "text" in request.form:
        text = request.form.get("text")

    if not text or not text.strip():
        return jsonify({"error": "No text or PDF provided"}), 400

    # TODO: Process `text` further (to be implemented later)
    return jsonify({"message": "World generation input received", "text": text}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
