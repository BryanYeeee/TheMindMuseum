"""
Hardcoded catalogs of world-building assets and placement slots.

Gemini picks from these by ID — it never invents coordinates.
Slots carry rich descriptions so Gemini understands the spatial feel
and can make intelligent thematic choices.
"""

# ---------------------------------------------------------------------------
# Asset catalog
# ---------------------------------------------------------------------------

ASSETS = {
    "grass_plain":     {"type": "terrain",    "desc": "Flat grassy ground"},
    "stone_path":      {"type": "terrain",    "desc": "Cobblestone walkway"},
    "water_pond":      {"type": "terrain",    "desc": "Small reflective pond"},
    "sand_patch":      {"type": "terrain",    "desc": "Sandy ground area"},

    "stone_arch":      {"type": "structure",  "desc": "Weathered stone archway"},
    "wooden_bridge":   {"type": "structure",  "desc": "Small wooden bridge"},
    "tower_ruin":      {"type": "structure",  "desc": "Crumbling tower remains"},
    "stone_wall":      {"type": "structure",  "desc": "Low stone wall segment"},
    "wooden_gate":     {"type": "structure",  "desc": "Rustic wooden gate"},

    "oak_tree":        {"type": "nature",     "desc": "Large leafy oak tree"},
    "pine_tree":       {"type": "nature",     "desc": "Tall coniferous pine"},
    "bush_cluster":    {"type": "nature",     "desc": "Cluster of green bushes"},
    "flower_bed":      {"type": "nature",     "desc": "Colorful wildflowers"},

    "torch":           {"type": "decoration", "desc": "Wall-mounted flaming torch"},
    "banner":          {"type": "decoration", "desc": "Hanging cloth banner"},
    "stone_bench":     {"type": "decoration", "desc": "Simple stone bench"},
    "fountain":        {"type": "decoration", "desc": "Small stone fountain"},
    "lantern":         {"type": "decoration", "desc": "Hanging paper lantern"},
}

# ---------------------------------------------------------------------------
# World slots — each has a plain-English description so Gemini
# understands *what kind of thing* belongs there
# ---------------------------------------------------------------------------

WORLD_SLOTS = {
    "center": {
        "desc": "The focal point of the world — the first thing the player sees. "
                "Best for a landmark structure or grand terrain feature.",
        "position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [2, 1, 2],
    },
    "north": {
        "desc": "A large open area at the far north end. "
                "Good for a major structure, terrain feature, or tree line.",
        "position": [0, 0, -15], "rotation": [0, 0, 0], "scale": [1.5, 1, 1.5],
    },
    "south": {
        "desc": "A large open area at the far south end, facing the center. "
                "Feels like the entrance to the world.",
        "position": [0, 0, 15], "rotation": [0, 180, 0], "scale": [1.5, 1, 1.5],
    },
    "east": {
        "desc": "A large area to the right of center. "
                "Works well for a garden, ruin, or secondary structure.",
        "position": [15, 0, 0], "rotation": [0, 90, 0], "scale": [1.5, 1, 1.5],
    },
    "west": {
        "desc": "A large area to the left of center. "
                "A good spot for something atmospheric — a pond, a grove, a wall.",
        "position": [-15, 0, 0], "rotation": [0, -90, 0], "scale": [1.5, 1, 1.5],
    },
    "ne_corner": {
        "desc": "Tucked-away corner between north and east. "
                "Feels secluded — good for trees, bushes, or a quiet decoration.",
        "position": [12, 0, -12], "rotation": [0, 45, 0], "scale": [1, 1, 1],
    },
    "nw_corner": {
        "desc": "Tucked-away corner between north and west. "
                "A hidden nook — nice for nature or a small ruin.",
        "position": [-12, 0, -12], "rotation": [0, -45, 0], "scale": [1, 1, 1],
    },
    "se_corner": {
        "desc": "Corner between south and east. "
                "Near the entrance — good for a welcoming decoration or gate.",
        "position": [12, 0, 12], "rotation": [0, 135, 0], "scale": [1, 1, 1],
    },
    "sw_corner": {
        "desc": "Corner between south and west. "
                "Near the entrance — good for a matching pair with se_corner.",
        "position": [-12, 0, 12], "rotation": [0, -135, 0], "scale": [1, 1, 1],
    },
    "path_north": {
        "desc": "The walkway leading from center toward the north area. "
                "Best for path terrain, a bridge, or a small decoration.",
        "position": [0, 0, -7], "rotation": [0, 0, 0], "scale": [1, 1, 1],
    },
    "path_south": {
        "desc": "The walkway leading from center toward the south entrance. "
                "Best for path terrain or a welcoming decoration.",
        "position": [0, 0, 7], "rotation": [0, 0, 0], "scale": [1, 1, 1],
    },
    "path_east": {
        "desc": "The walkway from center toward the east area. "
                "A connecting path or small feature.",
        "position": [7, 0, 0], "rotation": [0, 90, 0], "scale": [1, 1, 1],
    },
    "path_west": {
        "desc": "The walkway from center toward the west area. "
                "A connecting path or small feature.",
        "position": [-7, 0, 0], "rotation": [0, -90, 0], "scale": [1, 1, 1],
    },
}

# ---------------------------------------------------------------------------
# Artifact slots — where memory artifacts (pedestals) go
# ---------------------------------------------------------------------------

ARTIFACT_SLOTS = {
    "artifact_1": {
        "desc": "Pedestal between center and the northeast corner.",
        "position": [8, 1, -8], "rotation": [0, 0, 0],
    },
    "artifact_2": {
        "desc": "Pedestal between center and the northwest corner.",
        "position": [-8, 1, -8], "rotation": [0, 0, 0],
    },
    "artifact_3": {
        "desc": "Pedestal between center and the southeast corner.",
        "position": [8, 1, 8], "rotation": [0, 0, 0],
    },
    "artifact_4": {
        "desc": "Pedestal between center and the southwest corner.",
        "position": [-8, 1, 8], "rotation": [0, 0, 0],
    },
    "artifact_5": {
        "desc": "Pedestal at the far north edge, past the north area.",
        "position": [0, 1, -12], "rotation": [0, 0, 0],
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_assets_for_prompt() -> str:
    lines = []
    for aid, info in ASSETS.items():
        lines.append(f'- "{aid}" ({info["type"]}): {info["desc"]}')
    return "\n".join(lines)


def get_world_slots_for_prompt() -> str:
    lines = []
    for sid, info in WORLD_SLOTS.items():
        lines.append(f'- "{sid}": {info["desc"]}')
    return "\n".join(lines)


def get_artifact_slots_for_prompt() -> str:
    lines = []
    for sid, info in ARTIFACT_SLOTS.items():
        lines.append(f'- "{sid}": {info["desc"]}')
    return "\n".join(lines)


def validate_asset_id(asset_id: str) -> bool:
    return asset_id in ASSETS


def validate_world_slot_id(slot_id: str) -> bool:
    return slot_id in WORLD_SLOTS


def validate_artifact_slot_id(slot_id: str) -> bool:
    return slot_id in ARTIFACT_SLOTS
