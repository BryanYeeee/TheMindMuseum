const OBJ_POS = {
  1: [-21.5, 2.15, -17.2],
  2: [-20, 2, 7],
  3: [-13.45, 2.9, -9.07],
  4: [-20, 2, -7],
  5: [-20, 2, 7],
  6: [-21.5, 2.15, -2.8],
}

const PAINT_POS = {
  1: [-20, 2, -7],
  2: [-20, 2, 7],
  3: [-14.82, 2.9, -19.06],
  4: [-20, 2, -7],
  5: [-20, 2, 7],
  6: [0, 1, 3]
}

export const exhibitData = [
  {
    segmentID: 'tile-0-0',
    position: OBJ_POS[1],
    url: '',
    dialogue: 'The Dawn of Man.'
  },
  {
    segmentID: 'tile-0-0',
    position: OBJ_POS[6],
    url: '',
    dialogue: 'The Dawn of Man.'
  },
  {
    segmentID: 'tile-0-0',
    position: OBJ_POS[1],
    url: '',
    dialogue: 'The Dawn of Man.'
  },
  {
    segmentID: 'tile-1-0',
    position: OBJ_POS[2],
    url: '',
    dialogue: 'Fragmented Reality.'
  },
  {
    segmentID: 'tile-1-0',
    position: OBJ_POS[4],
    url: '',
    dialogue: 'The Bronze Warrior.'
  },
  {
    segmentID: 'tile-2-1',
    type: 'painting',
    url: '',
    position: PAINT_POS[3],
    dialogue: "A digital reproduction of 'The Great Wave'."
  },
  {
    segmentID: 'tile-0-1',
    type: 'painting',
    url: '',
    position: PAINT_POS[3],
    dialogue: "A digital reproduction of 'The Great Wave'."
  },
  {
    segmentID: 'tile-0-1',
    position: OBJ_POS[1],
    url: '',
    dialogue: 'Ceramic Study #4.'
  },
  {
    segmentID: 'tile-0-1',
    position: OBJ_POS[2],
    url: '',
    dialogue: 'The Celestial Map.'
  },
  {
    segmentID: 'tile-0-1',
    position: OBJ_POS[3],
    url: '',
    dialogue: 'Ancient Relic.'
  }
]
