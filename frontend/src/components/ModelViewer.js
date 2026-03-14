'use client'

import { Canvas } from '@react-three/fiber'
import {
  PointerLockControls,
  Environment,
  ContactShadows
} from '@react-three/drei'
import { Suspense, useState } from 'react'
import Model from './Model'
import Controller from './Controller'
import * as THREE from 'three'
import CoordsLogger from './CoordsLogger'
export default function ModelViewer () {
  const [lastCoords, setLastCoords] = useState('Click a surface to get coords')
  return (
    <div style={{ width: '100%', height: '100vh', cursor: 'crosshair' }}>
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '15px',
          background: 'rgba(0,0,0,0.8)',
          color: '#00ff00', // Neon green for that "dev" look
          fontFamily: 'monospace',
          borderRadius: '8px',
          zIndex: 100,
          pointerEvents: 'none', // Allows clicks to pass through to the canvas
          border: '1px solid #333'
        }}
      >
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>
          LAST CLICKED COORDS:
        </div>
        {lastCoords}
      </div>
      <Canvas
        shadows='basic' // Options: "basic", "percentage", "soft"
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
          {/* A small red glowing sphere that moves to your last click */}
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

          <PointerLockControls />
          <Controller />
          <CoordsLogger onHit={setLastCoords} />
        </Suspense>
      </Canvas>
      <div className='absolute top-5 left-1/2 -translate-x-1/2'>
        Click the screen to lock mouse & use WASD to walk
      </div>
      <div className='text-4xl opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        +
      </div>
    </div>
  )
}
