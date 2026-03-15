'use client'
import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'

function ViewerObject ({ model_url }) {
  const ref = useRef()
  const { scene } = model_url ? useGLTF(`http://localhost:5001${model_url}`) : { scene: null }
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6
  })
  return (
    <group ref={ref}>
      {scene
        ? <primitive object={scene.clone()} />
        : (
          <mesh>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color='#888888' roughness={0.4} metalness={0.3} />
          </mesh>
        )}
    </group>
  )
}

function ViewerPainting ({ model_url }) {
  const texture = useTexture(`http://localhost:5001${model_url}` || '/images/placeholder.png')
  return (
    <mesh>
      <planeGeometry args={[2.52, 1.62]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

export default function ExhibitViewer ({ exhibit, onClose, onResume }) {
  useEffect(() => {
    if (!exhibit) return
    const handleKey = (e) => {
      if (e.code === 'Tab') {
        e.preventDefault()
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

          {/* Left — exhibit display */}
          <div className='w-1/2 h-full'>
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <directionalLight position={[5, 8, 5]} intensity={2.5} />
              <pointLight position={[-4, -4, -4]} intensity={0.8} color='#f59e0b' />
              {exhibit.type === 'painting'
                ? <ViewerPainting model_url={exhibit.model_url} />
                : <ViewerObject model_url={exhibit.model_url} />}
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
            Tab · Return to Game
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
