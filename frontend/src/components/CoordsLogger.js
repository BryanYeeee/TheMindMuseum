// components/CoordsLogger.js
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export default function CoordsLogger({ onHit }) {
  const { camera, raycaster, scene } = useThree();

  useEffect(() => {
    const handleDown = () => {
      // Raycast from the center of the screen (where the crosshair is)
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const { x, y, z } = intersects[0].point;
        // Format the string for easy copy-pasting
        const coordString = `position={[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]}`;
        onHit(coordString);
      }
    };

    window.addEventListener('mousedown', handleDown);
    return () => window.removeEventListener('mousedown', handleDown);
  }, [camera, raycaster, scene, onHit]);

  return null;
}