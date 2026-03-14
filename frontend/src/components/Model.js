// components/Model.js
import { useGLTF } from '@react-three/drei';

export default function Model({ url }) {
  // useGLTF handles loading and caching automatically
  const { scene } = useGLTF(url);
  
  return <primitive object={scene} scale={1.5} position={[0, 0, 0]} />;
}

// Pre-loading helps avoid "popping" during navigation
useGLTF.preload('/scene.gltf');