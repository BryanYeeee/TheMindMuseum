'use client'

import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import Controller from './Controller'
import NPCModel from './NpcModel'
import * as THREE from 'three'
import CoordsLogger from './CoordsLogger'
import UI from './UI'
import TableLoader from './TableLoader'
import ExhibitViewer from './ExhibitViewer'
import { npcData } from '@/constants/NpcData'
import NPCHitbox from './NpcHitbox'
import Tileset from './TileSet'

export default function ModelViewer () {
  const [lastCoords, setLastCoords] = useState('Click a surface to get coords')
  const [dialogue, setDialogue] = useState(null)
  const [npcDialogue, setNpcDialogue] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [exhibit, setExhibit] = useState(null)
  const controlsRef = useRef()
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio('/music.mp3')
    audio.loop = true
    audio.volume = 0.4
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Close dialogue on E key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'KeyE') {
        setNpcDialogue(null)
        setDialogue(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Start music on first pointer lock (browsers require a user gesture)
  useEffect(() => {
    if (isLocked && audioRef.current?.paused) audioRef.current.play().catch(() => {})
  }, [isLocked])

  // Don't exit pointer lock when opening — keeps the lock so E can close and return directly
  const openExhibit = (data) => setExhibit(data)

  // Clear NPC dialogue when the player pauses (pointer unlock)
  useEffect(() => {
    if (!isLocked) setNpcDialogue(null)
  }, [isLocked])

  return (
    <div style={{ width: '100%', height: '100vh', cursor: 'crosshair' }}>
      <Canvas
        shadows='basic'
        camera={{ fov: 75, position: [0, 2.75, 5] }}
        onCreated={({ camera }) => {
          camera.lookAt(new THREE.Vector3(0, 2.75, 0))
        }}
      >
        <Suspense fallback={null}>
          <Environment preset='city' environmentIntensity={0.35} />
          <ambientLight intensity={0.2} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={3.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <fog attach='fog' args={['#050505', 1, 65]} />
          <pointLight
            position={[0, 20, -20]}
            intensity={2000}
            color='#ffffff'
          />

          <Tileset
            setDialogue={(msg) => { setDialogue(msg); if (msg) setNpcDialogue(null) }}
            openExhibit={openExhibit}
          />

          {lastCoords !== 'Click a surface to get coords' && (
            <mesh
              position={eval(
                lastCoords.replace('position={', '').replace('}', '')
              )}
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color='red' />
            </mesh>
          )}

          {npcData.map(npc => (
            <group key={npc.url + npc.position.join(',')}>
              <NPCModel
                url={npc.url}
                position={npc.position}
                rotation={npc.rotation}
                scale={npc.scale}
                idleAnim={npc.idleAnim}
              />
              <NPCHitbox
                position={npc.position}
                onDialogue={() => { setNpcDialogue({ name: npc.name, text: npc.dialogue }); setDialogue(null) }}
              />
            </group>
          ))}

          <TableLoader
            url={'/models/reception_counter/scene.gltf'}
            position={[-0.85, 1.9, -5]}
            rotation={[0, 2 * Math.PI, 0]}
            scale={1.5}
          />
          <PointerLockControls
            ref={controlsRef}
            enabled={!exhibit}
            onLock={() => setIsLocked(true)}
            onUnlock={() => setIsLocked(false)}
          />
          <Controller isLocked={isLocked && !exhibit} npcPositions={npcData.map(n => n.position)} />
          <CoordsLogger onHit={setLastCoords} />
        </Suspense>
      </Canvas>
      <UI lastCoords={lastCoords} dialogue={dialogue} npcDialogue={npcDialogue} isLocked={isLocked} onResume={() => controlsRef.current?.lock()} />
      <ExhibitViewer exhibit={exhibit} onClose={() => setExhibit(null)} onResume={() => controlsRef.current?.lock()} />
    </div>
  )
}
