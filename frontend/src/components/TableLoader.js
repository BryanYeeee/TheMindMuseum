"use client";
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

/**
 * StaticModel
 *
 * Props:
 *   url       – .gltf or .glb file path
 *   position  – [x, y, z]
 *   rotation  – [x, y, z] in radians
 *   scale     – number or [x, y, z]
 */
export default function TableLoader({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(url);

  const clone = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) child.raycast = () => {};
    });
    return clone;
  }, [scene]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    >
      <primitive object={clone} />
    </group>
  );
}

TableLoader.preload = (url) => useGLTF.preload(url);