'use client'
import Model from './Model'
import { exhibitData } from '@/constants/ExhibitData'
import { triggerData } from '@/constants/TriggerData'

const MAP = [
//   [0, 4],
[1,0],
  [1, 2],
//   [1, 2],
//   [0, 3]
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

export default function Tileset ({ setDialogue }) {
  return (
    <>
      {MAP.map((row, zIndex) =>
        row.map((tileType, xIndex) => {
          if (tileType === 0) return null

          const position = POSITIONS(xIndex, zIndex)[tileType]
          const rotation = ROTATIONS[tileType] || [0, 0, 0]
          const segmentID = `tile-${zIndex}-${xIndex}`

          return (
            <Model
              key={segmentID}
                url={xIndex==0?'/models/museum_interior/scene.gltf':
              '/models/museum_left_side_cut.glb'}
              position={position}
              rotation={rotation}
              setDialogue={setDialogue}
              exhibits={exhibitData.filter(ex => ex.segmentID === segmentID)}
              triggers={triggerData.filter(tr => tr.segmentID === segmentID)}
            />
          )
        })
      )}
    </>
  )
}
