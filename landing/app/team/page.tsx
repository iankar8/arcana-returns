'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function Team() {
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
            <Link href="/commerce" className="text-sm text-gray-600 hover:text-black transition">AI Commerce</Link>
          </div>
        </nav>
      </header>

      {/* Team Section */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-normal text-black mb-6 tracking-[-0.02em]">
            Team
          </h1>
          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-16">
            We're a small team building infrastructure for agentic commerce. Previously at Equifax, Acorns, HSBC, Google, and Stanford.
          </p>

          {/* Team Members - Update with real info */}
          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="border-l-4 border-black pl-6"
            >
              <h3 className="text-lg font-medium text-black mb-1">Founding Team</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Building returns infrastructure for the next generation of commerce.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-black" />
              <span className="font-semibold text-black tracking-tight">Arcana Labs</span>
            </Link>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>© 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
