'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Home() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const gradientX = useTransform(mouseX, [0, typeof window !== 'undefined' ? window.innerWidth : 1920], [0, 100]);
  const gradientY = useTransform(mouseY, [0, typeof window !== 'undefined' ? window.innerHeight : 1080], [0, 100]);

  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Gradient background that follows mouse */}
      <motion.div 
        className="absolute inset-0 opacity-30"
        style={{
          background: useTransform(
            [gradientX, gradientY],
            ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, #3B82F6 0%, transparent 50%)`
          )
        }}
      />
      
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat'
      }} />

      {/* Top nav */}
      <div className="absolute top-0 right-0 p-6 z-20">
        <div className="flex items-center space-x-6 text-sm">
          <Link href="/team">
            <span className="text-gray-400 hover:text-white transition cursor-pointer">Team</span>
          </Link>
        </div>
      </div>

      <motion.div 
        className="relative z-10 max-w-4xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-6xl font-normal text-white mb-20 leading-[1.1] tracking-[-0.02em]">
            Infrastructure for AI-powered commerce and financial crime detection.
          </h1>
        </motion.div>
        
        <motion.div 
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link href="/returns">
            <motion.span 
              className="text-xl font-medium text-white hover:text-gray-300 transition-colors cursor-pointer relative group flex items-center gap-2"
              whileHover={{ x: 5 }}
            >
              Returns API
              <span className="text-xs text-green-400">●</span>
              <motion.span 
                className="absolute -bottom-1 left-0 h-px bg-white"
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.span>
          </Link>
          
          <span className="text-gray-700">—</span>

          <Link href="/commerce">
            <motion.span 
              className="text-xl font-medium text-gray-400 hover:text-white transition-colors cursor-pointer relative group"
              whileHover={{ x: 5 }}
            >
              AI Commerce
              <motion.span 
                className="absolute -bottom-1 left-0 h-px bg-white"
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.span>
          </Link>
          
          <span className="text-gray-700">—</span>
          
          <Link href="/banking">
            <motion.span 
              className="text-xl font-medium text-gray-400 hover:text-white transition-colors cursor-pointer relative group"
              whileHover={{ x: 5 }}
            >
              Banking
              <motion.span 
                className="absolute -bottom-1 left-0 h-px bg-white"
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
