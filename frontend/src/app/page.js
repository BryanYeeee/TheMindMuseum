"use client";
import LandingPage from "@/components/LandingPage";
import ModelViewer from "@/components/ModelViewer";
import { useState } from "react";

export default function MainApp() {
    const [view, setView] = useState("landing");
    const [initialArtifactData, setInitialArtifactData] = useState(null);
    const [numArtifacts, setNumArtifacts] = useState(3);
    const [numPaintings, setNumPaintings] = useState(3);
    const [pdfKey, setPdfKey] = useState(null);

    const handleStartMuseum = (numArtifacts, numPaintings, data, pdf_key) => {
        setNumArtifacts(numArtifacts);
        setNumPaintings(numPaintings);
        setInitialArtifactData(data); // Store the initial job_id and artifact list
        setPdfKey(pdf_key); // Store pdf_key for subsequent calls
        setView("museum"); // Switch the component being rendered
    };

    return (
        <main className="w-full h-screen bg-black">
            {view === "landing" ? (
                <LandingPage onStart={handleStartMuseum} />
            ) : (
                <ModelViewer
                    numArtifacts={numArtifacts}
                    numPaintings={numPaintings}
                    initialArtifactData={initialArtifactData}
                    pdfKey={pdfKey}
                />
            )}
        </main>
    );
}
