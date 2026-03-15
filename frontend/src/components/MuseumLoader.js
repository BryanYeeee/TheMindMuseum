'use client'
import { useProgress } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function MuseumLoader() {
  const { active, progress } = useProgress()
  const [show, setShow] = useState(true)

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
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center font-lora text-white select-none"
        >
          {/* Background image — same as landing page */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="/images/museum.png"
              alt=""
              className="absolute object-cover opacity-80"
              style={{ width: '115%', height: '115%', top: '-7.5%', left: '-7.5%' }}
            />
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#050505]/70" />

          {/* Scanline overlay */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.08)_2px,rgba(0,0,0,0.08)_4px)] pointer-events-none" />

          {/* Progress */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-64">
            <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <span className="text-white/40 text-[9px] tracking-[0.3em] uppercase">
              Loading...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
