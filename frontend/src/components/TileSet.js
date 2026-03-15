'use client'
import Model from './Model'
import { exhibitData } from '@/constants/ExhibitData'
import { triggerData } from '@/constants/TriggerData'
import { npcData } from '@/constants/NpcData'

const MAP = [
  // [0, 4],
  [1, 2],
  [1, 2],
  [1, 2],
  [0, 3]
]

const L = 34.5
const W = 20

const ROTATIONS = {
  1: [0, 0, 0],
  2: [0, Math.PI, 0],
  3: [0, Math.PI / 2, 0],
  4: [0, -Math.PI / 2, 0]
}
const POSITIONS = (xIndex, zIndex) => {
  return {
    1: [xIndex * L, 0, zIndex * W],
    2: [xIndex * L - L, 0, zIndex * W - W],
    3: [xIndex * L - L + W / 2, 0, zIndex * W - W],
    4: [xIndex * L - L - W / 2, 0, zIndex * W]
  }
}

const MODEL = (xIndex, zIndex) => {
  return {
    1: '/models/museum_no_paintings_left_side_hole.glb',
    2: '/models/museum_no_paintings_left_side_hole.glb',
    3: '/models/museum_no_painting_full.glb',
    4: '/models/museum_no_painting_full.glb'
  }
}

export default function Tileset ({ setDialogue, openExhibit, setNpcDialogue }) {
  return (
    <>
      {MAP.map((row, zIndex) =>
        row.map((tileType, xIndex) => {
          if (tileType === 0) return null
          const segmentID = `tile-${zIndex}-${xIndex}`

          return (
            <Model
              key={segmentID}
              url={MODEL(xIndex, zIndex)[tileType]}
              position={POSITIONS(xIndex, zIndex)[tileType]}
              rotation={ROTATIONS[tileType]}
              setDialogue={setDialogue}
              setNpcDialogue={setNpcDialogue}
              openExhibit={openExhibit}
              mirrored={zIndex % 2 == 0}
              npcData={npcData.filter(npc => npc.segmentID === segmentID)}
              exhibits={exhibitData.filter(ex => ex.segmentID === segmentID)}
              triggers={triggerData.filter(tr => tr.segmentID === segmentID)}
            />
          )
        })
      )}
    </>
  )
}
