"use client";
import { memo, useMemo } from "react";
import Model from "./Model";
import { exhibitData } from "@/constants/ExhibitData";
import { triggerData } from "@/constants/TriggerData";
import { npcData } from "@/constants/NpcData";

// const MAP = [
//   [0, 4],
//   [1, 2],
//   [1, 2],
//   [1, 2],
//   [0, 3]
// ]

const L = 34.5;
const W = 20;

const ROTATIONS = {
    1: [0, 0, 0],
    2: [0, Math.PI, 0],
    3: [0, Math.PI / 2, 0],
    4: [0, -Math.PI / 2, 0],
};
const POSITIONS = (xIndex, zIndex) => {
    return {
        1: [xIndex * L, 0, zIndex * W],
        2: [xIndex * L - L, 0, zIndex * W - W],
        3: [xIndex * L - L + W / 2, 0, zIndex * W - W],
        4: [xIndex * L - L - W / 2, 0, zIndex * W],
    };
};

const MODEL = (xIndex, zIndex) => {
    return {
        1: "/models/museum_no_paintings_left_side_hole.glb",
        2: "/models/museum_no_paintings_left_side_hole.glb",
        3: "/models/museum_no_painting_full.glb",
        4: "/models/museum_no_painting_full.glb",
    };
};

function Tileset({
    map = [],
    liveExhibits = [],
    setDialogue,
    openExhibit,
    setNpcDialogue,
}) {
    return (
        <>
            {map.map((row, zIndex) =>
                row.map((tileType, xIndex) => {
                    if (tileType === 0) return null;
                    const segmentID = `tile-${zIndex}-${xIndex}`;

                    return (
                        <MemoTile
                            key={segmentID}
                            segmentID={segmentID}
                            tileType={tileType}
                            xIndex={xIndex}
                            zIndex={zIndex}
                            setDialogue={setDialogue}
                            setNpcDialogue={setNpcDialogue}
                            openExhibit={openExhibit}
                            liveExhibits={liveExhibits}
                        />
                    );
                }),
            )}
        </>
    );
}

// Each tile memoises its own filtered exhibits so it only re-renders when
// ITS exhibits actually change, not when a different tile's exhibit updates.
const MemoTile = memo(function MemoTile({
    segmentID,
    tileType,
    xIndex,
    zIndex,
    setDialogue,
    setNpcDialogue,
    openExhibit,
    liveExhibits,
}) {
    const exhibits = useMemo(
        () =>
            liveExhibits.filter(
                (ex) => ex.segmentID === segmentID && ex.status === "complete",
            ),
        [liveExhibits, segmentID],
    );
    const npcs = useMemo(
        () => npcData.filter((npc) => npc.segmentID === segmentID),
        [segmentID],
    );
    const triggers = useMemo(
        () => triggerData.filter((tr) => tr.segmentID === segmentID),
        [segmentID],
    );

    return (
        <Model
            url={MODEL(xIndex, zIndex)[tileType]}
            position={POSITIONS(xIndex, zIndex)[tileType]}
            rotation={ROTATIONS[tileType]}
            setDialogue={setDialogue}
            setNpcDialogue={setNpcDialogue}
            openExhibit={openExhibit}
            mirrored={zIndex % 2 == 0}
            npcData={npcs}
            exhibits={exhibits}
            triggers={triggers}
        />
    );
});

export default memo(Tileset);
