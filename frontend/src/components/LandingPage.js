'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LandingPage({ onStart }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [topic, setTopic] = useState('')
  const [numArtifacts, setNumArtifacts] = useState(3)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = (f) => {
    if (f?.type === 'application/pdf') { setFile(f); setError(null) }
    else setError('Please upload a PDF file.')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file && !topic.trim()) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    if (file) formData.append('file', file)
    else formData.append('text', topic.trim())
    formData.append('num_artifacts', numArtifacts)

    try {
      const response = await fetch('http://localhost:5001/design', { method: 'POST', body: formData })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      onStart(numArtifacts, data)
    } catch (err) {
      console.error(err)
      setError('Generation failed. Make sure the backend is running.')
      setLoading(false)
    }
  }

  const canSubmit = (file || topic.trim()) && !loading

  return (
    <div className='absolute inset-0 font-lora text-white select-none'>

      {/* Background image — panning */}
      <motion.img
        src='/images/museum.png'
        alt=''
        className='absolute object-cover opacity-80'
        style={{ width: '115%', height: '115%', top: '-7.5%', left: '-7.5%' }}
        animate={{ x: [0, -40, 20, -10, 0], y: [0, -20, 15, -10, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Same overlay as lock screen */}
      <div className='absolute inset-0 bg-[#050505]/70' />

      {/* Centered content — identical structure to pause screen */}
      <div className='relative z-10 flex items-center justify-center h-full'>
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className='relative flex flex-col items-center w-96 gap-1'
        >
          <div className='w-px h-16 bg-gradient-to-b from-transparent to-white/40 mb-8' />

          <h2 className='text-3xl text-white mb-1 tracking-[0.1em]'>The Mind Museum</h2>
          <p className='text-white/60 text-xs tracking-[0.2em] uppercase mb-8'>— An Interactive Learning Experience —</p>

          {/* Topic input */}
          <input
            type='text'
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleSubmit(e) }}
            disabled={loading || !!file}
            placeholder={'Enter a topic'}
            className={`w-full bg-white/5 border text-white text-sm px-5 py-3 outline-none transition-all placeholder-white/40
              ${file ? 'border-white/10 opacity-40 cursor-not-allowed' : 'border-white/25 focus:border-amber-500/60'}`}
          />

          {/* Or divider */}
          <div className='flex items-center gap-3 w-full my-1'>
            <div className='flex-1 h-px bg-white/10' />
            <span className='text-white/45 text-[9px] tracking-[0.3em] uppercase'>or upload notes</span>
            <div className='flex-1 h-px bg-white/10' />
          </div>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full flex flex-col items-center justify-center gap-1 px-5 py-6 border cursor-pointer transition-all
              ${dragging
                ? 'border-amber-500/60 bg-amber-500/10'
                : file
                ? 'border-amber-500/50 bg-white/5'
                : 'border-white/25 hover:border-amber-500/60 hover:bg-white/5'}`}
          >
            <input ref={fileInputRef} type='file' accept='.pdf' className='hidden'
              onChange={e => handleFile(e.target.files[0])} disabled={loading} />
            <AnimatePresence mode='wait'>
              {file ? (
                <motion.div key='file' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className='flex flex-col items-center gap-1'>
                  <span className='text-amber-400 text-sm tracking-widest'>{file.name}</span>
                  <span className='text-white/50 text-[9px] tracking-[0.2em] uppercase'>PDF attached · click to change</span>
                </motion.div>
              ) : (
                <motion.div key='empty' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className='flex flex-col items-center gap-1'>
                  <span className='text-white/80 text-sm tracking-widest'>Drop PDF here</span>
                  <span className='text-white/45 text-[9px] tracking-[0.2em] uppercase'>or click to browse</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Artifact count — same row style as pause screen menu items */}
          <div className='w-full flex items-center justify-between px-5 py-3 border border-white/25 mt-1'>
            <span className='text-white/90 text-sm tracking-widest uppercase'>Artifacts</span>
            <div className='flex items-center gap-3'>
              <input
                type='range' min='1' max='20' value={numArtifacts}
                onChange={e => setNumArtifacts(parseInt(e.target.value))}
                disabled={loading}
                className='w-28 accent-amber-500 cursor-pointer'
              />
              <span className='text-amber-500 text-[10px] tracking-[0.2em] w-5 text-right'>{numArtifacts}</span>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className='text-red-400/80 text-[9px] tracking-[0.2em] uppercase w-full text-left px-1'>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit — same style as Resume button */}
          <div
            onClick={canSubmit ? handleSubmit : undefined}
            className={`w-full flex items-center justify-between px-5 py-3 border transition-all mt-1
              ${loading
                ? 'border-amber-500/40 bg-white/5 cursor-wait'
                : !canSubmit
                ? 'border-white/25 opacity-40 cursor-not-allowed'
                : 'border-white/25 hover:border-amber-500/60 hover:bg-white/5 cursor-pointer group'}`}
          >
            {loading ? (
              <>
                <span className='text-amber-400 text-sm tracking-widest uppercase'>Building Museum</span>
                <span className='w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping' />
              </>
            ) : (
              <>
                <span className='text-white/90 text-sm tracking-widest uppercase group-hover:text-amber-400 transition-colors'>Start Learning</span>
                <span className='text-white/25 text-[10px] tracking-wider group-hover:text-white/40 transition-colors'>Click to begin</span>
              </>
            )}
          </div>

          <div className='w-px h-16 bg-gradient-to-t from-transparent to-white/40 mt-12' />
        </motion.div>
      </div>
    </div>
  )
}
