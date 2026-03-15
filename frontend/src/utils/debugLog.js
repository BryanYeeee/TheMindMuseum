// ============================================================
// 🔴 DEBUG ONLY — DELETE THIS ENTIRE FILE AFTER TESTING 🔴
// ============================================================

const TAG = "[ARTIFACT-DEBUG]";
const BACKEND = "http://localhost:5001";
const FLUSH_INTERVAL = 2000; // ms

const IS_BROWSER = typeof window !== "undefined";

let _buffer = [];
let _timer = null;

function ts() {
    return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function _enqueue(...parts) {
    if (!IS_BROWSER) return; // skip during SSR
    const line = parts
        .map((p) => (typeof p === "object" ? JSON.stringify(p) : String(p)))
        .join(" ");
    _buffer.push(line);
    // Auto-schedule flush
    if (!_timer) {
        _timer = setTimeout(_flush, FLUSH_INTERVAL);
    }
}

async function _flush() {
    _timer = null;
    if (_buffer.length === 0) return;
    const lines = _buffer.splice(0);
    try {
        const resp = await fetch(`${BACKEND}/debug/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lines }),
        });
        if (!resp.ok) console.warn(TAG, "Flush HTTP error:", resp.status);
    } catch (err) {
        // If backend is down, re-queue and also dump to console as fallback
        _buffer.unshift(...lines);
        console.warn(
            TAG,
            "Failed to flush debug log to backend, will retry.",
            err?.message,
        );
    }
}

// Flush on page unload so we don't lose trailing entries
if (IS_BROWSER) {
    window.addEventListener("beforeunload", () => {
        if (_buffer.length > 0) {
            const blob = new Blob([JSON.stringify({ lines: _buffer })], {
                type: "application/json",
            });
            navigator.sendBeacon(`${BACKEND}/debug/log`, blob);
        }
    });
}

function log(...args) {
    if (IS_BROWSER) console.log(...args); // still echo to browser console
    _enqueue(...args);
}

// 🔴 DEBUG: immediate test on module load
if (IS_BROWSER) {
    console.warn(TAG, "debugLog module loaded in browser at", ts());
    fetch(`${BACKEND}/debug/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: [`${TAG} MODULE LOADED — ${ts()}`] }),
    })
        .then((r) => console.warn(TAG, "init flush status:", r.status))
        .catch((e) => console.error(TAG, "init flush FAILED:", e));
}

// ------- public helpers -------

export function logUpload(file, numArtifacts, numPaintings) {
    log(`${TAG} UPLOAD START — ${ts()}`);
    log(`  File: ${file?.name} (${(file?.size / 1024).toFixed(1)} KB)`);
    log(`  numArtifacts: ${numArtifacts} | numPaintings: ${numPaintings}`);
}

export function logUploadResponse(data) {
    log(`${TAG} UPLOAD RESPONSE — ${ts()}`);
    log(`  pdf_key: ${data?.pdf_key}`);
    log(`  Full response:`, data);
}

export function logDesignRequest(pdfKey, numArtifacts) {
    log(`${TAG} DESIGN REQUEST — ${ts()}`);
    log(`  POST /artifacts/design`, {
        pdf_key: pdfKey,
        num_artifacts: numArtifacts,
    });
}

export function logDesignResponse(data) {
    log(`${TAG} DESIGN RESPONSE — ${ts()}`);
    log(`  job_id: ${data?.job_id}`);
    log(`  artifacts count: ${data?.artifacts?.length ?? 0}`);
    if (data?.artifacts) {
        data.artifacts.forEach((a, i) =>
            log(`    [${i}] id=${a.id} name="${a.name}" status=${a.status}`),
        );
    }
    log(`  Full payload:`, data);
}

export function logIngestResponse(data) {
    log(`${TAG} INGEST RESPONSE — ${ts()}`);
    log(`  Response:`, data);
}

export function logOnStart(numArtifacts, numPaintings, data, pdfKey) {
    log(`${TAG} onStart -> TRANSITION TO MUSEUM — ${ts()}`);
    log(`  numArtifacts: ${numArtifacts} | numPaintings: ${numPaintings}`);
    log(`  pdfKey: ${pdfKey}`);
    log(`  job_id: ${data?.job_id}`);
}

export function logSSEConnect(jobId) {
    log(`${TAG} SSE CONNECTING — ${ts()}`);
    log(`  URL: ${BACKEND}/artifacts/stream/${jobId}`);
}

export function logSSEArtifactUpdate(updatedArtifact, prevExhibits) {
    log(`${TAG} SSE artifact_update — ${ts()}`);
    log(`  Artifact id: ${updatedArtifact.id}`);
    log(`  name: ${updatedArtifact.name}`);
    log(`  status: ${updatedArtifact.status}`);
    log(`  image_url: ${updatedArtifact.image_url ?? "(none)"}`);
    log(`  model_url: ${updatedArtifact.model_url ?? "(none)"}`);
    log(`  Current liveExhibits count: ${prevExhibits.length}`);
    const idx = prevExhibits.findIndex((ex) => ex.id === updatedArtifact.id);
    log(`  Matched index in liveExhibits: ${idx === -1 ? "NOT FOUND" : idx}`);
    log(`  Full SSE data:`, updatedArtifact);
}

export function logSSEJobComplete(data) {
    log(`${TAG} SSE job_complete — ${ts()}`);
    log(`  Data: ${data}`);
    _flush(); // force-flush on job complete
}

export function logSSEError(event) {
    log(`${TAG} SSE ERROR — ${ts()}`);
    log(`  readyState: ${event?.target?.readyState}`);
    _flush(); // force-flush on error
}

export function logSSEClose(reason) {
    log(`${TAG} SSE CLOSED — ${ts()} — reason: ${reason}`);
    _flush(); // force-flush on close
}

export function logLiveExhibitsInit(exhibits) {
    log(`${TAG} liveExhibits INITIALIZED — ${ts()}`);
    log(`  Count: ${exhibits.length}`);
    exhibits.forEach((ex, i) =>
        log(
            `    [${i}] id=${ex.id} name="${ex.name}" status=${ex.status} segmentID=${ex.segmentID}`,
        ),
    );
}

export function logPlacement(artifactIndex, segmentID, position, posKey) {
    log(
        `${TAG} Placement — index=${artifactIndex} segment=${segmentID} posKey=${posKey} pos=[${position}]`,
    );
}

export function logPageProps(
    numArtifacts,
    numPaintings,
    initialArtifactData,
    pdfKey,
) {
    log(`${TAG} ModelViewer MOUNTED — ${ts()}`);
    log(`  numArtifacts: ${numArtifacts} | numPaintings: ${numPaintings}`);
    log(`  pdfKey: ${pdfKey}`);
    log(
        `  initialArtifactData: ${initialArtifactData ? `job_id=${initialArtifactData.job_id}, ${initialArtifactData.artifacts?.length ?? 0} artifacts` : "null"}`,
    );
}
