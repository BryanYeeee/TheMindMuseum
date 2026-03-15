'use client'
import { useProgress } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function MuseumLoader() {
  const { active, progress } = useProgress()
  const [show, setShow] = useState(true)

  // We add a slight delay after 100% to ensure the "flicker" looks intentional
  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => setShow(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [active, progress])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1, ease: "circIn" } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] text-white font-mono"
        >
          {/* Background Grid Decor */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <div className="relative flex flex-col items-center">
            {/* Glitchy Logo Area */}
            <motion.h2 
              animate={{ opacity: [1, 0.8, 1], x: [0, -2, 2, 0] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="text-xs tracking-[0.5em] uppercase text-amber-600 mb-8"
            >
              Loading Consciousness
            </motion.h2>

            {/* Progress Bar Container */}
            <div className="w-64 h-[2px] bg-white/10 relative overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>

            {/* Binary/Hex Readout */}
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-[10px] text-white/30 uppercase tracking-tighter">
                Synchronizing Tiles... {progress.toFixed(0)}%
              </span>
              <span className="text-[8px] text-white/10 uppercase font-mono">
                {Math.random().toString(16).toUpperCase().substring(2, 12)}
              </span>
            </div>
          </div>

          {/* Corner Decors */}
          <div className="absolute top-10 left-10 w-4 h-4 border-t border-l border-white/20" />
          <div className="absolute bottom-10 right-10 w-4 h-4 border-b border-r border-white/20" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}