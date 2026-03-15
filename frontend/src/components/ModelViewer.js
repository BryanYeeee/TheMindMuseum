'use client'

import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import Controller from './Controller'
import NPCModel from './NpcModel'
import * as THREE from 'three'
import CoordsLogger from './CoordsLogger'
import UI from './UI'
import TableLoader from './TableLoader'
import ExhibitViewer from './ExhibitViewer'
import { npcData } from '@/constants/NpcData'
import NPCHitbox from './NpcHitbox'
import Tileset from './TileSet'

const EXHIBIT_POS = {
  1: [-21.5, 2.15, -17.2],
  2: [-14.82, 2.9, -19.06],
  3: [-6.79, 2.9, -19.06],
  4: [-6.79, 2.9, -0.94],
  5: [-14.82, 2.9, -0.94],
  6: [-21.5, 2.15, -2.8],
  7: [-13.36, 1.76, -10]
}

export default function ModelViewer ({ numArtifacts, initialJobData }) {
  const [liveExhibits, setLiveExhibits] = useState(
    initialJobData?.artifacts || []
  )

  const midSectionCount = Math.ceil(numArtifacts / 6)
  const dynamicMap = [
    [0, 4], // Entrance/Top
    ...Array(midSectionCount).fill([1, 2]), // Middle segments repeat
    [0, 3] // Exit/Bottom
  ]

  useEffect(() => {
  if (!initialJobData) return;
  
  const eventSource = new EventSource(
    `http://localhost:5001/design/stream/${initialJobData.job_id}`
  );
  eventSource.addEventListener('artifact_update', event => {
    const updatedArtifact = JSON.parse(event.data);
    setLiveExhibits(prev => {
      const artifactIndex = prev.findIndex(ex => ex.id === updatedArtifact.id);
      
      if (artifactIndex === -1) return prev;
      const { segmentID, position, posKey } = getPlacement(artifactIndex);
      console.log(`Updating artifact ${updatedArtifact.id} at ${segmentID} with position ${position}`);
      console.log('Updated artifact data:', updatedArtifact);
      console.log('model url:',updatedArtifact.model_url)
      return prev.map((ex, i) =>
        i === artifactIndex
          ? { 
              ...ex, 
              ...updatedArtifact, 
              segmentID, 
              position, 
              posKey,
              isLive: true,
              type: 'artifact'
            }
          : ex
      );
    });
  });

  return () => eventSource.close();
}, [initialJobData?.job_id]);

  const [lastCoords, setLastCoords] = useState('Click a surface to get coords')
  const [dialogue, setDialogue] = useState(null)
  const [npcDialogue, setNpcDialogue] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [exhibit, setExhibit] = useState(null)
  const [receptionistOpen, setReceptionistOpen] = useState(false)
  const [quizData, setQuizData] = useState({}) // { [npcName]: { question, answer } }
  const [completedNpcs, setCompletedNpcs] = useState(new Set())
  const [npcQuiz, setNpcQuiz] = useState(null) // { npcName, question, answer }
  const controlsRef = useRef()
  const audioRef = useRef(null)

  // Fetch quiz questions for all non-receptionist NPCs on mount
  useEffect(() => {
    const quizNpcs = npcData.filter(n => n.quizTopic)
    fetch('http://localhost:5001/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizNpcs.map(n => ({ id: n.name, description: n.quizTopic }))),
    })
      .then(r => r.json())
      .then(data => {
        const map = {}
        data.forEach(item => { map[item.id] = { question: item.question, answer: item.answer } })
        setQuizData(map)
      })
      .catch(err => console.error('Failed to load quiz data:', err))
  }, [])

  useEffect(() => {
    const audio = new Audio('/music.mp3')
    audio.loop = true
    audio.volume = 0.4
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Close dialogue on Tab key
  useEffect(() => {
    const handleKey = e => {
      if (e.code === 'Tab') {
        e.preventDefault()
        setNpcDialogue(null)
        setDialogue(null)
        if (receptionistOpen) {
          setReceptionistOpen(false)
          controlsRef.current?.lock()
        }
        if (npcQuiz) {
          setNpcQuiz(null)
          controlsRef.current?.lock()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [receptionistOpen, npcQuiz])

  // Start music on first pointer lock (browsers require a user gesture)
  useEffect(() => {
    if (isLocked && audioRef.current?.paused)
      audioRef.current.play().catch(() => {})
  }, [isLocked])

  // Don't exit pointer lock when opening — keeps the lock so E can close and return directly
  const openExhibit = data => setExhibit(data)

  // Clear NPC dialogue when the player pauses (pointer unlock)
  useEffect(() => {
    if (!isLocked && !receptionistOpen && !npcQuiz) setNpcDialogue(null)
  }, [isLocked, receptionistOpen, npcQuiz])

  const handleNpcClick = npc => {
    if (npc.name === 'Receptionist') {
      setNpcDialogue(null)
      setDialogue(null)
      setReceptionistOpen(true)
      controlsRef.current?.unlock()
    } else if (quizData[npc.name] && !completedNpcs.has(npc.name)) {
      setNpcDialogue(null)
      setDialogue(null)
      setNpcQuiz({ npcName: npc.name, ...quizData[npc.name] })
      controlsRef.current?.unlock()
    } else {
      const text = completedNpcs.has(npc.name)
        ? "You've already answered my question. Well done!"
        : npc.dialogue
      setNpcDialogue({ name: npc.name, text })
      setDialogue(null)
    }
  }

  return (
    <div style={{ width: '100%', height: '100vh', cursor: 'crosshair' }}>
      <Canvas
        shadows='basic'
        camera={{ fov: 75, position: [0, 2.75, 5] }}
        onCreated={({ camera }) => {
          camera.lookAt(new THREE.Vector3(0, 2.75, 0))
        }}
      >
        <Suspense fallback={null}>
          <Environment preset='city' environmentIntensity={0.35} />
          {/* <ambientLight intensity={0.2} /> */}
          <directionalLight
            position={[10, 20, 10]}
            intensity={2.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <fog attach='fog' args={['#050505', 1, 65]} />
          <pointLight
            position={[0, 20, -20]}
            intensity={2000}
            color='#ffffff'
          />

          <Tileset
            map={dynamicMap}
            setDialogue={msg => {
              setDialogue(msg)
              if (msg) setNpcDialogue(null)
            }}
            setNpcDialogue={setNpcDialogue}
            liveExhibits={liveExhibits}
            openExhibit={openExhibit}
          />

          {lastCoords !== 'Click a surface to get coords' && (
            <mesh
              position={eval(
                lastCoords.replace('position={', '').replace('}', '')
              )}
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color='red' />
            </mesh>
          )}

          <TableLoader
            url={'/models/reception_counter/scene.gltf'}
            position={[-0.85, 1.9, -5]}
            rotation={[0, 2 * Math.PI, 0]}
            scale={1.5}
          />
          <PointerLockControls
            ref={controlsRef}
            enabled={!exhibit && !receptionistOpen && !npcQuiz}
            onLock={() => setIsLocked(true)}
            onUnlock={() => setIsLocked(false)}
          />
          <Controller
            isLocked={isLocked && !exhibit && !receptionistOpen && !npcQuiz}
            npcPositions={npcData.map(n => n.position)}
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
        onCloseReceptionist={() => { setReceptionistOpen(false); controlsRef.current?.lock() }}
        npcQuiz={npcQuiz}
        onNpcQuizComplete={npcName => setCompletedNpcs(prev => new Set([...prev, npcName]))}
        onCloseNpcQuiz={() => { setNpcQuiz(null); controlsRef.current?.lock() }}
      />
      <ExhibitViewer
        exhibit={exhibit}
        onClose={() => setExhibit(null)}
        onResume={() => controlsRef.current?.lock()}
      />
    </div>
  )
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