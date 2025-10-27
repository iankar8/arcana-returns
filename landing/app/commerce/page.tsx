'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function Commerce() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Shield className="h-7 w-7 text-black" />
            <span className="text-xl font-semibold tracking-tight text-black">Arcana Labs</span>
          </Link>
          <div className="flex items-center space-x-8">
            <Link href="/returns" className="text-sm text-gray-600 hover:text-black transition">Returns API</Link>
            <Link href="/team" className="text-sm text-gray-600 hover:text-black transition">Team</Link>
          </div>
        </nav>
      </header>

      {/* Coming Soon */}
      <div className="flex items-center justify-center min-h-[80vh]">
        <motion.div 
          className="text-center max-w-3xl px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-normal text-black mb-6 tracking-[-0.02em]">
            AI Commerce & Purchase Routing
          </h1>
          <p className="text-lg text-gray-600 mb-4 leading-relaxed">
            We're building the orchestration layer for AI-powered purchases. Route transactions across OpenAI, Anthropic, Google, and custom agent platforms with one API.
          </p>
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            Accept agent-initiated purchases while integrating existing risk and fraud controls.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
            <h3 className="text-base font-medium text-black mb-3">Coming Soon</h3>
            <ul className="text-sm text-gray-600 text-left space-y-2">
              <li>• Agent purchase verification & routing</li>
              <li>• Multi-protocol support (OpenAI, Anthropic, Google)</li>
              <li>• Policy attachment at checkout</li>
              <li>• Fraud prevention for agent transactions</li>
            </ul>
          </div>

          <div className="flex items-center justify-center space-x-6">
            <Link href="/returns">
              <motion.span 
                className="text-black hover:text-gray-600 transition cursor-pointer font-medium"
                whileHover={{ x: -5 }}
              >
                ← Check out Returns API (live now)
              </motion.span>
            </Link>
            
            <span className="text-gray-400">|</span>
            
            <Link href="/">
              <motion.span 
                className="text-gray-600 hover:text-black transition cursor-pointer"
                whileHover={{ x: 5 }}
              >
                Back to home →
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-black" />
              <span className="font-semibold text-black tracking-tight">Arcana Labs</span>
            </Link>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <Link href="/team" className="hover:text-black transition">Team</Link>
              <span>© 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
