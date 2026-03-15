"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// 🔴 DEBUG ONLY — DELETE AFTER TESTING
const _debugLines = [];
function _dlog(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    _debugLines.push(line);
    console.log("[ARTIFACT-DEBUG]", msg);
}
function _dflush() {
    if (_debugLines.length === 0) return;
    const lines = _debugLines.splice(0);
    fetch("http://localhost:5001/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
    }).catch((e) => console.warn("debug flush failed", e));
}
// 🔴 END DEBUG

export default function LandingPage({ onStart }) {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [numArtifacts, setNumArtifacts] = useState(3);
    const [numPaintings, setNumPaintings] = useState(3);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);

        try {
            // 1. Upload PDF and get a pdf_key
            const uploadForm = new FormData();
            uploadForm.append("file", file);
            uploadForm.append("num_artifacts", numArtifacts);
            uploadForm.append("num_paintings", numPaintings);

            _dlog(
                `UPLOAD START file=${file?.name} size=${(file?.size / 1024).toFixed(1)}KB artifacts=${numArtifacts} paintings=${numPaintings}`,
            ); // 🔴 DEBUG
            const uploadResp = await fetch("http://localhost:5001/upload", {
                method: "POST",
                body: uploadForm,
            });
            const uploadData = await uploadResp.json();
            _dlog(`UPLOAD RESPONSE pdf_key=${uploadData?.pdf_key}`); // 🔴 DEBUG
            if (uploadData.error) throw new Error(uploadData.error);

            const { pdf_key } = uploadData;

            // 2. Kick off artifact design using the pdf_key
            _dlog(
                `DESIGN REQUEST pdf_key=${pdf_key} num_artifacts=${numArtifacts}`,
            ); // 🔴 DEBUG
            const response = await fetch(
                "http://localhost:5001/artifacts/design",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pdf_key,
                        num_artifacts: numArtifacts,
                    }),
                },
            );

            const response2 = await fetch(
                "http://localhost:5001/agent/ingest",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pdf_key,
                    }),
                },
            );
            
            const response3 = await fetch(
                "http://localhost:5001/paintings/design",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pdf_key,
                        num_paintings: numPaintings,
                    }),
                },
            );


            const data = await response.json();
            _dlog(
                `DESIGN RESPONSE job_id=${data?.job_id} artifacts=${data?.artifacts?.length ?? 0}`,
            ); // 🔴 DEBUG
            if (data?.artifacts)
                data.artifacts.forEach((a, i) =>
                    _dlog(
                        `  artifact[${i}] id=${a.id} name="${a.name}" status=${a.status}`,
                    ),
                );

            const data2 = await response2.json();
            _dlog(`INGEST RESPONSE: ${JSON.stringify(data2)}`); // 🔴 DEBUG

            const data3 = await response3.json();
            if (data3?.paintings)
                data3.paintings.forEach((p, i) =>
                    _dlog(
                        `  paintings[${i}] id=${p.id} name="${p.name}" status=${p.status}`,
                    ),
                );
            if (data.error) throw new Error(data.error);

            // Transitions to ModelViewer, passing pdf_key for future calls
            _dlog(
                `onStart -> MUSEUM numArtifacts=${numArtifacts} numPaintings=${numPaintings} job_id=${data?.job_id} pdfKey=${pdf_key}`,
            ); // 🔴 DEBUG
            _dflush(); // 🔴 DEBUG — flush before transitioning
            onStart(numArtifacts, numPaintings, data, data3, pdf_key);
        } catch (err) {
            console.error(err);
            alert("Extraction failed. Ensure the backend is running.");
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Subtle Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-lg">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-light tracking-[0.3em] uppercase mb-2">
                        Mind Museum
                    </h1>
                    <div className="h-px w-24 bg-amber-600 mx-auto mb-4" />
                    <p className="text-amber-600/60 text-[10px] tracking-[0.5em] uppercase italic">
                        Materializing Digital Thought
                    </p>
                </header>

                <form
                    onSubmit={handleUpload}
                    className="space-y-8 bg-black/40 backdrop-blur-md border border-white/10 p-10 rounded-sm shadow-2xl">
                    {/* Custom File Upload Zone */}
                    <div className="relative group">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            disabled={loading}
                        />
                        <div
                            className={`border-2 border-dashed transition-all duration-500 py-12 px-4 text-center 
              ${
                  file
                      ? "border-amber-600/50 bg-amber-600/5"
                      : "border-white/10 group-hover:border-white/30"
              }`}>
                            <p className="text-xs tracking-widest uppercase text-white/40">
                                {file
                                    ? file.name
                                    : "Drop PDF or Click to Browse"}
                            </p>
                        </div>
                    </div>

                    {/* Artifact Count Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                            <span>Artifact Density</span>
                            <span className="text-amber-500">
                                {numArtifacts} Units
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={numArtifacts}
                            onChange={(e) =>
                                setNumArtifacts(parseInt(e.target.value))
                            }
                            className="w-full accent-amber-600 bg-white/10 appearance-none h-px"
                        />
                    </div>
                    {/* Painting Count Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                            <span>Painting Density</span>
                            <span className="text-amber-500">
                                {numPaintings} Units
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={numPaintings}
                            onChange={(e) =>
                                setNumPaintings(parseInt(e.target.value))
                            }
                            className="w-full accent-amber-600 bg-white/10 appearance-none h-px"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className={`w-full py-4 relative overflow-hidden border transition-all duration-700 uppercase tracking-[0.4em] text-[10px] font-bold
              ${
                  loading
                      ? "border-amber-600 text-amber-600"
                      : "border-white/20 hover:bg-white hover:text-black hover:border-white"
              }`}>
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <span className="w-2 h-2 bg-amber-600 animate-ping rounded-full" />
                                Analyzing Document...
                            </span>
                        ) : (
                            "Initialize Extraction"
                        )}
                    </button>
                </form>

                <footer className="mt-12 text-center">
                    <p className="text-[9px] tracking-[0.2em] text-white/20 uppercase">
                        System Status // SSE_ACTIVE // GPU_READY
                    </p>
                </footer>
            </motion.div>
        </div>
    );
}
