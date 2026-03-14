// components/Model.js
import { useGLTF, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useEffect } from 'react';

export default function Model({ url }) {
  // useGLTF handles loading and caching automatically
  
  const { scene } = useGLTF(url);
  const { scene: threeScene } = useThree();
  const bg = useTexture('/images/sky.png');
  useEffect(() => {
    threeScene.background = bg;
  }, [bg, threeScene]);
  
  return <>
   
    <primitive object={scene} scale={1.5} position={[0, 0, 0]} />;
  
  </>
}

// Pre-loading helps avoid "popping" during navigation
useGLTF.preload('/models/museum_interior/scene.gltf');