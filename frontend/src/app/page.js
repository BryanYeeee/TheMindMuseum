'use client'
import LandingPage from '@/components/LandingPage'
import ModelViewer from '@/components/ModelViewer'
import { useState } from 'react'

export default function MainApp() {
  const [view, setView] = useState('landing') 
  const [initialJobData, setInitialJobData] = useState(null)
  const [numArtifacts, setNumArtifacts] = useState(3)
  const [numPaintings, setNumPaintings] = useState(3)

  const handleStartMuseum = (numArtifacts, numPaintings, data) => {
    setNumArtifacts(numArtifacts)
    setNumPaintings(numPaintings)
    setInitialJobData(data) // Store the initial job_id and artifact list
    setView('museum')       // Switch the component being rendered
  }

  return (
    <main className="w-full h-screen bg-black">
      {view === 'landing' ? (
        <LandingPage onStart={handleStartMuseum} />
      ) : (
        <ModelViewer numArtifacts={numArtifacts} numPaintings={numPaintings} initialJobData={initialJobData} />
      )}
    </main>
  )
}