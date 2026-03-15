export default function NPCHitbox({ position, onDialogue }) {
    return (
        <mesh
            position={[position[0], 1.0, position[2]]}
            onClick={(e) => {
                e.stopPropagation();
                onDialogue();
            }}>
            <boxGeometry args={[1, 4.5, 1]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}
