import os
import json
from flask import Blueprint, jsonify, request
from openai import OpenAI
from sentence_transformers import SentenceTransformer, util
from railtracks.vector_stores import ChromaVectorStore
from dotenv import load_dotenv

quiz = Blueprint("quiz", __name__)
load_dotenv()

# ── OpenAI client ─────────────────────────────────────────────────────────────

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url="https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1",
)

# ── Shared embedding model ────────────────────────────────────────────────────

_embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def embedding_function(texts: list[str]) -> list[list[float]]:
    return _embed_model.encode(texts).tolist()

def semantic_similarity(text1: str, text2: str) -> float:
    emb1 = _embed_model.encode(text1, convert_to_tensor=True)
    emb2 = _embed_model.encode(text2, convert_to_tensor=True)
    return float(util.cos_sim(emb1, emb2))

# ── Shared vector store (same as rag.py) ─────────────────────────────────────
# Re-uses the same chroma_db so quiz questions are grounded in ingested docs

store = ChromaVectorStore(
    collection_name="museum-docs",
    embedding_function=embedding_function,
    path="../chroma_db",
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()

def enrich_with_context(description: str) -> str:
    """Pull relevant chunks from the vector store to ground the question."""
    print("Context being used")
    try:
        results = store.search(description, top_k=2)
        if not results:
            return description
        context = "\n".join(r.content for r in results)
        return f"{description}\nAdditional context from documents:\n{context}"
    except Exception:
        return description  # fallback to plain description if store is empty

# ── Routes ────────────────────────────────────────────────────────────────────


@quiz.route("/")
def index_quiz():
    return "QUIZ!"

@quiz.route("/start", methods=["POST"])
def start():
    """
    Input:
        [
            { "id": "obj_1", "description": "A bronze statue from 4th century BCE..." },
            ...
        ]

    Output:
        [
            { "id": "obj_1", "question": "...", "answer": "..." },
            ...
        ]
    """
    body = request.get_json()
    if not body or not isinstance(body, list):
        return jsonify({"error": "Expected a JSON array"}), 400

    # Enrich each description with relevant context from the RAG store
    enriched_descriptions = "\n".join(
        f"{i + 1}. {enrich_with_context(item.get('description', ''))}"
        for i, item in enumerate(body)
    )

    prompt = f"""You are a museum quiz generator.
Given the following {len(body)} exhibit descriptions (with additional context), generate exactly {len(body)} quiz questions and answers.

Descriptions:
{enriched_descriptions}

Respond with a JSON array of exactly {len(body)} objects in the SAME order as the input.
Each object must have exactly these two fields:
- "question": a clear, concise quiz question about the exhibit
- "answer": the correct answer in one or two sentences

Respond with ONLY the JSON array, no markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a museum quiz generator. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
        )

        raw = strip_fences(response.choices[0].message.content.strip())
        qa_list = json.loads(raw)

        result = []
        for i, item in enumerate(body):
            result.append({
                **item,
                "question": qa_list[i]["question"],
                "answer":   qa_list[i]["answer"],
            })

        return jsonify(result)

    except (json.JSONDecodeError, IndexError, KeyError) as e:
        return jsonify({"error": f"Failed to parse model response: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

    # Compute semantic similarity scores for each pair
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
    A small difference in terminology (e.g. "Purchase" vs "Pay") should be a small mistake, not completely wrong.
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
