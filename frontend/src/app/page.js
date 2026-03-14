import Image from 'next/image'
import ModelViewer from '../components/ModelViewer.js'

export default function Home () {
  return (
  <div>
  <ModelViewer url={'/models/museum_interior/scene.gltf'}/>

  </div>

  )
}
