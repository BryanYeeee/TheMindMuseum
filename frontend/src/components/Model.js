import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

export default function Model({ url, ...props }) {
  const { scene } = useGLTF(url);
  
  // Clone the scene so each instance can have its own position/rotation
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return <primitive object={clonedScene} {...props} />;
}