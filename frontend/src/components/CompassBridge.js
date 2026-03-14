// CompassBridge.js
import { useFrame } from '@react-three/fiber'
import { Vector3 } from "three";

export default function CompassBridge ({ setHeading }) {
  // Inside CompassBridge.js or your useFrame loop:
  // Inside your Bridge component or useFrame loop:
  // Inside your Bridge component or useFrame loop:
  const vec = new Vector3()

  useFrame(({ camera }) => {
    // 1. Get the direction the camera is looking
    camera.getWorldDirection(vec)

    // 2. Calculate the angle on the XZ plane (ignoring up/down)
    // Math.atan2 returns radians. We invert the result to make Right = East.
    let angle = Math.atan2(vec.x, vec.z)

    // 3. Convert to degrees
    let degrees = (angle * 180) / Math.PI

    // 4. Offset by 180 so "Forward" (Negative Z) is 0/North
    // Then wrap to 0-360
    const heading = (((degrees + 180) % 360) + 360) % 360

    setHeading(Math.round(heading))
  })
  return null // This component renders nothing
}
