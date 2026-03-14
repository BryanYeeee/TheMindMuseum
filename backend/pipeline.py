import os
import threading

from config import STATIC_DIR, PUBLIC_BASE_URL
from jobs import job_store
from llm import extract_concepts
from image_gen import generate_image
from meshy import image_to_3d


def run_pipeline(job_id: str, text: str) -> None:
    """Full generation pipeline. Runs in a background thread."""
    job_dir = os.path.join(STATIC_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    try:
        # Stage 1: Extract concepts with LLM
        job_store.update_job(job_id, status="running", stage="extracting_concepts", progress=0, message="Analyzing your notes...")
        concepts = extract_concepts(text)
        num = len(concepts)

        # Initialize exhibits with text data; image/model arrive later
        exhibits = [
            {"id": i, "name": c["name"], "description": c["description"], "image_url": None, "model_url": None}
            for i, c in enumerate(concepts)
        ]
        job_store.update_job(job_id, exhibits=exhibits, progress=15, stage="generating_images", message="Generating exhibit images...")

        # Stage 2: Generate images
        image_prompts = [c["image_prompt"] for c in concepts]
        for i, prompt in enumerate(image_prompts):
            try:
                output_path = os.path.join(job_dir, f"{i}.png")
                generate_image(prompt, output_path)
                image_url = f"{PUBLIC_BASE_URL}/static/images/{job_id}/{i}.png"
                job_store.set_exhibit_image(job_id, i, image_url)
            except Exception as e:
                print(f"[pipeline] Image generation failed for exhibit {i}: {e}")

            progress = 15 + int(40 * (i + 1) / num)
            job_store.update_job(job_id, progress=progress)

        # Stage 3: Convert images to 3D models
        job_store.update_job(job_id, stage="converting_3d", message="Converting images to 3D models...")
        for i in range(num):
            exhibit = job_store.get_job(job_id)["exhibits"][i]
            if exhibit["image_url"]:
                try:
                    model_url = image_to_3d(exhibit["image_url"])
                    job_store.set_exhibit_model(job_id, i, model_url)
                except Exception as e:
                    print(f"[pipeline] 3D conversion failed for exhibit {i}: {e}")

            progress = 55 + int(40 * (i + 1) / num)
            job_store.update_job(job_id, progress=progress)

        job_store.update_job(job_id, status="done", stage="complete", progress=100, message="Museum ready!")

    except Exception as e:
        job_store.update_job(job_id, status="error", stage="failed", error=str(e), message="Generation failed.")


def start_pipeline(job_id: str, text: str) -> None:
    thread = threading.Thread(target=run_pipeline, args=(job_id, text), daemon=True)
    thread.start()
