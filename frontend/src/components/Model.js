import { useGLTF, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'

export default function Model ({ url, ...props }) {
  // useGLTF handles loading and caching automatically

  const { scene } = useGLTF(url)
  const { scene: threeScene } = useThree()
  const bg = useTexture('/images/sky.png')
  const clonedScene = useMemo(() => scene.clone(), [scene])
  useEffect(() => {
    threeScene.background = bg
  }, [bg, threeScene])

  return (
    <>
      <primitive object={clonedScene} {...props} />
    </>
  )
}
