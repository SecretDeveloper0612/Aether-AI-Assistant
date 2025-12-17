import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.7)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        backdrop-blur-xl bg-slate-900/50 border border-slate-700/50 
        rounded-3xl p-6 shadow-xl overflow-hidden relative group
        hover:border-slate-500/50 transition-colors
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {children}
    </motion.div>
  );
};
