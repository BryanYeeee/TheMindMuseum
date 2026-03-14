"""
Gemini API wrapper — sends structured prompts and parses responses
into validated Pydantic models using the google-genai SDK.
"""

import json
import os

from google import genai
from google.genai import types as genai_types
from pydantic import ValidationError

from models import WorldDesign
from assets import NUM_POSITIONS, validate_position_index

MAX_RETRIES = 3

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")
        _client = genai.Client(api_key=api_key)
    return _client


def _build_prompt(text: str, error_context: str | None = None) -> str:
    """Build the full prompt for Gemini."""
    prompt = f"""You are a world designer for an educational memory palace application.

The user has provided study material. Your job is to:
1. Identify the most important facts from the material.
2. Create memory artifacts — creative physical objects whose lore encodes these facts.

RULES:
- Create up to {NUM_POSITIONS} artifacts (one per position). Try to use all {NUM_POSITIONS} if the material has enough content.
- Each artifact gets a unique position_index from 0 to {NUM_POSITIONS - 1}.
- position_index 0 and 1 are the MOST prominent positions — assign the two most important facts there.
- Lower indices = more important facts. Order artifacts by decreasing importance.
- No two artifacts may share the same position_index.
- Each artifact needs: a creative name, lore that naturally weaves in the fact, the raw fact, and a detailed visual description for 3D model generation.
- The visual_description should describe a specific physical object that could be a 3D model (e.g. "A crystalline orb with swirling green energy inside, resting on a stone base").

=== STUDY MATERIAL ===
{text}

Return a JSON object matching this exact structure:
{{
  "summary": "A concise summary of the key facts from the material",
  "theme": "A short theme name for the world (e.g. 'Ancient Library', 'Enchanted Forest')",
  "artifacts": [
    {{
      "name": "Artifact Name",
      "lore": "Creative lore text that naturally encodes the fact",
      "fact": "The raw fact from the study material",
      "visual_description": "Detailed visual description of a 3D object",
      "position_index": 0
    }}
  ]
}}"""

    if error_context:
        prompt += f"\n\nYour previous response had errors. Please fix them:\n{error_context}"

    return prompt


def _validate_world_design(design: WorldDesign) -> list[str]:
    """Post-validate business rules beyond Pydantic schema checks."""
    errors = []

    # Check position indices are valid and unique
    indices = [a.position_index for a in design.artifacts]
    for idx in indices:
        if not validate_position_index(idx):
            errors.append(f'Invalid position_index: {idx} (must be 0–{NUM_POSITIONS - 1})')

    dupes = set(i for i in indices if indices.count(i) > 1)
    if dupes:
        errors.append(f'Duplicate position indices: {dupes}')

    # Check artifact count
    if len(design.artifacts) < 1:
        errors.append('Must have at least 1 artifact')
    if len(design.artifacts) > NUM_POSITIONS:
        errors.append(f'Too many artifacts: {len(design.artifacts)} > {NUM_POSITIONS}')

    return errors


def design_world(text: str) -> WorldDesign:
    """
    Call Gemini to design a memory world from the user's study material.
    Uses structured output + Pydantic validation with retry.
    """
    client = _get_client()
    error_context = None

    for attempt in range(MAX_RETRIES):
        prompt = _build_prompt(text, error_context)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=WorldDesign,
                temperature=0.8,
            ),
        )

        raw = response.text

        # Parse into Pydantic model
        try:
            design = WorldDesign.model_validate_json(raw)
        except ValidationError as e:
            error_context = f"JSON validation failed:\n{e}"
            continue

        # Business-rule validation
        biz_errors = _validate_world_design(design)
        if biz_errors:
            error_context = "Business rule violations:\n" + "\n".join(f"- {e}" for e in biz_errors)
            continue

        return design

    # All retries exhausted — raise with last error context
    raise RuntimeError(f"Gemini failed to produce valid output after {MAX_RETRIES} attempts. Last error: {error_context}")
