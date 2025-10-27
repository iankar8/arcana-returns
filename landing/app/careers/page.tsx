'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const openRoles = [
  {
    title: 'Founding Engineer - Commerce',
    type: 'Full-time',
    location: 'San Francisco / Remote',
    description: 'Build the future of AI-powered commerce infrastructure. Work on agent purchase routing, returns management, and protocol orchestration. Full-stack: TypeScript, Node.js, PostgreSQL, cryptographic verification.'
  },
  {
    title: 'Platform Engineer',
    type: 'Full-time', 
    location: 'San Francisco / Remote',
    description: 'Design and build merchant-facing APIs. Own reliability, security, and performance for production systems handling agent transactions.'
  },
  {
    title: 'Design Engineer',
    type: 'Full-time',
    location: 'San Francisco / Remote',
    description: 'Design and build merchant dashboards and policy management interfaces. Strong in React, TypeScript, and systems thinking.'
  }
];

export default function Careers() {
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
            <Link href="/team" className="text-sm text-gray-600 hover:text-black transition">Team</Link>
          </div>
        </nav>
      </header>

      {/* Careers Section */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-normal text-black mb-6 tracking-[-0.02em]">
            Careers
          </h1>
          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-4">
            We're building the infrastructure layer for agentic commerce—starting with returns management and protocol routing.
          </p>
          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-16">
            Join us early to shape the future of AI-powered commerce.
          </p>

          {/* Why Join */}
          <div className="mb-20 pb-12 border-b">
            <h2 className="text-2xl font-normal text-black mb-8">Why join Arcana Labs</h2>
            <motion.div 
              className="grid md:grid-cols-2 gap-8"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {[
                {
                  title: 'Early stage impact',
                  desc: 'Shape core product decisions and architecture. Your code will touch every transaction.'
                },
                {
                  title: 'Hard problems',
                  desc: 'Build cryptographic verification systems, distributed policy engines, and real-time fraud detection.'
                },
                {
                  title: 'Ownership',
                  desc: 'Own entire features end-to-end. We move fast and ship to production daily.'
                },
                {
                  title: 'Strong team',
                  desc: 'Work with engineers from Equifax, Acorns, HSBC, Google, and Stanford. Learn from people who built financial and risk infrastructure at scale.'
                }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <h3 className="text-base font-medium text-black mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Open Roles */}
          <div>
            <h2 className="text-2xl font-normal text-black mb-8">Open positions</h2>
            <motion.div 
              className="space-y-6"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {openRoles.map((role, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="border border-gray-200 p-6 hover:border-black transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-black mb-1">{role.title}</h3>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span>{role.type}</span>
                        <span>•</span>
                        <span>{role.location}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{role.description}</p>
                </motion.div>
              ))}

              {/* Open Application */}
              <motion.div
                variants={fadeInUp}
                className="border border-gray-200 p-6 hover:border-black transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-black mb-1">Open Application</h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>Full-time</span>
                      <span>•</span>
                      <span>San Francisco / Remote</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Don't see a role that fits? We're always looking for exceptional people. Tell us what you'd like to build.
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* How to Apply */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 pt-12 border-t"
          >
            <h2 className="text-2xl font-normal text-black mb-4">How to apply</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl mb-4">
              Email us at <a href="mailto:jobs@arcana.dev" className="text-black underline hover:text-gray-600 transition">jobs@arcana.dev</a> with:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside max-w-2xl">
              <li>What you want to build and why you're excited about agentic commerce</li>
              <li>Your GitHub/portfolio (if applicable)</li>
              <li>Best way to reach you</li>
            </ul>
          </motion.div>
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
              <Link href="/team" className="hover:text-black transition">Team</Link>
              <Link href="/careers" className="hover:text-black transition">Careers</Link>
              <span>© 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
