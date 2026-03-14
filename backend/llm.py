import json
import anthropic
from config import ANTHROPIC_API_KEY, LLM_MIN_CONCEPTS, LLM_MAX_CONCEPTS

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

_SYSTEM_PROMPT = f"""You are a museum curator AI. Given educational notes or a topic, extract {LLM_MIN_CONCEPTS}–{LLM_MAX_CONCEPTS} key concepts and design an exhibit for each.

Return a JSON array. Each element must have exactly these fields:
- "name": short exhibit title (2–5 words)
- "description": engaging 2–3 sentence educational description a museum visitor would read
- "image_prompt": detailed DALL-E prompt for a single isolated artifact or object representing the concept (white background, museum-quality)

Return ONLY the JSON array. No markdown, no commentary."""


def extract_concepts(text: str) -> list[dict]:
    message = _client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Extract museum exhibits from these notes:\n\n{text}"}],
    )

    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    concepts = json.loads(raw)

    if not isinstance(concepts, list) or len(concepts) < LLM_MIN_CONCEPTS:
        raise ValueError(f"Expected at least {LLM_MIN_CONCEPTS} concepts, got {len(concepts)}")

    return concepts
