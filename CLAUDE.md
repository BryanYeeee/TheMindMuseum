# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GenAI2026 is an educational museum web app. Users upload class notes or type a topic; the backend extracts key concepts, generates images (DALL-E 3), converts them to 3D models (Meshy.ai), and the frontend renders an interactive walkable museum.

## Development Commands

### Run Everything (Recommended)
```bash
docker-compose up    # Both services with hot-reloading
docker-compose down
```

### Backend (Flask, port 5000)
```bash
cd backend
cp .env.example .env   # Fill in API keys first
pip install -r requirements.txt
python app.py
```

### Frontend (Next.js, port 3000)
```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## Backend Architecture

Generation is async. The flow is:

```
POST /api/generate-world  →  { job_id }
          ↓ background thread
    llm.py: Claude extracts 4–6 concepts (name, description, image_prompt)
          ↓
    image_gen.py: DALL-E 3 generates one image per concept → saved to static/images/<job_id>/<i>.png
          ↓
    meshy.py: Meshy.ai image-to-3D → polls until GLB URL returned
          ↓
GET /api/status/<job_id>  →  { status, progress, exhibits[] }
```

**Module responsibilities:**
- `config.py` — all env vars and constants
- `jobs.py` — thread-safe in-memory `JobStore` (singleton `job_store`)
- `llm.py` — `extract_concepts(text) -> list[dict]`
- `image_gen.py` — `generate_image(prompt, output_path) -> None`
- `meshy.py` — `image_to_3d(public_image_url) -> str | None`
- `pipeline.py` — `run_pipeline(job_id, text)` background thread + `start_pipeline()`
- `app.py` — Flask routes, static file serving (`static_folder="static"`)

**Exhibit shape** (grows as pipeline progresses):
```json
{ "id": 0, "name": "...", "description": "...", "image_url": "..." | null, "model_url": "..." | null }
```

**Job shape:**
```json
{ "job_id": "...", "status": "pending|running|done|error", "progress": 0-100, "stage": "...", "message": "...", "error": null, "exhibits": [] }
```

**Progress stages:** extracting_concepts (0→15), generating_images (15→55), converting_3d (55→95), complete (100).

## Meshy 3D Limitation

Meshy.ai fetches images from the URL you provide — `localhost` is unreachable from their servers. For local development:
1. `ngrok http 5000` → copy the HTTPS URL
2. Set `PUBLIC_BASE_URL=https://your-url.ngrok-free.app` in `.env`

Without this, `model_url` is `null` for all exhibits. The frontend must handle this gracefully (fall back to 2D image).

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Python 3.13, Flask, Anthropic SDK (Claude), OpenAI SDK (DALL-E 3), Meshy.ai REST API
- **Infrastructure:** Docker + Docker Compose with hot-reloading
