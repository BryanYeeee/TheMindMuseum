'use client'
import ModelViewer from '@/components/ModelViewer'

export default function MainApp () {
  return (
    <ModelViewer numArtifacts={3} numPaintings={4} initialJobData={null} pdfKey={null} />
  )
}
