"use client";

import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import {
    Suspense,
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import Controller from "./Controller";
import * as THREE from "three";
import CoordsLogger from "./CoordsLogger";
import UI from "./UI";
import TableLoader from "./TableLoader";
import ExhibitViewer from "./ExhibitViewer";
import { npcData } from "@/constants/NpcData";
import NPCHitbox from "./NpcHitbox";
import Tileset from "./TileSet";
import MuseumLoader from "./MuseumLoader";
import { Rubik_80s_Fade } from "next/font/google";

// 🔴 DEBUG ONLY — DELETE AFTER TESTING
const _debugLines = [];
function _dlog(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    _debugLines.push(line);
    console.log("[ARTIFACT-DEBUG]", msg);
}
function _dflush() {
    if (_debugLines.length === 0) return;
    const lines = _debugLines.splice(0);
    fetch("http://localhost:5001/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
    }).catch((e) => console.warn("debug flush failed", e));
}
// 🔴 END DEBUG

const EXHIBIT_POS = {
    1: [-21.5, 2.15, -17.2],
    2: [-14.82, 2.9, -19.06],
    3: [-6.79, 2.9, -19.06],
    4: [-6.79, 2.9, -0.94],
    5: [-14.82, 2.9, -0.94],
    6: [-21.5, 2.15, -2.8],
    7: [-13.36, 1.76, -10],
};

