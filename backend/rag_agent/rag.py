import json
import os
import tempfile
import pdfplumber
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from openai import OpenAI
from railtracks.vector_stores import ChromaVectorStore, Chunk
from sentence_transformers import SentenceTransformer

rag = Blueprint("rag", __name__)
load_dotenv()


# ── OpenAI client (HuggingFace endpoint) ─────────────────────────────────────

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url="https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1",
)

resp = client.chat.completions.create(
    model="openai/gpt-oss-120b",  # Setting the right model is important
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in one sentence."},
    ],
    max_tokens=50,  # feel free to edit this
)

# ── Local embedding function ──────────────────────────────────────────────────

_embed_model = SentenceTransformer("all-MiniLM-L6-v2")


def embedding_function(texts: list[str]) -> list[list[float]]:
    return _embed_model.encode(texts).tolist()


# ── Vector store ──────────────────────────────────────────────────────────────

store = ChromaVectorStore(
    collection_name="museum-docs",
    embedding_function=embedding_function,
    path="./chroma_db",
)

# ── Tool definition ───────────────────────────────────────────────────────────

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the museum documents for relevant information. Always call this before answering.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question or keyword to search for"
                    }
                },
                "required": ["query"]
            },
        },
    }
]


# ── Tool execution ────────────────────────────────────────────────────────────

def search_knowledge_base(query: str) -> str:
    print(f"🔍 search_knowledge_base called with: {query}")
    results = store.search(query, top_k=4)
    if not results:
        return "No relevant information found in the knowledge base."
    return "\n".join(
        f"- [{r.metadata.get('source', 'doc')}] {r.content}" for r in results
    )


# ── RAG query loop ────────────────────────────────────────────────────────────

def run_rag_query(question: str) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful museum guide. "
                "Always call search_knowledge_base before answering any question. "
                "If nothing relevant is found, say 'I don't have that information in the uploaded documents.'"
            )
        },
        {"role": "user", "content": question}
    ]

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=messages,
        tools=tools,
        max_tokens=1000,
    )

    msg = response.choices[0].message
    print(f"🤖 raw message: {msg}")

    # Model used proper tool_calls
    if msg.tool_calls:
        tool_call = msg.tool_calls[0]
        args = json.loads(tool_call.function.arguments)
        search_result = search_knowledge_base(args["query"])

    # Model dumped JSON into content instead of using tool_calls
    elif msg.content:
        try:
            parsed = json.loads(msg.content)
            query = parsed.get("query") or parsed.get("arguments", {}).get("query")
            if query:
                print(f"⚠️ model put tool call in content, intercepting: {query}")
                search_result = search_knowledge_base(query)
            else:
                return msg.content
        except (json.JSONDecodeError, AttributeError):
            return msg.content
    else:
        return "No response from model."

    # Feed search result back and get final answer
    messages.append({"role": "assistant", "content": msg.content or ""})
    messages.append({"role": "user",
                     "content": f"Search results:\n{search_result}\n\n"
                                f"Now answer the original question in 3 sentences or less."})

    final = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=messages,
        max_tokens=150,
    )
    return final.choices[0].message.content


# ── Helpers ───────────────────────────────────────────────────────────────────

def pdf_to_chunks(path: str, filename: str, chunk_size=1000, overlap=200):
    with pdfplumber.open(path) as pdf:
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    chunks = []
    for i in range(0, len(full_text), chunk_size - overlap):
        content = full_text[i:i + chunk_size].strip()
        if content:
            chunks.append(Chunk(
                content=content,
                document=filename,
                metadata={"source": filename, "chunk_index": i},
            ))
    return chunks


def ingest_local_file(path: str):
    filename = os.path.basename(path)
    chunks = pdf_to_chunks(path, filename)
    ids = store.upsert(chunks)
    print(f"✅ Ingested {len(ids)} chunks from {filename}")


# ── Routes ────────────────────────────────────────────────────────────────────


@rag.route("/")
def index_rag():
    return "rag port"

@rag.route("/ingest", methods=["POST"])
def ingest():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        chunks = pdf_to_chunks(tmp_path, file.filename)
        ids = store.upsert(chunks)
        return jsonify({"success": True, "source": file.filename, "chunks": len(ids)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


@rag.route("/ask", methods=["POST"])
def ask():
    body = request.get_json()
    if not body or not body.get("question"):
        return jsonify({"error": "No question provided"}), 400

    try:
        answer = run_rag_query(str(body["question"]))
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if os.path.exists('./ent.pdf'):
    ingest_local_file('./ent.pdf')
else:
    print("⚠️  ./ent.pdf not found — skipping auto-ingest. Upload via /ingest endpoint.")
