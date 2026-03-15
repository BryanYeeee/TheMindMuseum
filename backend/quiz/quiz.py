import os
import json
from flask import Blueprint, jsonify, request
from openai import OpenAI
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv
from quiz.utils import strip_fences

quiz = Blueprint("quiz", __name__)
load_dotenv()

# ── OpenAI client ─────────────────────────────────────────────────────────────

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url="https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1",
)

# ── Embedding model ───────────────────────────────────────────────────────────

_embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_similarity(text1: str, text2: str) -> float:
    emb1 = _embed_model.encode(text1, convert_to_tensor=True)
    emb2 = _embed_model.encode(text2, convert_to_tensor=True)
    return float(util.cos_sim(emb1, emb2))

# ── Routes ────────────────────────────────────────────────────────────────────

@quiz.route("/")
def index_quiz():
    return "QUIZ!"

@quiz.route("/check", methods=["POST"])
def check():
    """
    Input:
        {
            "user_answers":   ["answer 1", "answer 2", ...],
            "sample_answers": ["answer 1", "answer 2", ...]
        }

    Output:
        [
            { "feedback": "That is absolutely correct!" },
            { "feedback": "You made a small mistake: ..." },
            ...
        ]
    """
    body = request.get_json()
    if not body:
        return jsonify({"error": "No body provided"}), 400

    user_answers   = body.get("user_answers")
    sample_answers = body.get("sample_answers")

    if not user_answers or not sample_answers:
        return jsonify({"error": "Both user_answers and sample_answers are required"}), 400
    if len(user_answers) != len(sample_answers):
        return jsonify({"error": "user_answers and sample_answers must be the same length"}), 400

    scores = [
        semantic_similarity(user_answers[i], sample_answers[i])
        for i in range(len(user_answers))
    ]

    pairs = "\n".join(
        f"{i + 1}. Sample: {sample_answers[i]}\n"
        f"   User: {user_answers[i]}\n"
        f"   Semantic similarity: {scores[i]:.2f} (0=completely unrelated, 1=identical)"
        for i in range(len(user_answers))
    )

    prompt = f"""You are a lenient but accurate museum quiz evaluator.
When comparing answers, focus on whether the user understood the core concept, not exact wording.
A small difference in terminology should be a small mistake, not completely wrong.
Only mark as "absolutely wrong" if the user clearly misunderstood the concept entirely.

{pairs}

Respond with a JSON array of exactly {len(user_answers)} objects in the SAME order.
Each object must have exactly one field:
- "feedback": one sentence, one of:
  - "That is absolutely correct!" (if the core concept is right)
  - "You made a small mistake: ..." (if mostly right but minor error in wording or detail)
  - "That is absolutely wrong because: ..." (only if fundamentally incorrect)

Respond with ONLY the JSON array, no markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a quiz evaluator. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
        )

        raw = strip_fences(response.choices[0].message.content.strip())
        feedback_list = json.loads(raw)
        return jsonify(feedback_list)

    except (json.JSONDecodeError, IndexError) as e:
        return jsonify({"error": f"Failed to parse model response: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
