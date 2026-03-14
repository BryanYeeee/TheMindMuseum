// components/Controls.js
import { useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

const NPC_RADIUS = 0.8;
export default function Controller({ speed = 0.1, sprintMultiplier = 2, isLocked = false, npcPositions = []  }) {
  const { camera } = useThree();
  const [keys, setKeys] = useState({});

  // Track key presses
  useEffect(() => {
    const handleDown = (e) => setKeys((prev) => ({ ...prev, [e.code]: true }));
    const handleUp = (e) => setKeys((prev) => ({ ...prev, [e.code]: false }));
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  useFrame(() => {
    if (!isLocked) return;

    // Determine current speed based on Shift key
    const currentSpeed = keys.ShiftLeft
      ? speed * sprintMultiplier 
      : keys.ShiftRight 
      ? speed * sprintMultiplier * 3
      : speed;

    const direction = new Vector3();
    const frontVector = new Vector3(0, 0, Number(keys.KeyS || 0) - Number(keys.KeyW || 0));
    const sideVector = new Vector3(Number(keys.KeyA || 0) - Number(keys.KeyD || 0), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(currentSpeed) // Apply the calculated speed
      .applyQuaternion(camera.quaternion);

    // Check each axis separately so the player can slide along an NPC
    const nextX = camera.position.x + direction.x;
    const nextZ = camera.position.z + direction.z;

    const blockedX = npcPositions.some(([nx, , nz]) => {
      const dx = nextX - nx, dz = camera.position.z - nz;
      return Math.sqrt(dx * dx + dz * dz) < NPC_RADIUS;
    });
    const blockedZ = npcPositions.some(([nx, , nz]) => {
      const dx = camera.position.x - nx, dz = nextZ - nz;
      return Math.sqrt(dx * dx + dz * dz) < NPC_RADIUS;
    });

    if (!blockedX) camera.position.x = nextX;
    if (!blockedZ) camera.position.z = nextZ;
  });

  return null;
}