import Image from 'next/image'
import ModelViewer from '../components/ModelViewer.js'

export default function Home () {
  return (
  <div className='h-screen w-full bg-amber-400'>
  <ModelViewer url={'/models/museum_interior/scene.gltf'}/>

  </div>

  )
}
