// components/ModelViewer.js
"use client"; // Required for Next.js App Router

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import Model from './Model';

export default function ModelViewer({ url }) {
  return (
    <div style={{ width: '100%', height: '500px', background: '#111' }}>
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          
          {/* Stage provides preset lighting and environment */}
          <Stage environment="city" intensity={0.6}>
            <Model url={url} />
          </Stage>

          {/* Allows user to rotate/zoom the model */}
          <OrbitControls 
            makeDefault 
            enablePan={true} 
            enableZoom={true} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 1.75} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
}