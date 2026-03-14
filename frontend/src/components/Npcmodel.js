"use client";
import { useRef, useEffect, useMemo } from 'react';
import { useFBX, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

/**
 * NPCModel
 *
 * Props:
 *   url       – .fbx file path
 *   position  – [x, y, z]
 *   rotation  – [x, y, z] in radians
 *   scale     – number or [x, y, z]
 *   idleAnim  – animation clip name, default 'Idle'
 */
export default function NPCModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 2, 0],
  scale = 1,
  idleAnim = 'mixamo.com',
}) {
  const group = useRef();
  const fbx = useFBX(url);
  console.log(fbx.animations.map(a => a.name));

  const { clone, clonedAnims } = useMemo(() => {
    const clone = SkeletonUtils.clone(fbx);
    const clonedAnims = fbx.animations.map((c) => c.clone());

    // Disable raycasting on every mesh in the hierarchy
    clone.traverse((child) => {
      if (child.isMesh) child.raycast = () => {};
    });

    return { clone, clonedAnims };
  }, [fbx]);

  const { actions } = useAnimations(clonedAnims, group);

  useEffect(() => {
    const idle = actions[idleAnim];
    if (!idle) return;
    idle.setLoop(THREE.LoopRepeat);
    idle.reset().play();
  }, [actions, idleAnim]);

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    >
      <primitive object={clone} />
    </group>
  );
}