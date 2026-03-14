'use client'
import { useTexture } from '@react-three/drei'
import { useState } from 'react'

export default function PaintingModel({ url, position, rotation, scale = 1, onInteract }) {
  const texture = useTexture(url || '/images/placeholder.png')
  const [hovered, setHovered] = useState(false)

  // Dimensions defined here for easy adjustment
  const width = 2.8
  const height = 1.8

  return (
    <group 
      position={position} 
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (onInteract) onInteract()
      }}
    >
      {/* WRAPPER GROUP: 
          Offsets everything so the parent group's [0,0,0] 
          is at the bottom-left corner of the frame.
      */}
      <group position={[width / 2, height / 2, 0]}>
        
        {/* Frame / Backing */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[width, height, 0.02]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>

        {/* The Image (Centered on the frame) */}
        <mesh scale={scale}>
          <planeGeometry args={[width * 0.9, height * 0.9]} />
          <meshStandardMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-1} />
        </mesh>

        {/* Gallery Light (Relative to center of art) */}
        {hovered && (
          <spotLight
            position={[0, height, 2]}
            angle={0.5}
            penumbra={1}
            intensity={5}
            color="#ffb100"
            target-position={[0, 0, 0]}
          />
        )}
      </group>
    </group>
  )
}