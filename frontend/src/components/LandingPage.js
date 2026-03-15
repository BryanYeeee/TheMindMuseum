'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LandingPage({ onStart }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [numArtifacts, setNumArtifacts] = useState(3)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('num_artifacts', numArtifacts)

    try {
      const response = await fetch('http://localhost:5001/design', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      // Transitions to ModelViewer
      onStart(numArtifacts, data) 
    } catch (err) {
      console.error(err)
      alert("Extraction failed. Ensure the backend is running.")
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Subtle Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <header className="text-center mb-12">
          <h1 className="text-5xl font-light tracking-[0.3em] uppercase mb-2">Mind Museum</h1>
          <div className="h-px w-24 bg-amber-600 mx-auto mb-4" />
          <p className="text-amber-600/60 text-[10px] tracking-[0.5em] uppercase italic">Materializing Digital Thought</p>
        </header>

        <form onSubmit={handleUpload} className="space-y-8 bg-black/40 backdrop-blur-md border border-white/10 p-10 rounded-sm shadow-2xl">
          {/* Custom File Upload Zone */}
          <div className="relative group">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              disabled={loading}
            />
            <div className={`border-2 border-dashed transition-all duration-500 py-12 px-4 text-center 
              ${file ? 'border-amber-600/50 bg-amber-600/5' : 'border-white/10 group-hover:border-white/30'}`}>
              <p className="text-xs tracking-widest uppercase text-white/40">
                {file ? file.name : "Drop PDF or Click to Browse"}
              </p>
            </div>
          </div>

          {/* Artifact Count Slider */}
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
              <span>Artifact Density</span>
              <span className="text-amber-500">{numArtifacts} Units</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="8" 
              value={numArtifacts} 
              onChange={(e) => setNumArtifacts(parseInt(e.target.value))}
              className="w-full accent-amber-600 bg-white/10 appearance-none h-px"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !file}
            className={`w-full py-4 relative overflow-hidden border transition-all duration-700 uppercase tracking-[0.4em] text-[10px] font-bold
              ${loading ? 'border-amber-600 text-amber-600' : 'border-white/20 hover:bg-white hover:text-black hover:border-white'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-2 h-2 bg-amber-600 animate-ping rounded-full" />
                Analyzing Document...
              </span>
            ) : "Initialize Extraction"}
          </button>
        </form>
        
        <footer className="mt-12 text-center">
          <p className="text-[9px] tracking-[0.2em] text-white/20 uppercase">
            System Status // SSE_ACTIVE // GPU_READY
          </p>
        </footer>
      </motion.div>
    </div>
  )
}