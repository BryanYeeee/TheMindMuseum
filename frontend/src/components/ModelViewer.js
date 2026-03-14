'use client'

import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense, useState } from 'react'
import Model from './Model'
import Controller from './Controller'
import * as THREE from 'three'
import CoordsLogger from './CoordsLogger'
import TriggerManager from './TriggerManager'
import UI from './UI'

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

export default function ModelViewer () {
  const [lastCoords, setLastCoords] = useState('Click a surface to get coords')
  const [dialogue, setDialogue] = useState(null)
  const [isLocked, setIsLocked] = useState(false)

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
          <pointLight position={[0, 5, 0]} intensity={2} color='#ffcc77' />

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

          <TriggerManager
            data={triggerData}
            onTriggerEnter={msg => setDialogue(msg)}
            onTriggerExit={() => setDialogue(null)}
          />

          <PointerLockControls
            onLock={() => setIsLocked(true)}
            onUnlock={() => setIsLocked(false)}
          />
          <Controller />
          <CoordsLogger onHit={setLastCoords} />
        </Suspense>
      </Canvas>
      <UI lastCoords={lastCoords} dialogue={dialogue} isLocked={isLocked} />
    </div>
  )
}
