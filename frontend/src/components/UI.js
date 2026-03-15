  'use client'
  import { useState, useRef, useEffect } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'

  function ReceptionistChat ({ onClose }) {
    const [question, setQuestion] = useState('')
    const [response, setResponse] = useState(null)
    const [thinking, setThinking] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
      inputRef.current?.focus()
    }, [])

    const submit = async () => {
      const q = question.trim()
      if (!q || thinking) return
      setThinking(true)
      setResponse(null)
      try {
        const res = await fetch('http://localhost:8080/agent/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q }),
        })
        const data = await res.json()
        setResponse(data.answer ?? data.error ?? 'No response.')
      } catch {
        setResponse('Sorry, I could not reach the server.')
      } finally {
        setThinking(false)
        setQuestion('')
      }
    }

    const handleKey = (e) => {
      if (e.code === 'Enter') submit()
    }

    return (
      <motion.div
        key='receptionist'
        initial={{ y: 20, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        exit={{ y: 10, opacity: 0, x: '-50%' }}
        transition={{ duration: 0.2 }}
        className='absolute bottom-20 left-1/2 w-full max-w-xl pointer-events-auto'
      >
        <div className='mx-6 bg-black/90 backdrop-blur-md border border-white/20'>
          {/* Header */}
          <div className='flex items-center gap-2 px-5 py-2 border-b border-white/20'>
            <div className='w-1.5 h-1.5 bg-amber-500' />
            <span className='text-amber-400 text-[10px] tracking-[0.2em] uppercase'>Receptionist</span>
          </div>

          {/* Response area */}
          <div className='px-5 py-4 min-h-[3.5rem]'>
            {thinking ? (
              <p className='text-white/50 text-sm italic'>Thinking...</p>
            ) : response ? (
              <p className='text-white text-sm leading-relaxed'>{response}</p>
            ) : (
              <p className='text-white/40 text-sm italic'>Ask me anything about the museum.</p>
            )}
          </div>

          {/* Input row */}
          <div className='flex items-center gap-2 px-5 pb-4'>
            <input
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Type a question…'
              className='flex-1 bg-white/10 border border-white/20 text-white text-sm px-3 py-2 outline-none placeholder-white/30 focus:border-amber-500/60 transition-colors'
            />
            <button
              onClick={submit}
              disabled={!question.trim() || thinking}
              className='px-4 py-2 text-[10px] tracking-[0.2em] uppercase border border-white/20 text-white/70 hover:border-amber-500/60 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all'
            >
              Ask
            </button>
          </div>

          <p className='px-5 pb-3 text-white/40 text-[9px] tracking-[0.2em] uppercase text-right'>Tab · Close</p>
        </div>
      </motion.div>
    )
  }

  export default function UI ({ lastCoords, dialogue, npcDialogue, isLocked, onResume, receptionistOpen, onCloseReceptionist }) {
    return (
      <div className='fixed inset-0 pointer-events-none select-none font-lora text-white z-50'>
        <AnimatePresence mode='sync'>
          {/* sync allows both to animate at once for a smoother transition */}
          {/* --- THE ENTRY CURTAIN (LOCK SCREEN) --- */}
          {!isLocked && !receptionistOpen && (
            <motion.div
              key='lock-screen'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              transition={{ duration: 0.3 }}
              className='absolute inset-0 bg-[#050505]/80 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto'
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
                <div className='w-px h-16 bg-linear-to-b from-transparent to-white/40 mb-8' />
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
                <div className='w-px h-16 bg-linear-to-t from-transparent to-white/40 mt-12' />
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
              <h1 className='text-xl tracking-[0.1em] text-white'>
                The Mind Museum
              </h1>
              <p className='text-amber-600 text-[9px] tracking-[0.2em] uppercase mt-1 font-semibold'>
                An interactive learning experience
              </p>
            </motion.div>

            {/* CENTER: RETICLE */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <div className='w-[3px] h-[3px] bg-white/70 rotate-45' />
            </div>

            {/* BOTTOM LEFT: INSTRUCTIONS */}
            <div className='absolute bottom-8 left-10 flex flex-col gap-2'>
              {[['Movement', 'W · A · S · D'], ['Look', 'MOUSE'], ['Interact', 'CLICK']].map(([label, key]) => (
                <div key={label} className='flex items-center gap-3'>
                  <span className='text-[9px] text-white/50 tracking-[0.2em] uppercase w-16'>{label}</span>
                  <span className='text-[10px] text-white/90 tracking-widest border border-white/40 px-2 py-0.5'>{key}</span>
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
                    <div className='mx-6 bg-black/80 backdrop-blur-md border border-white/20'>
                      <div className='flex items-center gap-2 px-5 py-2 border-b border-white/20'>
                        <div className='w-1.5 h-1.5 bg-amber-500' />
                        <span className='text-amber-400 text-[10px] tracking-[0.2em] uppercase'>{npcDialogue.name}</span>
                      </div>
                      <p className='px-5 py-4 text-white text-sm leading-relaxed'>{npcDialogue.text}</p>
                      <p className='px-5 pb-3 text-white/40 text-[9px] tracking-[0.2em] uppercase text-right'>Tab · Close</p>
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
                    <div className='mx-6 bg-black/80 backdrop-blur-md border border-white/20'>
                      <div className='flex items-center gap-2 px-5 py-2 border-b border-white/20'>
                        <div className='w-1.5 h-1.5 bg-white/60' />
                        <span className='text-white/60 text-[10px] tracking-[0.2em] uppercase'>Notice</span>
                      </div>
                      <p className='px-5 py-4 text-white text-sm leading-relaxed'>{dialogue}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RECEPTIONIST CHAT — shown outside the HUD/lock-screen so pointer lock state doesn't matter */}
        <AnimatePresence>
          {receptionistOpen && <ReceptionistChat onClose={onCloseReceptionist} />}
        </AnimatePresence>

        {/* BOTTOM RIGHT: LOCATION */}
        <div className='absolute bottom-8 right-10 flex items-center gap-3'>
          <span className='text-[9px] text-white/50 tracking-[0.2em] uppercase'>Location</span>
          <span className='text-[10px] text-white/90 tracking-widest border border-white/40 px-2 py-0.5 font-mono'>
            {lastCoords
              ? lastCoords.replace('position={[', '').replace(']}', '')
              : '0.00 / 0.00 / 0.00'}
          </span>
        </div>
      </div>
    )
  }

  // <motion.div
  //             initial={{ opacity: 0, x: 20 }}
  //             animate={{ opacity: 1, x: 0 }}
  //             className='absolute top-12 right-12'
  //           >
  //             <Compass heading={heading}/>

  //             {/* Optional: Add a "System Status" line below it to match the top-left */}
  //             <div className='mt-4 text-right'>
  //               <p className='text-white/20 text-[8px] tracking-[0.3em] uppercase font-bold'>
  //                 Stream Signal: Nominal
  //               </p>
  //               <div className='flex gap-1 justify-end mt-1'>
  //                 {[1, 2, 3].map(i => (
  //                   <motion.div
  //                     key={i}
  //                     animate={{ opacity: [0.2, 1, 0.2] }}
  //                     transition={{
  //                       repeat: Infinity,
  //                       duration: 2,
  //                       delay: i * 0.3
  //                     }}
  //                     className='w-1 h-1 bg-amber-600'
  //                   />
  //                 ))}
  //               </div>
  //             </div>
  //           </motion.div>