export default function ModelViewer({
    numArtifacts,
    numPaintings,
    initialArtifactData,
    initialPaintingData,
    pdfKey,
}) {
    const [liveExhibits, setLiveExhibits] = useState([]);
    const [livePaintings, setLivePaintings] = useState([]);

    // 🔴 DEBUG ONLY — DELETE AFTER TESTING
    useEffect(() => {
        _dlog(
            `ModelViewer MOUNTED numArtifacts=${numArtifacts} numPaintings=${numPaintings} pdfKey=${pdfKey} job_id=${initialArtifactData?.job_id ?? "null"} artifactCount=${initialArtifactData?.artifacts?.length ?? 0}`,
        );
        _dflush();
    }, []);

    // Each tile pair (2 columns) holds 6 artifact spots (3 per tile) and
    // 8 painting spots (4 per tile).  We need enough middle rows for both.
    const artifactTiles = Math.ceil(numArtifacts / 6);
    const paintingTiles = Math.ceil(numPaintings / 8);
    const midSectionCount = Math.max(artifactTiles, paintingTiles, 1);
    const dynamicMap = [
        [0, 4], // Entrance/Top
        ...Array(midSectionCount).fill([1, 2]), // Middle segments repeat
        [0, 3], // Exit/Bottom
    ];

    useEffect(() => {
        if (!initialArtifactData) return;

        // Seed liveExhibits with the initial artifact list so SSE updates can match by id
        const seeded = initialArtifactData.artifacts.map((a, i) => {
            const { segmentID, position, posKey } = getPlacement(i);
            return {
                ...a,
                segmentID,
                position,
                posKey,
                isLive: false,
                type: "artifact",
            };
        });
        _dlog(
            `SEEDING liveExhibits with ${seeded.length} artifacts: ${JSON.stringify(seeded.map((s) => s.id))}`,
        ); // 🔴 DEBUG
        setLiveExhibits(seeded);

        _dlog(
            `SSE CONNECTING url=http://localhost:5001/artifacts/stream/${initialArtifactData.job_id}`,
        ); // 🔴 DEBUG
        _dflush(); // 🔴 DEBUG
        const eventSource = new EventSource(
            `http://localhost:5001/artifacts/stream/${initialArtifactData.job_id}`,
        );
        eventSource.addEventListener("artifact_update", (event) => {
            const updatedArtifact = JSON.parse(event.data);
            setLiveExhibits((prev) => {
                _dlog(
                    `SSE artifact_update id=${updatedArtifact.id} name="${updatedArtifact.name}" status=${updatedArtifact.status} image=${updatedArtifact.image_url ?? "none"} model=${updatedArtifact.model_url ?? "none"} prevCount=${prev.length} matchIdx=${prev.findIndex((ex) => ex.id === updatedArtifact.id)}`,
                ); // 🔴 DEBUG
                const artifactIndex = prev.findIndex(
                    (ex) => ex.id === updatedArtifact.id,
                );

                if (artifactIndex === -1) return prev;
                const { segmentID, position, posKey } =
                    getPlacement(artifactIndex);
                _dlog(
                    `Placement idx=${artifactIndex} segment=${segmentID} posKey=${posKey} pos=[${position}]`,
                ); // 🔴 DEBUG
                _dflush(); // 🔴 DEBUG
                return prev.map((ex, i) =>
                    i === artifactIndex
                        ? {
                              ...ex,
                              ...updatedArtifact,
                              segmentID,
                              position,
                              posKey,
                              isLive: true,
                              type: "artifact",
                          }
                        : ex,
                );
            });
        });

        // 🔴 DEBUG ONLY — DELETE AFTER TESTING
        eventSource.addEventListener("job_complete", (event) => {
            _dlog(`SSE job_complete: ${event.data}`);
            _dflush();
            eventSource.close();
            _dlog("SSE CLOSED reason=job_complete");
        });
        eventSource.onerror = (event) => {
            _dlog(`SSE ERROR readyState=${event?.target?.readyState}`);
            _dflush();
            eventSource.close();
            _dlog("SSE CLOSED reason=onerror");
        };

        return () => {
            eventSource.close();
            _dlog("SSE CLOSED reason=unmount");
            _dflush();
        }; // 🔴 DEBUG
    }, [initialArtifactData?.job_id]);

    useEffect(() => {
        if (!initialPaintingData) return;

        // 1. Seed livePaintings with initial data (using wall positions)
        const seededPaintings = initialPaintingData.paintings.map((p, i) => {
            const { segmentID, position, posKey } = getPlacementPainting(i);
            return {
                ...p,
                segmentID,
                position,
                posKey,
                isLive: false,
                type: "painting", // Ensure they render as frames, not 3D models
            };
        });

        _dlog(`SEEDING livePaintings with ${seededPaintings.length} items`);
        setLivePaintings(seededPaintings);

        // 2. Open Painting SSE Stream
        const paintingStreamUrl = `http://localhost:5001/paintings/stream/${initialPaintingData.job_id}`;
        _dlog(`SSE PAINTING CONNECTING: ${paintingStreamUrl}`);

        const eventSource = new EventSource(paintingStreamUrl);

        eventSource.addEventListener("painting_update", (event) => {
            const updatedPainting = JSON.parse(event.data);

            setLivePaintings((prev) => {
                const paintingIndex = prev.findIndex(
                    (p) => p.id === updatedPainting.id,
                );

                if (paintingIndex === -1) return prev;

                const { segmentID, position, posKey } =
                    getPlacementPainting(paintingIndex);

                _dlog(
                    `SSE painting_update id=${updatedPainting.id} status=${updatedPainting.status}`,
                );
                _dflush();

                return prev.map((p, i) =>
                    i === paintingIndex
                        ? {
                              ...p,
                              ...updatedPainting,
                              segmentID,
                              position,
                              posKey,
                              isLive: true,
                              type: "painting",
                          }
                        : p,
                );
            });
        });

        eventSource.onerror = (event) => {
            _dlog(`SSE PAINTING ERROR readyState=${event?.target?.readyState}`);
            eventSource.close();
        };

        return () => {
            eventSource.close();
            _dlog("SSE PAINTING CLOSED reason=unmount");
            _dflush();
        };
    }, [initialPaintingData?.job_id]);

    const [lastCoords, setLastCoords] = useState(
        "Click a surface to get coords",
    );
    const [dialogue, setDialogue] = useState(null);
    const [npcDialogue, setNpcDialogue] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [exhibit, setExhibit] = useState(null);
    const [receptionistOpen, setReceptionistOpen] = useState(false);
    const controlsRef = useRef();
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = new Audio("/music.mp3");
        audio.loop = true;
        audio.volume = 0.4;
        audioRef.current = audio;
        return () => {
            audio.pause();
            audio.src = "";
        };
    }, []);

    // Close dialogue on E key
    useEffect(() => {
        const handleKey = (e) => {
            if (e.code === "Tab") {
                e.preventDefault();
                setNpcDialogue(null);
                setDialogue(null);
                if (receptionistOpen) {
                    setReceptionistOpen(false);
                    controlsRef.current?.lock();
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [receptionistOpen]);

    // Start music on first pointer lock (browsers require a user gesture)
    useEffect(() => {
        if (isLocked && audioRef.current?.paused)
            audioRef.current.play().catch(() => {});
    }, [isLocked]);

    // Don't exit pointer lock when opening — keeps the lock so E can close and return directly
    const openExhibit = (data) => setExhibit(data);

    // Clear NPC dialogue when the player pauses (pointer unlock)
    useEffect(() => {
        if (!isLocked && !receptionistOpen) setNpcDialogue(null);
    }, [isLocked, receptionistOpen]);

    // Memoize combined exhibits so Tileset doesn't get a new array ref every render
    const allExhibits = useMemo(
        () => [...liveExhibits, ...livePaintings],
        [liveExhibits, livePaintings],
    );

    // Stable callback refs so Tileset child tiles don't re-render on unrelated state changes
    const stableSetDialogue = useCallback((msg) => {
        setDialogue(msg);
        if (msg) setNpcDialogue(null);
    }, []);

    const handleNpcClick = useCallback((npc) => {
        if (npc.name === "Receptionist") {
            setNpcDialogue(null);
            setDialogue(null);
            setReceptionistOpen(true);
            controlsRef.current?.unlock();
        } else {
            setNpcDialogue({ name: npc.name, text: npc.dialogue });
            setDialogue(null);
        }
    }, []);

    return (
        <div style={{ width: "100%", height: "100vh", cursor: "crosshair" }}>
            <MuseumLoader />
            <Canvas
                shadows="basic"
                camera={{ fov: 75, position: [0, 2.75, 5] }}
                onCreated={({ camera }) => {
                    camera.lookAt(new THREE.Vector3(0, 2.75, 0));
                }}>
                <Suspense fallback={null}>
                    <Environment preset="city" environmentIntensity={0.35} />
                    {/* <ambientLight intensity={0.2} /> */}
                    <directionalLight
                        position={[10, 20, 10]}
                        intensity={2.5}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                    />
                    <fog attach="fog" args={["#050505", 1, 65]} />
                    <pointLight
                        position={[0, 20, -20]}
                        intensity={2000}
                        color="#ffffff"
                    />

                    <Tileset
                        map={dynamicMap}
                        setDialogue={stableSetDialogue}
                        setNpcDialogue={handleNpcClick}
                        liveExhibits={allExhibits}
                        openExhibit={openExhibit}
                    />

                    {lastCoords !== "Click a surface to get coords" && (
                        <mesh
                            position={eval(
                                lastCoords
                                    .replace("position={", "")
                                    .replace("}", ""),
                            )}>
                            <sphereGeometry args={[0.1, 16, 16]} />
                            <meshBasicMaterial color="red" />
                        </mesh>
                    )}

                    <TableLoader
                        url={"/models/reception_counter/scene.gltf"}
                        position={[-0.85, 1.9, -5]}
                        rotation={[0, 2 * Math.PI, 0]}
                        scale={1.5}
                    />
                    <PointerLockControls
                        ref={controlsRef}
                        enabled={!exhibit && !receptionistOpen}
                        onLock={() => setIsLocked(true)}
                        onUnlock={() => setIsLocked(false)}
                    />
                    <Controller
                        isLocked={isLocked && !exhibit && !receptionistOpen}
                        npcPositions={npcData.map((n) => n.position)}
                    />
                    <CoordsLogger onHit={setLastCoords} />
                </Suspense>
            </Canvas>
            <UI
                lastCoords={lastCoords}
                dialogue={dialogue}
                npcDialogue={npcDialogue}
                isLocked={isLocked}
                onResume={() => controlsRef.current?.lock()}
                receptionistOpen={receptionistOpen}
                onCloseReceptionist={() => {
                    setReceptionistOpen(false);
                    controlsRef.current?.lock();
                }}
            />
            <ExhibitViewer
                exhibit={exhibit}
                onClose={() => setExhibit(null)}
                onResume={() => controlsRef.current?.lock()}
            />
        </div>
    );
}

const getPlacement = (index) => {
    const spots = [1, 6, 7]; // The specific POS keys you requested
    const spotsPerTile = spots.length;

    // Determine which middle row/column it belongs to
    const tileIndex = Math.floor(index / spotsPerTile);
    const z = Math.floor(tileIndex / 2) + 1; // Start from row 1
    const x = tileIndex % 2; // Alternates between 0 and 1

    const segmentID = `tile-${z}-${x}`;
    const posKey = spots[index % spotsPerTile];

    return { segmentID, position: EXHIBIT_POS[posKey], posKey };
};

const getPlacementPainting = (index) => {
    const spots = [2, 3, 4, 5]; // The specific POS keys you requested
    const spotsPerTile = spots.length;

    // Determine which middle row/column it belongs to
    const tileIndex = Math.floor(index / spotsPerTile);
    const z = Math.floor(tileIndex / 2) + 1; // Start from row 1
    const x = tileIndex % 2; // Alternates between 0 and 1

    const segmentID = `tile-${z}-${x}`;
    const posKey = spots[index % spotsPerTile];

    return { segmentID, position: EXHIBIT_POS[posKey], posKey };
};
