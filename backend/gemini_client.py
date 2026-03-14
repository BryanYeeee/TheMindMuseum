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
from assets import (
    get_assets_for_prompt,
    get_world_slots_for_prompt,
    get_artifact_slots_for_prompt,
    validate_asset_id,
    validate_world_slot_id,
    validate_artifact_slot_id,
    ARTIFACT_SLOTS,
)

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
1. Summarize the key facts from the material.
2. Design a 3D world layout using ONLY the assets and slots listed below.
3. Create memory artifacts — physical objects whose lore encodes specific facts.

RULES:
- Use ONLY asset IDs from the asset list. Do NOT invent new ones.
- Assign each asset to a world slot. Read each slot's description to choose wisely.
- Each slot may be used AT MOST once.
- Create 1–{len(ARTIFACT_SLOTS)} artifacts. Assign each to a unique artifact slot.
- Each artifact needs a creative name, lore that weaves in the fact, the raw fact, and a visual description for 3D model generation.
- You do NOT need to fill every slot — pick what fits your theme.

=== STUDY MATERIAL ===
{text}

=== ASSETS (use these IDs) ===
{get_assets_for_prompt()}

=== WORLD SLOTS (assign assets here — read descriptions carefully) ===
{get_world_slots_for_prompt()}

=== ARTIFACT SLOTS (assign artifacts here) ===
{get_artifact_slots_for_prompt()}

Return a JSON object matching this exact structure:
{{
  "summary": "A concise summary of the key facts",
  "theme": "A short theme name for the world (e.g. 'Ancient Library', 'Enchanted Forest')",
  "asset_placements": [
    {{"asset_id": "<asset_id>", "slot_id": "<world_slot_id>"}}
  ],
  "artifacts": [
    {{
      "name": "Artifact Name",
      "lore": "Creative lore text that encodes the fact",
      "fact": "The raw fact from the study material",
      "visual_description": "Detailed visual description for 3D model generation",
      "slot_id": "<artifact_slot_id>"
    }}
  ]
}}"""

    if error_context:
        prompt += f"\n\nYour previous response had errors. Please fix them:\n{error_context}"

    return prompt


def _validate_world_design(design: WorldDesign) -> list[str]:
    """Post-validate business rules beyond Pydantic schema checks."""
    errors = []

    # Check asset IDs exist
    for ap in design.asset_placements:
        if not validate_asset_id(ap.asset_id):
            errors.append(f'Unknown asset_id: "{ap.asset_id}"')
        if not validate_world_slot_id(ap.slot_id):
            errors.append(f'Unknown world slot_id: "{ap.slot_id}"')

    # Check artifact slot IDs exist
    for art in design.artifacts:
        if not validate_artifact_slot_id(art.slot_id):
            errors.append(f'Unknown artifact slot_id: "{art.slot_id}"')

    # Check no duplicate world slots
    world_slot_ids = [ap.slot_id for ap in design.asset_placements]
    dupes = set(s for s in world_slot_ids if world_slot_ids.count(s) > 1)
    if dupes:
        errors.append(f'Duplicate world slot assignments: {dupes}')

    # Check no duplicate artifact slots
    artifact_slot_ids = [a.slot_id for a in design.artifacts]
    art_dupes = set(s for s in artifact_slot_ids if artifact_slot_ids.count(s) > 1)
    if art_dupes:
        errors.append(f'Duplicate artifact slot assignments: {art_dupes}')

    # Check artifact count within bounds
    if len(design.artifacts) < 1:
        errors.append("Must have at least 1 artifact")
    if len(design.artifacts) > len(ARTIFACT_SLOTS):
        errors.append(f"Too many artifacts: {len(design.artifacts)} > {len(ARTIFACT_SLOTS)}")

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
            model="gemini-2.0-flash",
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
