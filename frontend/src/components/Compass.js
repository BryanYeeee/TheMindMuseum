import { useFrame, useThree } from '@react-three/fiber'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Compass ({ heading = 0 }) {
  // Extended markers for seamless sliding
  const markers = ['N', 'E', 'S', 'W', 'N', 'E', 'S']

  return (
    <div className='flex flex-col items-end gap-2'>
      <div className='flex items-center gap-3'>
        <span className='text-amber-600 font-mono text-[10px] tracking-[0.2em] font-bold'>
          HDG // {(360-heading).toString().padStart(3, '0')}°
        </span>
        <div className='w-8 h-px bg-amber-600/50' />
        <span className='text-white text-lg tracking-[0.3em] font-light'>
          {heading >= 315 || heading < 45
            ? 'N'
            : heading >= 45 && heading < 135
            ? 'W'
            : heading >= 135 && heading < 225
            ? 'S'
            : 'E'}
        </span>
      </div>

      {/* Notch stays centered */}
      {/* <div className='absolute top-0 left-1/2 -translate-x-1/2 w-px h-2 bg-amber-500 z-10' /> */}
    </div>
  )
}
