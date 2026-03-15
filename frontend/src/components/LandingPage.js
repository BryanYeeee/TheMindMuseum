'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LandingPage({ onStart }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [notes, setNotes] = useState('')
  const [numArtifacts, setNumArtifacts] = useState(3)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = (f) => {
    if (f?.type === 'application/pdf') {
      setFile(f)
      setError(null)
    } else {
      setError('Please upload a PDF file.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file && !notes.trim()) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    if (file) formData.append('file', file)
    else formData.append('text', notes.trim())
    formData.append('num_artifacts', numArtifacts)

    try {
      const response = await fetch('http://localhost:5001/design', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      onStart(numArtifacts, data)
    } catch (err) {
      console.error(err)
      setError('Generation failed. Make sure the backend is running.')
      setLoading(false)
    }
  }

  const canSubmit = (file || notes.trim()) && !loading

  return (
    <div className='relative min-h-screen bg-[#050505] text-white overflow-hidden font-lora'>

      {/* Ambient amber glow */}
      <div className='absolute -top-40 -right-40 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-amber-800/10 rounded-full blur-3xl pointer-events-none' />

      <div className='relative z-20 min-h-screen flex'>

        {/* ── LEFT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className='w-2/5 flex flex-col justify-between p-16 border-r border-white/10'
        >
          <div>
            <div className='flex items-center gap-3 mb-16'>
              <div className='w-6 h-px bg-amber-600' />
              <span className='text-amber-600 text-[9px] tracking-[0.4em] uppercase'>Mind Museum</span>
            </div>

            <h1 className='text-6xl leading-tight tracking-tight text-white mb-6'>
              The<br />Mind<br />Museum
            </h1>
            <p className='text-white/60 text-sm leading-relaxed max-w-xs'>
              Upload your study notes or paste them below. We'll build a personalised 3D museum around your content — with exhibits, quizzes, and an AI guide.
            </p>
          </div>

          <div className='flex flex-col gap-6'>
            <div className='w-px h-12 bg-gradient-to-b from-white/20 to-transparent' />
            <div className='flex flex-col gap-3'>
              {[['W · A · S · D', 'Move'], ['Mouse', 'Look around'], ['Click', 'Interact with exhibits'], ['Tab', 'Close panels']].map(([key, action]) => (
                <div key={key} className='flex items-center gap-4'>
                  <span className='text-white/60 text-[10px] tracking-widest w-24'>{key}</span>
                  <span className='text-white/35 text-[9px] tracking-[0.2em] uppercase'>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className='w-3/5 flex flex-col justify-center px-16 py-12'
        >
          <form onSubmit={handleSubmit} className='flex flex-col gap-5 h-full max-h-[780px]'>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 border cursor-pointer transition-all duration-300 py-12
                ${dragging
                  ? 'border-amber-500 bg-amber-500/10'
                  : file
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='.pdf'
                className='hidden'
                onChange={e => handleFile(e.target.files[0])}
                disabled={loading}
              />

              <AnimatePresence mode='wait'>
                {file ? (
                  <motion.div
                    key='file'
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className='flex flex-col items-center gap-2'
                  >
                    <div className='w-2 h-2 bg-amber-500 rounded-full' />
                    <p className='text-amber-400 text-sm tracking-widest'>{file.name}</p>
                    <p className='text-white/30 text-[10px] tracking-[0.2em] uppercase'>PDF attached · click to change</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key='empty'
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className='flex flex-col items-center gap-2'
                  >
                    <p className='text-white/70 text-sm tracking-widest'>Drop PDF here</p>
                    <p className='text-white/40 text-[10px] tracking-[0.2em] uppercase'>or click to browse</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div className='flex items-center gap-4'>
              <div className='flex-1 h-px bg-white/15' />
              <span className='text-white/40 text-[10px] tracking-[0.3em] uppercase'>or paste notes</span>
              <div className='flex-1 h-px bg-white/15' />
            </div>

            {/* Text area */}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={loading || !!file}
              placeholder={file ? 'PDF attached — text input disabled' : 'Paste your notes here…'}
              rows={8}
              className={`w-full bg-white/5 border text-white text-sm leading-relaxed px-5 py-4 outline-none resize-none transition-all placeholder-white/30
                ${file
                  ? 'border-white/10 opacity-40 cursor-not-allowed'
                  : 'border-white/20 focus:border-amber-500/60 focus:bg-white/8'}`}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className='text-red-400/80 text-[11px] tracking-[0.15em] uppercase'
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Artifact slider + submit */}
            <div className='flex items-center gap-6 mt-auto pt-2'>
              <div className='flex items-center gap-4 flex-1 border border-white/20 px-5 py-3'>
                <span className='text-white/70 text-[10px] tracking-[0.25em] uppercase whitespace-nowrap'>Artifacts</span>
                <input
                  type='range'
                  min='1'
                  max='20'
                  value={numArtifacts}
                  onChange={e => setNumArtifacts(parseInt(e.target.value))}
                  disabled={loading}
                  className='flex-1 accent-amber-500 appearance-none h-px cursor-pointer'
                />
                <span className='text-amber-500 text-sm tracking-widest w-4 text-right'>{numArtifacts}</span>
              </div>

              <button
                type='submit'
                disabled={!canSubmit}
                className={`flex items-center justify-between gap-8 px-8 py-3 border transition-all whitespace-nowrap
                  ${loading
                    ? 'border-amber-500 bg-amber-500/20 cursor-wait'
                    : !canSubmit
                    ? 'border-white/20 opacity-40 cursor-not-allowed'
                    : 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer group'}`}
              >
                {loading ? (
                  <>
                    <span className='text-amber-300 text-sm tracking-widest uppercase'>Building</span>
                    <span className='w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping' />
                  </>
                ) : (
                  <>
                    <span className='text-amber-300 text-sm tracking-widest uppercase'>Enter Museum</span>
                    <span className='text-amber-400 text-[18px] leading-none'>→</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </div>
  )
}
