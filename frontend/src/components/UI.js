'use client'
import { motion, AnimatePresence } from 'framer-motion'

export default function UI ({ lastCoords, dialogue, npcDialogue, isLocked }) {
  return (
    <div className='fixed inset-0 pointer-events-none select-none font-serif text-white z-50'>
      <AnimatePresence mode='sync'>
        {/* sync allows both to animate at once for a smoother transition */}
        {/* --- THE ENTRY CURTAIN (LOCK SCREEN) --- */}
        {!isLocked && (
          <motion.div
            key='lock-screen'
            // When it snaps back, it will fade in and scale down slightly
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className='absolute inset-0 bg-[#050505]/20 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto'
          >
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(60,60,60,0.15)_0%,transparent_70%)]' />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className='relative flex flex-col items-center max-w-xl text-center px-6'
            >
              <div className='w-px h-32 bg-linear-to-b from-transparent to-white/40 mb-8' />

              <h2 className='text-4xl md:text-5xl tracking-[0.6em] uppercase font-extralight mb-6 leading-tight'>
                The Grand <br /> Gallery
              </h2>

              <div className='w-16 h-px bg-white/20 my-4' />

              <p className='text-white/40 text-[10px] tracking-[0.4em] uppercase mb-12 font-sans'>
                Paused _ Archive Access
              </p>

              <div className='px-12 py-4 border border-white/10 relative group cursor-pointer'>
                <span className='text-white/80 text-[10px] tracking-[0.5em] uppercase italic'>
                  Resume Exhibit
                </span>
              </div>

              <div className='w-px h-32 bg-linear-to-t from-transparent to-white/40 mt-12' />
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
            <motion.div className='absolute top-12 left-12 border-l border-amber-600 pl-5 py-1'>
              <h1 className='text-2xl tracking-[0.35em] uppercase font-light text-white italic'>
                The Grand Gallery
              </h1>
              <p className='text-amber-600 text-[9px] tracking-[0.2em] uppercase font-sans mt-1 font-bold'>
                Live Observation
              </p>
            </motion.div>

            {/* CENTER: RETICLE */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <div className='w-[2px] h-[2px] bg-white/60 rotate-45' />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className='absolute -inset-4 border border-white rounded-full'
              />
            </div>

            {/* BOTTOM LEFT: INSTRUCTIONS */}
            <div className='absolute bottom-12 bg-white/20 p-4 left-12 flex flex-col gap-3 font-sans opacity-40'>
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-white tracking-[0.2em] uppercase font-bold'>
                  Movement
                </span>
                <span className='text-[10px] tracking-widest'>W A S D</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-white tracking-[0.2em] uppercase font-bold'>
                  Gaze
                </span>
                <span className='text-[10px] tracking-widest'>MOUSE</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-white tracking-[0.2em] uppercase font-bold'>
                  Sprint
                </span>
                <span className='text-[10px] tracking-widest'>LSHIFT</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-[8px] text-white tracking-[0.2em] uppercase font-bold'>
                  Interact
                </span>
                <span className='text-[10px] tracking-widest'>CLICK</span>
              </div>
            </div>

            {/* NPC DIALOGUE BOX */}
            <AnimatePresence>
              {npcDialogue && (
                <motion.div
                  key='npc-dialogue'
                  initial={{ y: 40, opacity: 0, x: '-50%' }}
                  animate={{ y: 0, opacity: 1, x: '-50%' }}
                  exit={{ y: 30, opacity: 0, x: '-50%' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className='absolute bottom-24 left-1/2 w-full max-w-2xl'
                >
                  <div className='mx-6 bg-black/70 backdrop-blur-xl border border-amber-600/30 shadow-2xl'>
                    {/* Name plate */}
                    <div className='px-8 pt-5 pb-2 border-b border-amber-600/20 flex items-center gap-3'>
                      <div className='w-1 h-4 bg-amber-600' />
                      <span className='text-amber-500 text-[11px] tracking-[0.4em] uppercase font-sans font-bold'>
                        {npcDialogue.name}
                      </span>
                    </div>
                    {/* Dialogue text */}
                    <div className='px-8 py-5'>
                      <p className='text-white/90 text-base font-light leading-relaxed'>
                        "{npcDialogue.text}"
                      </p>
                    </div>
                    {/* Dismiss hint */}
                    <div className='px-8 pb-4 text-right'>
                      <span className='text-white/20 text-[9px] tracking-[0.3em] uppercase font-sans'>
                        ESC to dismiss
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TRIGGER DIALOGUE: FLOATING PLAQUE */}
            <AnimatePresence mode='wait'>
              {dialogue && (
                <motion.div
                  key={dialogue}
                  // Animating the filter directly ensures the blur and opacity move together
                  initial={{
                    y: 40,
                    opacity: 0,
                    x: '-50%',
                  }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    x: '-50%',
                  }}
                  exit={{
                    y: 20,
                    opacity: 0,
                    x: '-50%',
                  }}
                  transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                  className='absolute bottom-24 left-1/2 w-full max-w-2xl'
                >
                  {/* Container: Solidify the 'Archive' theme with deeper blacks and structural borders */}
                  <div className='mx-6 bg-[#080808]/80 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]'>
                    {/* The "Gallery Accent": A thin, centered amber line that grows with the text */}
                    <div className='flex justify-center'>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '40px' }}
                        className='h-[2px] bg-amber-600'
                      />
                    </div>

                    <div className='px-12 py-10 relative'>
                      {/* Top Decorative Label */}
                      <div className='flex items-center justify-between mb-6'>
                        <span className='text-[8px] text-white/40 tracking-[0.6em] uppercase font-sans font-bold'>
                          Archival Catalog
                        </span>
                        <span className='text-amber-600/50 font-mono text-[8px] tracking-widest'>
                          ITEM.00{Math.floor(Math.random() * 99)}
                        </span>
                      </div>

                      <div className='space-y-4'>
                        <p className='text-white/95 text-xl md:text-2xl italic font-extralight font-serif leading-relaxed text-center drop-shadow-md'>
                          {dialogue}
                        </p>
                      </div>

                      {/* Bottom Branding Detail */}
                      <div className='mt-8 pt-4 border-t border-white/5 flex justify-center'>
                        <div className='w-1 h-1 rounded-full bg-white/20' />
                      </div>
                    </div>
                  </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
