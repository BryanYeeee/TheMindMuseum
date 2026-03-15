'use client'
import ModelViewer from '@/components/ModelViewer'

export default function MainApp () {
  return (
    <ModelViewer numArtifacts={3} numPaintings={16} initialJobData={null} pdfKey={null} />
  )
}
