export default function NPCHitbox ({ position, onDialogue }) {
  return (
    <mesh
      position={[position[0], 1.0, position[2]]}
      onClick={(e) => { e.stopPropagation(); onDialogue() }}
    >
      <boxGeometry args={[0.8, 4, 0.8]} />
      <meshBasicMaterial transparent opacity={0.5} depthWrite={false} />
    </mesh>
  )
}