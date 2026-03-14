'use client'
import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'

function RotatingMesh ({ color }) {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.6
    ref.current.rotation.x += delta * 0.15
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  )
}

export default function ExhibitViewer ({ exhibit, onClose, onResume }) {
  useEffect(() => {
    if (!exhibit) return
    const handleKey = (e) => {
      if (e.code === 'KeyE') {
        // E closes and stays in game — pointer lock is still active
        onClose()
      } else if (e.code === 'Escape') {
        // ESC: browser forces pointer unlock, so just close — pause screen will appear
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [exhibit, onClose, onResume])

  return (
    <AnimatePresence>
      {exhibit && (
        <motion.div
          key='exhibit'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className='fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex font-lora text-white select-none'
        >
          {/* scanline overlay */}
          <div className='absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.06)_2px,rgba(0,0,0,0.06)_4px)] pointer-events-none' />

          {/* Left — rotating 3D model */}
          <div className='w-1/2 h-full'>
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <directionalLight position={[5, 8, 5]} intensity={2.5} />
              <pointLight position={[-4, -4, -4]} intensity={0.8} color='#f59e0b' />
              <RotatingMesh color={exhibit.color ?? '#cc4444'} />
            </Canvas>
          </div>

          {/* Divider */}
          <div className='w-px bg-white/10 my-16' />

          {/* Right — info */}
          <motion.div
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className='w-1/2 h-full flex flex-col justify-center px-16'
          >
            <p className='text-amber-500 text-[9px] tracking-[0.3em] uppercase mb-5'>Exhibit</p>
            <h2 className='text-4xl mb-4 leading-snug'>{exhibit.name}</h2>
            <div className='w-8 h-px bg-white/20 mb-6' />
            <p className='text-white/55 text-sm leading-relaxed max-w-sm'>{exhibit.description}</p>
          </motion.div>

          {/* Close hints */}
          <p className='absolute bottom-8 right-10 text-white/20 text-[9px] tracking-[0.2em] uppercase'>
            E · Return to Game
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
