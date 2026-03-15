'use client'
import { useGLTF } from '@react-three/drei'
import { useState, useMemo } from 'react'
import * as THREE from 'three'

const BASE_URL = 'http://localhost:5001'

export default function ObjectModel({ model_url, position, rotation, scale = 1, onInteract, posKey }) {
  const [hovered, setHovered] = useState(false)
  const fullUrl = model_url ? `${BASE_URL}${model_url}` : null

  const { scene } = useGLTF(fullUrl || '') 

  // Apply specific rotation if the posKey is 6
  const finalRotation = useMemo(() => {
    if (posKey === 6) {
      // Add 180 degrees (Math.PI) to the existing Y rotation
      return [rotation[0], rotation[1] + Math.PI, rotation[2]]
    }
    return rotation
  }, [rotation, posKey])

  const processedScene = useMemo(() => {
    if (!scene) return null
    const clone = scene.clone()

    const box = new THREE.Box3().setFromObject(clone)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    // Center and ground the model
    clone.position.y = (size.y / 2) - center.y
    clone.position.x = -center.x
    clone.position.z = -center.z

    return clone
  }, [scene])

  return (
    <group 
      position={position} 
      rotation={finalRotation} // Uses the 180-degree flip if posKey is 6
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (onInteract) onInteract()
      }}
    >
      {hovered && (
        <pointLight position={[0, 1.5, 0]} intensity={15} color="#ffb100" distance={5} />
      )}
      
      {fullUrl && processedScene ? (
        <primitive object={processedScene} />
      ) : (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {/* Static Pedestal */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 32]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}