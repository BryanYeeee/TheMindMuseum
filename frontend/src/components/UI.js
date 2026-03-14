'use client'
import { motion, AnimatePresence } from 'framer-motion'

export default function UI ({ lastCoords, dialogue, npcDialogue, isLocked, onResume }) {
  return (
    <div className='fixed inset-0 pointer-events-none select-none font-lora text-white z-50'>
      <AnimatePresence mode='sync'>
        {/* sync allows both to animate at once for a smoother transition */}
        {/* --- THE ENTRY CURTAIN (LOCK SCREEN) --- */}
        {!isLocked && (
          <motion.div
            key='lock-screen'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.3 }}
            className='absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] pointer-events-auto'
          >
            {/* scanline overlay */}
            <div className='absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.08)_2px,rgba(0,0,0,0.08)_4px)] pointer-events-none' />

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className='relative flex flex-col items-center w-80 gap-1'
            >
              {/* Title */}
              <h2 className='text-3xl text-white mb-1 tracking-[0.1em]'>The Mind Museum</h2>
              <p className='text-white/40 text-xs tracking-[0.2em] uppercase mb-8'>— Paused —</p>

              {/* Menu items */}
              <div
                onClick={onResume}
                className='w-full flex items-center justify-between px-5 py-3 border border-white/10 hover:border-amber-500/60 hover:bg-white/5 transition-all cursor-pointer group'
              >
                <span className='text-white/90 text-sm tracking-widest uppercase group-hover:text-amber-400 transition-colors'>Resume</span>
                <span className='text-white/25 text-[10px] tracking-wider group-hover:text-white/40 transition-colors'>Click to continue</span>
              </div>
              <div className='w-full mt-4 px-1'>
                <p className='text-white/20 text-[9px] tracking-[0.2em] uppercase mb-3'>Controls</p>
                <div className='flex flex-col gap-1.5'>
                  {[['W · A · S · D', 'Move'], ['Mouse', 'Look'], ['Click', 'Interact']].map(([key, action]) => (
                    <div key={key} className='flex items-center justify-between'>
                      <span className='text-white/35 text-[10px] tracking-widest'>{key}</span>
                      <span className='text-white/20 text-[9px] tracking-[0.2em] uppercase'>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* --- THE GALLERY HUD (INGAME UI) --- */}
        {isLocked && (
          <motion.div
            key='hud'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} // Fades out when you hit Escape
            transition={{ duration: 0.4 }}
            className='absolute inset-0'
          >
            {/* CINEMATIC OVERLAYS */}
            <div className='absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.8)] pointer-events-none' />

            {/* TOP LEFT: BRANDING */}
            <div className='absolute top-8 left-10'>
              <p className='text-white/90 text-lg tracking-[0.1em]'>The Mind Museum</p>
              <p className='text-amber-500/70 text-[9px] tracking-[0.2em] mt-0.5'>An interactive learning experience</p>
            </div>

            {/* CENTER: RETICLE */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <div className='w-[3px] h-[3px] bg-white/70 rotate-45' />
            </div>

            {/* BOTTOM LEFT: INSTRUCTIONS */}
            <div className='absolute bottom-8 left-10 flex flex-col gap-2 opacity-50'>
              {[['Movement', 'W · A · S · D'], ['Look', 'MOUSE'], ['Interact', 'CLICK']].map(([label, key]) => (
                <div key={label} className='flex items-center gap-3'>
                  <span className='text-[9px] text-white/40 tracking-[0.2em] uppercase w-16'>{label}</span>
                  <span className='text-[10px] text-white tracking-widest border border-white/10 px-2 py-0.5'>{key}</span>
                </div>
              ))}
            </div>

            {/* NPC DIALOGUE BOX */}
            <AnimatePresence>
              {npcDialogue && (
                <motion.div
                  key='npc-dialogue'
                  initial={{ y: 20, opacity: 0, x: '-50%' }}
                  animate={{ y: 0, opacity: 1, x: '-50%' }}
                  exit={{ y: 10, opacity: 0, x: '-50%' }}
                  transition={{ duration: 0.2 }}
                  className='absolute bottom-20 left-1/2 w-full max-w-xl'
                >
                  <div className='mx-6 bg-black/80 backdrop-blur-md border border-white/10'>
                    <div className='flex items-center gap-2 px-5 py-2 border-b border-white/10'>
                      <div className='w-1.5 h-1.5 bg-amber-500' />
                      <span className='text-amber-400 text-[10px] tracking-[0.2em] uppercase'>{npcDialogue.name}</span>
                    </div>
                    <p className='px-5 py-4 text-white/85 text-sm leading-relaxed'>{npcDialogue.text}</p>
                    <p className='px-5 pb-3 text-white/20 text-[9px] tracking-[0.2em] uppercase text-right'>ESC · Close</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TRIGGER NOTIFICATION */}
            <AnimatePresence>
              {dialogue && (
                <motion.div
                  initial={{ y: 20, opacity: 0, x: '-50%' }}
                  animate={{ y: 0, opacity: 1, x: '-50%' }}
                  exit={{ y: 10, opacity: 0, x: '-50%' }}
                  transition={{ duration: 0.2 }}
                  className='absolute bottom-20 left-1/2 w-full max-w-xl'
                >
                  <div className='mx-6 bg-black/80 backdrop-blur-md border border-white/10'>
                    <div className='flex items-center gap-2 px-5 py-2 border-b border-white/10'>
                      <div className='w-1.5 h-1.5 bg-white/40' />
                      <span className='text-white/40 text-[10px] tracking-[0.2em] uppercase'>Notice</span>
                    </div>
                    <p className='px-5 py-4 text-white/85 text-sm leading-relaxed'>{dialogue}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {/* BOTTOM RIGHT: ACCESSION NUMBER */}
            <div className='absolute bottom-12 right-12 text-right'>
              <p className='text-white text-[9px] uppercase tracking-[0.3em] mb-1 font-sans font-bold'>
                Loc. Data
              </p>
              <code className='text-amber-600 font-mono text-[10px] tracking-widest bg-white/20 px-2 py-1'>
                {lastCoords
                  ? lastCoords.replace('position={[', '').replace(']}', '')
                  : '0.00 / 0.00 / 0.00'}
              </code>
            </div>
    </div>
  )
}
