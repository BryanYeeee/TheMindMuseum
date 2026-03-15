"use client";
import { useTexture } from "@react-three/drei";
import { useState } from "react";
import * as THREE from "three";

const BASE_URL = "http://localhost:5001";

export default function PaintingModel({
    image_url,
    position,
    rotation,
    scale = 1,
    onInteract,
}) {
    const fullUrl = image_url
        ? `${BASE_URL}${image_url}`
        : "/images/placeholder.png";
    const texture = useTexture(fullUrl);
    const [hovered, setHovered] = useState(false);

    const width = 2.8;
    const height = 1.8;

    return (
        <group
            position={position}
            rotation={rotation}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                if (onInteract) onInteract();
            }}>
            <group position={[width / 2, height / 2, 0]}>
                {/* Frame / Backing - Thinned slightly to accommodate two images */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[width, height, 0.03]} />
                    <meshStandardMaterial color="#0a0a0a" />
                </mesh>

                {/* FRONT Image (facing Z+) */}
                <mesh scale={scale} position={[0, 0, 0.016]}>
                    <planeGeometry args={[width, height]} />
                    <meshStandardMaterial map={texture} transparent />
                </mesh>

                {/* BACK Image (facing Z-) */}
                <mesh
                    scale={scale}
                    position={[0, 0, -0.016]}
                    rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[width, height]} />
                    <meshStandardMaterial map={texture} transparent />
                </mesh>

                {/* Gallery Light (Relative to center of art) */}
                {hovered && (
                    <>
                        {/* Front Light */}
                        <spotLight
                            position={[0, height, 2]}
                            angle={0.5}
                            penumbra={1}
                            intensity={5}
                            color="#ffb100"
                        />
                        {/* Back Light */}
                        <spotLight
                            position={[0, height, -2]}
                            angle={0.5}
                            penumbra={1}
                            intensity={5}
                            color="#ffb100"
                        />
                    </>
                )}
            </group>
        </group>
    );
}
