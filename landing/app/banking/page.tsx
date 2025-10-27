'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Banking() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <span className="text-xl font-semibold tracking-tight text-black">Arcana Labs</span>
          </Link>
          <div className="flex items-center space-x-8">
            <Link href="/returns" className="text-sm text-gray-600 hover:text-black transition">Returns API</Link>
            <Link href="/commerce" className="text-sm text-gray-600 hover:text-black transition">AI Commerce</Link>
            <Link href="/team" className="text-sm text-gray-600 hover:text-black transition">Team</Link>
          </div>
        </nav>
      </header>

      {/* Coming Soon */}
      <div className="flex items-center justify-center min-h-[80vh]">
        <motion.div 
          className="text-center max-w-2xl px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-normal text-black mb-6 tracking-[-0.02em]">
            AI Agents for financial crime detection
          </h1>
          <p className="text-base text-gray-600 mb-8">
            Coming soon. We're building AI-powered agents to detect and prevent financial crime at scale.
          </p>
          <Link href="/">
            <motion.span 
              className="text-black hover:text-gray-600 transition cursor-pointer"
              whileHover={{ x: -5 }}
            >
              ← Back to home
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
