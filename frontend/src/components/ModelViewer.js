'use client'

import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import Model from './Model'
import Controller from './Controller'
import NPCModel from './NpcModel'
import * as THREE from 'three'
import CoordsLogger from './CoordsLogger'
import TriggerManager from './TriggerManager'
import UI from './UI'
import TableLoader from './TableLoader'
import ExhibitViewer from './ExhibitViewer'

const triggerData = [
  {
    id: 3,
    position: [10, 0, -5],
    width: 5,
    depth: 2,
    message: 'You are walking through the narrow corridor.'
  },
  {
    id: 4,
    position: [-10, 0, 5],
    width: 5,
    depth: 2,
    message: 'fuck you.'
  }
]

const npcData = [
  {
    url: '/models/happy_joe.fbx',
    position: [-5, 0, -7],
    rotation: [0, 2.5, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Joe',
    dialogue: "Ah, a visitor! Welcome to the Grand Gallery. I've been standing here for hours — these exhibits won't appreciate themselves, you know.",
  },
  {
    url: '/models/lebron.fbx',
    position: [-9.5, 0, 1.5],
    rotation: [0, 4, 0],
    scale: 0.0195,
    idleAnim: 'mixamo.com',
    name: 'Lebron',
    dialogue: "I'm not just here for the art. I'm here for the culture. Also, have you seen the gift shop?",
  },
  {
    url: '/models/happy_guy.fbx',
    position: [24.5, 0, 5.5],
    rotation: [0, -1, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Visitor',
    dialogue: "Incredible, isn't it? I've been coming here every weekend for the past three years. Still haven't figured out what that sculpture is supposed to mean.",
  },
  {
    url: '/models/happy_person.fbx',
    position: [8, 0, 5.5],
    rotation: [0, -0.5, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Gallery Guest',
    dialogue: "Oh! Sorry, I didn't see you there. I was just admiring the lighting in this room. Very dramatic, don't you think?",
  },
  {
    url: '/models/yes.fbx',
    position: [12.5, 0, -1.2],
    rotation: [0, -0.5, 0],
    scale: 0.0085,
    idleAnim: 'mixamo.com',
    name: 'Curator',
    dialogue: "Yes, yes, excellent eye. This piece dates back to... well, I don't actually know. The placard fell off last Tuesday.",
  },
  {
    url: '/models/talking.fbx',
    position: [12.5, 0, 1.2],
    rotation: [0, 3.5, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Art Critic',
    dialogue: "You see, the juxtaposition of form and negative space here creates a dialogue between the observer and the observed. Or maybe it's just a vase. Hard to say.",
  },
  {
    url: '/models/jody.fbx',
    position: [-21.5, 0, -5.5],
    rotation: [0, 2, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Jody',
    dialogue: "Psst — between you and me, the best exhibit is in the back room. They keep it hidden because it's too powerful.",
  },
  {
    url: '/models/reception.fbx',
    position: [1.2, 0, -6.75],
    rotation: [0, 0, 0],
    scale: 0.019,
    idleAnim: 'mixamo.com',
    name: 'Receptionist',
    dialogue: "Good day! Audio guides are $5, maps are free. Please don't touch the exhibits. Or the walls. Or the floor, if you can help it.",
  },
]

function NPCHitbox ({ position, onDialogue }) {
  return (
    <mesh
      position={[position[0], 1.0, position[2]]}
      onClick={(e) => { e.stopPropagation(); onDialogue() }}
    >
      <boxGeometry args={[1, 2, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

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
          <pointLight position={[0, 20, -20]} intensity={2000} color='#ffffff' />

          <Model url='/models/museum_interior/scene.gltf' />
          <Model
            url='/models/museum_interior/scene.gltf'
            position={[2.8, 0, 0]}
            rotation={[0, Math.PI, 0]}
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

          {npcData.map((npc) => (
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

          <mesh
            position={[5, 0.3, 0]}
            castShadow
            onClick={(e) => {
              e.stopPropagation()
              openExhibit({
                name: 'Red Ball',
                description: 'A perfectly round crimson sphere. Its surface is smooth to the touch, yet it carries an inexplicable weight — as if it has witnessed things no object should.',
                color: '#cc4444',
              })
            }}
          >
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color='#cc4444' roughness={0.4} metalness={0.2} />
          </mesh>

          <TableLoader
            url={'/models/reception_counter/scene.gltf'}
            position={[-0.85, 1.9, -5]}
            rotation={[0, 2*Math.PI, 0]}
            scale={1.5}
          />


          <TriggerManager
            data={triggerData}
            onTriggerEnter={msg => { setDialogue(msg); setNpcDialogue(null) }}
            onTriggerExit={() => setDialogue(null)}
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
