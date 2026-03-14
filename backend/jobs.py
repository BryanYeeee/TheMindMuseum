import threading


class JobStore:
    def __init__(self):
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create_job(self, job_id: str) -> dict:
        job = {
            "job_id": job_id,
            "status": "pending",
            "progress": 0,
            "stage": "pending",
            "message": "Queued",
            "error": None,
            "exhibits": [],
        }
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def update_job(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.update(fields)

    def set_exhibit_image(self, job_id: str, exhibit_id: int, image_url: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job and exhibit_id < len(job["exhibits"]):
                job["exhibits"][exhibit_id]["image_url"] = image_url

    def set_exhibit_model(self, job_id: str, exhibit_id: int, model_url: str | None) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job and exhibit_id < len(job["exhibits"]):
                job["exhibits"][exhibit_id]["model_url"] = model_url


job_store = JobStore()
