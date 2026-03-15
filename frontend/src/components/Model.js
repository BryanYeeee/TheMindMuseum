"use client";
import { useGLTF, useTexture } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import ObjectModel from "./ObjectModel";
import PaintingModel from "./PaintingModel";
import NPCModel from "./NpcModel";
import NPCHitbox from "./NpcHitbox";

export default function Model({
    url,
    exhibits = [],
    triggers = [],
    npcData = [],
    setDialogue,
    setNpcDialogue,
    openExhibit,
    mirrored = true,
    ...props
}) {
    const { scene } = useGLTF(url);
    const { scene: threeScene, camera } = useThree();
    const bg = useTexture("/images/sky.png");
    const clonedScene = useMemo(() => {
        const clone = scene.clone();
        if (mirrored) {
            clone.traverse((child) => {
                if (child.isMesh) {
                    // Flip the winding order so lighting works on mirrored faces
                    child.material = child.material.clone();
                    child.material.side = THREE.FrontSide;
                    // If the model looks inside-out, try: child.material.side = THREE.BackSide
                }
            });
        }
        return clone;
    }, [scene, mirrored]);
    const groupRef = useRef();
    const activeTriggerId = useRef(null);

    useEffect(() => {
        if (bg) {
            bg.encoding = 3001;
            threeScene.background = bg;
        }
    }, [bg, threeScene]);

    useFrame(() => {
        if (!groupRef.current || !triggers.length) return;

        let foundTrigger = null;

        // Convert global camera position to the Model's local coordinate system
        const localPlayerPos = new THREE.Vector3().copy(camera.position);
        groupRef.current.worldToLocal(localPlayerPos);

        triggers.forEach((trigger) => {
            const [tx, ty, tz] = trigger.position;
            const hW = (trigger.width || 2) / 2;
            const hD = (trigger.depth || 2) / 2;

            // Collision check happens in LOCAL space
            if (
                Math.abs(localPlayerPos.x - tx) < hW &&
                Math.abs(localPlayerPos.z - tz) < hD
            ) {
                foundTrigger = trigger;
            }
        });

        if (foundTrigger && activeTriggerId.current !== foundTrigger.id) {
            activeTriggerId.current = foundTrigger.id;
            setDialogue(foundTrigger.message);
        } else if (!foundTrigger && activeTriggerId.current !== null) {
            activeTriggerId.current = null;
            setDialogue(null);
        }
    });

    return (
        <group ref={groupRef} {...props}>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#ff00ff" />
            </mesh>
            <mesh position={[-34.5, 0, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#ff00ff" />
            </mesh>
            <group
                position={[-1.4, 0, -10]}
                scale={mirrored ? [1, 1, -1] : [1, 1, 1]}>
                <primitive object={clonedScene} />
            </group>

            {/* Relative Exhibits */}
            {exhibits.map((exhibit, index) => {
                const onInteract = () => openExhibit(exhibit);

                return exhibit.type === "painting" ? (
                    <PaintingModel
                        key={`exhibit-${index}`}
                        image_url={exhibit.image_url}
                        position={exhibit.position}
                        posKey={exhibit.posKey}
                        rotation={exhibit.rotation || [0, 0, 0]}
                        scale={exhibit.scale || 1}
                        onInteract={onInteract}
                    />
                ) : (
                    <ObjectModel
                        key={`exhibit-${index}`}
                        model_url={exhibit.model_url}
                        position={exhibit.position}
                        posKey={exhibit.posKey}
                        rotation={exhibit.rotation || [0, 0, 0]}
                        scale={exhibit.scale || 1}
                        onInteract={onInteract}
                    />
                );
            })}

            {npcData.map((npc, index) => (
                <group
                    key={npc.url + npc.position.join(",") + `exhibit-${index}`}>
                    <NPCModel
                        url={npc.url}
                        name={npc.name}
                        position={npc.position}
                        rotation={npc.rotation}
                        scale={npc.scale}
                        idleAnim={npc.idleAnim}
                    />
                    <NPCHitbox
                        position={npc.position}
                        onDialogue={() => {
                            setNpcDialogue({
                                name: npc.name,
                                text: npc.dialogue,
                                index,
                            });
                            setDialogue(null);
                        }}
                    />
                </group>
            ))}

            {/* {triggers.map(trigger => (
          <mesh key={`debug-${trigger.id}`} position={trigger.position}>
            <boxGeometry
              args={[
                trigger.width || trigger.radius * 2,
                trigger.height || 4, // Visual height
                trigger.depth || trigger.radius * 2
              ]}
            />
            <meshBasicMaterial
              color='#00ffff'
              transparent={true}
              opacity={0.5}
              depthWrite={false}
              depthTest={true}
              renderOrder={10}
            />
          </mesh>
        ))} */}
        </group>
    );
}
