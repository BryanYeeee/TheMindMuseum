import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url="https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1",
)

def strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()

def generate_quiz(store, count: int = 5) -> list[dict]:
    """Generate quiz questions from whatever is currently in the Chroma store."""
    try:
        result = store._collection.get()
        # actual text is in metadatas.__content__, not documents (which stores filenames)
        all_chunks = [
            m.get("__content__", "")
            for m in result.get("metadatas", [])
            if m.get("__content__")
        ]
    except Exception as e:
        print(f"⚠️ Failed to fetch chunks: {e}")
        return []

    if not all_chunks:
        print("❌ no chunks found")
        return []

    # deduplicate — same PDF ingested multiple times causes identical chunks
    seen = set()
    unique_chunks = []
    for c in all_chunks:
        if c not in seen:
            seen.add(c)
            unique_chunks.append(c)

    knowledge = "\n\n".join(unique_chunks)
    if len(knowledge) > 8000:
        knowledge = knowledge[:8000] + "\n...[truncated]"

    print(f"📦 {len(unique_chunks)} unique chunks, {len(knowledge)} chars")

    prompt = f"""You are a museum quiz generator.
Based on the following knowledge base content, generate exactly {count} quiz questions and answers.
Each question should test a distinct concept or fact from the content.
Base your answers strictly on the provided content only.

Knowledge base:
{knowledge}

Respond with a JSON array of exactly {count} objects.
Each object must have exactly these two fields:
- "question": a clear, concise quiz question
- "answer": the correct answer in one or two sentences, based strictly on the content above

Respond with ONLY the JSON array, no markdown, no explanation."""

    print("generating response")
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": "You are a museum quiz generator. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2000,
    )
    print("response generated")

    msg = response.choices[0].message
    if not msg.content:
        print(f"❌ model returned no content, finish_reason={response.choices[0].finish_reason}")
        return []

    raw = strip_fences(msg.content.strip())
    return json.loads(raw)
