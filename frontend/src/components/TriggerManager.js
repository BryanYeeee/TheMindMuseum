// components/TriggerManager.js
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useRef } from 'react'

export default function TriggerManager ({
  data,
  onTriggerEnter,
  onTriggerExit
}) {
  const { camera } = useThree()
  const activeTrigger = useRef(null)

  useFrame(() => {
    let found = null

    data.forEach(trigger => {
      const [tx, ty, tz] = trigger.position
      const { x, z } = camera.position

      // Use width and depth, or default to a standard size
      const hW = (trigger.width || 2) / 2
      const hD = (trigger.depth || 2) / 2

      if (Math.abs(x - tx) < hW && Math.abs(z - tz) < hD) {
        found = trigger
      }
    })

    if (found && activeTrigger.current !== found.id) {
      activeTrigger.current = found.id
      onTriggerEnter(found.message)
    } else if (!found && activeTrigger.current !== null) {
      activeTrigger.current = null
      onTriggerExit()
    }
  })

  return (
    <>
      {data.map(trigger => (
        <mesh key={trigger.id} position={trigger.position}>
          <boxGeometry
            args={[
              trigger.width || trigger.radius * 2,
              trigger.height || 4, // Visual height
              trigger.depth || trigger.radius * 2
            ]}
          />
          <meshBasicMaterial
            color='#00ffff'
            transparent={true}
            opacity={0.5}
            depthWrite={false}
            depthTest={true}
            renderOrder={10}
          />
        </mesh>
      ))}
    </>
  )
}
