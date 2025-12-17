import React from 'react';
import { motion } from 'framer-motion';
import { VoiceState } from '../../types';

interface VoiceOrbProps {
  state: VoiceState;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state }) => {
  // Animation variants for the core orb
  const coreVariants = {
    [VoiceState.IDLE]: {
      scale: [1, 1.1, 1],
      opacity: 0.8,
      boxShadow: "0px 0px 40px 10px rgba(99, 102, 241, 0.3)",
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    [VoiceState.LISTENING]: {
      scale: [1, 1.2, 0.9, 1.1],
      opacity: 1,
      boxShadow: "0px 0px 60px 20px rgba(6, 182, 212, 0.5)",
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    [VoiceState.PROCESSING]: {
      scale: [1, 0.9, 1],
      rotate: 360,
      opacity: 1,
      boxShadow: "0px 0px 50px 15px rgba(168, 85, 247, 0.6)",
      transition: { rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }
    },
    [VoiceState.SPEAKING]: {
      scale: [1, 1.3, 1, 1.2],
      opacity: 1,
      boxShadow: "0px 0px 80px 30px rgba(99, 102, 241, 0.6)",
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    }
  };

  // Color mapping based on state
  const getColor = () => {
    switch (state) {
      case VoiceState.LISTENING: return 'bg-cyan-500';
      case VoiceState.PROCESSING: return 'bg-purple-500';
      case VoiceState.SPEAKING: return 'bg-indigo-500';
      default: return 'bg-indigo-400';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Rings */}
      <motion.div
        className={`absolute inset-0 rounded-full border-2 border-opacity-20 ${state === VoiceState.LISTENING ? 'border-cyan-500' : 'border-indigo-500'}`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.4, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className={`absolute inset-4 rounded-full border border-opacity-30 ${state === VoiceState.SPEAKING ? 'border-indigo-400' : 'border-purple-500'}`}
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core Orb */}
      <motion.div
        className={`w-32 h-32 rounded-full ${getColor()} blur-md`}
        variants={coreVariants}
        animate={state}
      />
      
      {/* Sharp Inner Core */}
      <div className={`absolute w-28 h-28 rounded-full ${getColor()} opacity-90 mix-blend-screen bg-opacity-50`} />
      
      {/* Particles (Only when speaking or processing) */}
      {(state === VoiceState.SPEAKING || state === VoiceState.PROCESSING) && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-70"
              animate={{
                x: [0, (Math.random() - 0.5) * 150],
                y: [0, (Math.random() - 0.5) * 150],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};
