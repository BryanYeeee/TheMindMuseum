"use client";
import { useRef, useEffect, useMemo } from "react";
import { useFBX, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

// Pool of visitor models
const VISITOR_MODELS = [
    "/models/happy_joe.fbx",
    "/models/lebron.fbx",
    "/models/happy_guy.fbx",
    "/models/happy_person.fbx",
    // '/models/yes.fbx',
    "/models/talking.fbx",
    "/models/jody.fbx",
];

export default function NPCModel({
    url, // Original URL from npcData
    name, // Added name prop to identify receptionist
    position = [0, 0, 0],
    rotation = [0, 2, 0],
    scale = 1,
    idleAnim = "mixamo.com",
}) {
    const group = useRef();

    // 1. Determine final URL: If Receptionist, use provided URL, else pick random
    const finalUrl = useMemo(() => {
        if (name === "Receptionist") return "/models/reception.fbx";
        const randomIndex = Math.floor(Math.random() * VISITOR_MODELS.length);
        return VISITOR_MODELS[randomIndex];
    }, [name, url]);

    // 2. Load the determined FBX
    const fbx = useFBX(finalUrl);

    const { clone, clonedAnims } = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        const clonedAnims = fbx.animations.map((c) => c.clone());

        clone.traverse((child) => {
            if (child.isMesh) {
                child.raycast = () => {};
                // Optional: Ensure shadows work on clones
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return { clone, clonedAnims };
    }, [fbx]);

    const { actions } = useAnimations(clonedAnims, group);

    useEffect(() => {
        const idle = actions[idleAnim] || Object.values(actions)[0]; // Fallback to first animation
        if (!idle) return;
        idle.reset().fadeIn(0.5).play();
        return () => idle.fadeOut(0.5);
    }, [actions, idleAnim]);

    return (
        <group
            ref={group}
            position={position}
            rotation={rotation}
            scale={typeof scale === "number" ? [scale, scale, scale] : scale}>
            <primitive object={clone} />
        </group>
    );
}
