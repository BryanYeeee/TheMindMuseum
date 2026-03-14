'use client'
import { useGLTF } from '@react-three/drei'
import { useRef, useState } from 'react'

export default function ObjectModel({ url, position, rotation, scale, onInteract }) {
  const { scene } = url ? useGLTF(url) : { scene: null }
  const [hovered, setHovered] = useState(false)

  return (
    <group 
      position={position} 
      rotation={rotation} 
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (onInteract) onInteract()
      }}
    >
       {/* Hover Light Logic */}
       {hovered && <pointLight position={[0, 2, 0]} intensity={1.5} color="#ffb100" />}
       
       {url ? <primitive object={scene.clone()} /> : <mesh><boxGeometry /></mesh>}
    </group>
  )
}
useGLTF.preload = (url) => useGLTF.preload(url)