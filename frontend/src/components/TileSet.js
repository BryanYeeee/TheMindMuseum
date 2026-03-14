'use client'
import Model from './Model'
import { exhibitData } from '@/constants/ExhibitData'
import { triggerData } from '@/constants/TriggerData'

const MAP = [
  [1, 2, 0],
  [1, 0, 0],
]

// Dimensions of a single segment
const L = 34.5 // Length (Long side)
const W = 20   // Width (Short side)

const ROTATIONS = {
  1: [0, 0, 0],              // Standard North
  2: [0, Math.PI, 0],         // Flipped South
  3: [0, Math.PI / 2, 0],     // Rotated East
  4: [0, -Math.PI / 2, 0]     // Rotated West
}
export default function Tileset({ setDialogue }) {
  return (
    <>
      {MAP.map((row, zIndex) =>
        row.map((tileType, xIndex) => {
          if (tileType === 0) return null

          // The grid position needs to account for the rectangular nature
          // Defaulting to standard N/S orientation
          let x = xIndex * W 
          let z = zIndex * L

          // RECTANGULAR ROTATION CORRECTIONS
          // We must shift the pivot point (pink dot) so the mesh doesn't
          // swing out of its intended 'slot'.
          if (tileType === 2) { 
            // 180 deg: Pivot is at bottom-left, mesh swings to top-right.
            // Push it back by W and L.
            // x += W
            // x += L/2
          } else if (tileType === 3) {
            // 90 deg Clockwise: Mesh now runs along the X axis.
            // The long side (L) is now on X.
            z += W 
          } else if (tileType === 4) {
            // 90 deg Counter-Clockwise:
            x += L
          }

          const position = [x, 0, z]
          const rotation = ROTATIONS[tileType] || [0, 0, 0]
          const segmentId = `tile-${xIndex}-${zIndex}`

          return (
            <Model
              key={segmentId}
              url='/models/museum_interior/scene.gltf'
              position={position}
              rotation={rotation}
              setDialogue={setDialogue}
              exhibits={exhibitData.filter(ex => ex.tileId === segmentId)}
              triggers={triggerData.filter(tr => tr.tileId === segmentId)}
            />
          )
        })
      )}
    </>
  )
}