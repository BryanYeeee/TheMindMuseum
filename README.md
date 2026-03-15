# The Mind Museum

An AI-powered interactive 3D museum that transforms any PDF or topic into a fully explorable virtual exhibit. Upload your content, and generative AI creates 3D artifacts, paintings, quiz-giving NPCs, and a RAG-powered receptionist — all inside a first-person museum you can walk through in your browser.

---

## Inspiration

Many students study by repeatedly rereading their notes, but this is often a passive and inefficient way to learn. Research in cognitive science shows that people remember information better when it is associated with physical spaces and visual experiences rather than just text.

We were inspired by the **method of loci** (memory palace technique), a mnemonic strategy dating back thousands of years that works by placing pieces of information within a familiar location so that recalling the space helps you recall the information.

However, building a memory palace requires significant mental effort and imagination. We wondered: **what if technology could build the memory palace for you?**

## What It Does

We automatically transform notes into a virtual museum filled with interactive AI agents and 3D artifacts. Users enter a topic or upload notes, and the system extracts key ideas and converts them into 3D models and paintings placed throughout a navigable 3D environment.

Users can explore the museum, click on artifacts to learn about concepts, ask the AI receptionist in-context questions, and test their knowledge through quizzes from fellow museum visitors. Instead of rereading static notes, learners explore their knowledge as a physical space.

## How We Built It

**Text Processing** — Users upload a PDF or enter a topic. The backend extracts text, embeds it with a sentence transformer, and stores it in a vector database for semantic search. A large language model designs the artifacts and paintings, while a separate LLM powers RAG-based question answering and quiz generation.

**3D Model Generation** — Each artifact's visual description is used to generate a reference image, which is then converted into a 3D `.glb` model using Hunyuan3D-2.1 deployed on a Vast.ai GPU instance. The backend communicates with the remote GPU server via a REST API exposed through a Cloudflare tunnel. See [vast-ai/README.md](vast-ai/README.md) for the full deployment guide.

**3D Environment** — The museum is rendered in the browser using Three.js with React Three Fiber. Users walk through with first-person controls, interacting with 3D museum models and animated NPC characters.

**Real-Time Generation** — The backend streams artifact and painting creation progress via Server-Sent Events, so users watch the museum populate in real time.

**Infrastructure** — The system is containerized with Docker Compose, orchestrating the Next.js frontend, Flask backend, and a debug client.

## Challenges We Ran Into

**Translating abstract concepts into visual exhibits** — There's no obvious mapping between "gradient descent" and a 3D object. We designed prompts where the language model generates artifacts that symbolically represent ideas, paired with interactive explanations for context.

**Connecting AI generation with real-time 3D** — Artifact generation, world design, and quiz creation all happen asynchronously. We implemented SSE streaming and careful state management to keep the experience responsive as content arrives.

**Building a fully interactive 3D web experience** — Navigation, pointer lock controls, object interaction, and NPC dialogue all had to work seamlessly in the browser while maintaining performance.

## Accomplishments We're Proud Of

We built an **end-to-end pipeline** in 36 hours — from PDF upload to a fully explorable 3D museum with AI-generated artifacts, paintings, quiz NPCs, and a RAG-powered receptionist. We successfully combined **language models, image generation, 3D model generation, vector search, and real-time 3D rendering** into a single cohesive experience.

## What We Learned

We learned how to build **3D web experiences** with Three.js and React Three Fiber — managing scene composition, camera movement, and interactions while maintaining performance. We also gained experience **designing AI pipelines for real-time UIs**, coordinating PDF extraction, embeddings, vector search, and multiple LLM calls to drive dynamic 3D world creation.

## What's Next

- **Richer exhibits** — Dynamic visualizations and simulations instead of static artifacts (interactive physics experiments, animated biology processes, live algorithm visualizations)
- **Broader input support** — Lecture slides, textbooks, and full course imports to generate museums representing an entire subject
- **Faster generation** — More capable models and stronger compute for near-real-time museum creation

---

## Architecture

```
    Browser (:3000)                    Flask Backend (:5001)
  ┌─────────────────┐              ┌──────────────────────────┐
  │  Next.js + React │──  REST  ──►│ PDF parsing & extraction │
  │  Three.js Museum │◄── SSE  ───│ LLM design (artifacts)   │
  └─────────────────┘              │ Image generation         │
                                   │ 3D model generation ─────┼──► Hunyuan3D (Vast.ai GPU)
  Debug Client (:3001)             │ Vector DB + RAG (Q&A)    │
  └─ Pipeline tester               │ Quiz system              │
                                   └──────┬───────────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │  Google APIs           │
                              │  (Gemini, Imagen)      │
                              ├────────────────────────┤
                              │  HuggingFace LLM       │
                              │  (RAG & Quizzes)       │
                              └────────────────────────┘
```

## Tech Stack

| Layer               | Technology                                                                     |
| ------------------- | ------------------------------------------------------------------------------ |
| Frontend            | Next.js, React, Three.js, React Three Fiber, Drei, Framer Motion, Tailwind CSS |
| Backend             | Flask, Pydantic, Pillow                                                        |
| Text Generation     | Google Gemini                                                                  |
| Image Generation    | Google Imagen (primary), Gemini (fallback)                                     |
| 3D Model Generation | Hunyuan3D (self-hosted GPU via Vast.ai)                                        |
| RAG & Quizzes       | HuggingFace-hosted LLM, Sentence Transformers, ChromaDB                        |
| Infrastructure      | Docker Compose                                                                 |

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Google Cloud API key (Gemini + Imagen)
- HuggingFace API key (for RAG/Quiz LLM)
- GPU instance running Hunyuan3D (see [vast-ai/README.md](vast-ai/README.md))

### Setup

```bash
git clone https://github.com/your-org/GenAI2026.git
cd GenAI2026
```

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
HUNYUAN3D_API_URL=https://your-hunyuan3d-endpoint
OPENAI_API_KEY=your_huggingface_api_key
```

Start all services:

```bash
docker compose up --build
```

| Service      | URL                   |
| ------------ | --------------------- |
| Frontend     | http://localhost:3000 |
| Backend      | http://localhost:5001 |
| Debug Client | http://localhost:3001 |

### Controls

| Key   | Action                        |
| ----- | ----------------------------- |
| WASD  | Move                          |
| Mouse | Look around                   |
| Click | Interact with exhibits / NPCs |
| Shift | Sprint                        |
| Tab   | Close exhibit viewer          |
| Esc   | Pause                         |

## Project Structure

```
├── backend/
│   ├── app.py                  # Flask routes, SSE, background threads
│   ├── gemini_client.py        # LLM design + image generation
│   ├── model_generator.py      # Image → 3D model pipeline
│   ├── models.py               # Data models
│   ├── rag_agent/              # PDF ingest, semantic search, Q&A
│   └── quiz/                   # Quiz generation + evaluation
├── frontend/src/
│   ├── components/
│   │   ├── LandingPage.js      # Upload, topic input, configuration
│   │   ├── ModelViewer.js      # Main 3D scene + SSE streaming
│   │   ├── Controller.js       # First-person movement
│   │   ├── UI.js               # HUD, dialogue, receptionist chat
│   │   ├── ExhibitViewer.js    # Exhibit detail modal
│   │   └── ...                 # Tiles, paintings, artifacts, NPCs
│   └── constants/              # Placement data
├── debug-frontend/             # Standalone pipeline tester
├── vast-ai/                    # Hunyuan3D deployment guide
└── docker-compose.yml
```
