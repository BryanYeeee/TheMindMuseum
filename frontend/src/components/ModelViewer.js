// components/ModelViewer.js
"use client";

import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import { Suspense } from "react";
import Model from "./Model";
import Controller from "./Controller";

export default function ModelViewer() {
  return (
    <div style={{ width: "100%", height: "100vh", cursor: "crosshair" }}>
      <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 5] }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          
          <Model url="/models/museum_interior/scene.gltf" />
          
          {/* Mouse for looking around */}
          <PointerLockControls /> 
          
          {/* WASD for walking */}
          <Controller />
        </Suspense>
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white' }}>
        Click the screen to lock mouse & use WASD to walk
      </div>
    </div>
  );
}