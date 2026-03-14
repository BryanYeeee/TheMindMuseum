// components/ModelViewer.js
'use client'

import { Canvas } from '@react-three/fiber'
import {
  PointerLockControls,
  Environment,
  ContactShadows
} from '@react-three/drei'
import { Suspense } from 'react'
import Model from './Model'
import Controller from './Controller'
import * as THREE from 'three'
export default function ModelViewer () {
  return (
    <div style={{ width: '100%', height: '100vh', cursor: 'crosshair' }}>
      <Canvas
        shadows='basic' // Options: "basic", "percentage", "soft"
        camera={{ fov: 75, position: [0, 2.75, 5] }}
        onCreated={({ camera }) => {
          // Look at a specific point in your museum (X, Y, Z)
          // Set Y to 1.7 to keep the gaze level with the horizon
          camera.lookAt(new THREE.Vector3(0, 2.75, 0))
        }}
      >
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.6}
          scale={50}
          blur={2}
          far={4.5}
        />
        <Suspense fallback={null}>
          <Environment preset='city' environmentIntensity={0.35} />
          {/* Very low ambient light so the room isn't pitch black, just "dark" */}
          <ambientLight intensity={0.2} />
          {/* 2. Directional Light: The "Sun" (creates sharp shadows) */}
          <directionalLight
            position={[10, 20, 10]}
            intensity={3}
            castShadow
            shadow-mapSize={[2048, 2048]} // Higher res shadows
          />
          <fog attach='fog' args={['#050505', 1, 65]} />
          {/* 3. Point Light: The "Lightbulb" (Place this inside a room) */}
          <pointLight position={[0, 5, 0]} intensity={2} color='#ffcc77' />
          <Model url='/models/museum_interior/scene.gltf' />
          {/* Second Model: Rotated 180 degrees (Math.PI) and moved */}
          <Model
            url='/models/museum_interior/scene.gltf'
            position={[2.8, 0, 0]} // Move it back so the rooms connect or stay apart
            rotation={[0, Math.PI, 0]} // Rotate 180 degrees on the Y-axis
          />
          {/* Mouse for looking around */}
          <PointerLockControls />
          {/* WASD for walking */}
          <Controller />
        </Suspense>
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white' }}>
        Click the screen to lock mouse & use WASD to walk
      </div>
      <div className='text-4xl opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        +
      </div>
    </div>
  )
}
