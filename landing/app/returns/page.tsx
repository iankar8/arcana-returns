'use client';

import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import WaitlistForm from '@/components/WaitlistForm';

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

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Shield className="h-7 w-7 text-black" />
            <span className="text-xl font-semibold tracking-tight text-black">Arcana Labs</span>
          </Link>
          <div className="flex items-center space-x-8">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-black transition">How It Works</a>
            <a href="#protocols" className="text-sm text-gray-600 hover:text-black transition">Agent Platforms</a>
            <Link href="/team" className="text-sm text-gray-600 hover:text-black transition">Team</Link>
            <motion.button 
              className="bg-black text-white px-5 py-2.5 text-sm font-medium transition"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Early Access
            </motion.button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div 
          className="max-w-4xl"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-normal text-black mb-8 leading-[1.15] tracking-[-0.02em]"
            variants={fadeInUp}
          >
            Agentic Returns<br />
            <span className="text-gray-600">Management</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg text-gray-600 mb-12 leading-relaxed max-w-2xl"
            variants={fadeInUp}
          >
            Let AI agents process returns on behalf of customers—with policy enforcement, agent verification, and fraud prevention. Works with ChatGPT, Claude, Gemini, and custom platforms.
          </motion.p>
          
          <motion.div 
            className="flex items-center space-x-4"
            variants={fadeInUp}
          >
            <motion.button 
              className="bg-black text-white px-6 py-3 text-sm font-medium transition"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Early Access
            </motion.button>
            <motion.button 
              className="text-black text-sm font-medium transition"
              whileHover={{ x: 5 }}
            >
              Read the research →
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="bg-white py-24 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-normal text-black mb-6 tracking-[-0.01em]">
              How it works
            </h2>
            <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
              Three-endpoint flow for agent-initiated returns with policy enforcement and evidence requirements.
            </p>
          </div>

          <motion.div 
            className="space-y-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                number: "01",
                title: "Issue Return Token",
                endpoint: "POST /returns/token",
                desc: "Merchant (or agent) calls with order info and policy. System calculates risk score, determines evidence requirements, and issues signed token."
              },
              {
                number: "02",
                title: "Authorize with Evidence",
                endpoint: "POST /returns/authorize",
                desc: "Customer submits photos/proof. System verifies agent identity (if present), checks evidence against policy, and makes decision: approve, step_up, or deny."
              },
              {
                number: "03",
                title: "Commit & Refund",
                endpoint: "POST /returns/commit",
                desc: "Package received. Merchant finalizes return, revokes token, and receives refund instruction: instant, hold, partial, or deny."
              }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="grid lg:grid-cols-2 gap-8 items-start"
              >
                <div>
                  <div className="text-sm font-mono text-gray-400 mb-2">{item.number}</div>
                  <h3 className="text-lg font-medium text-black mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{item.desc}</p>
                  <code className="text-xs font-mono text-gray-500">{item.endpoint}</code>
                </div>
                {i === 1 && (
                  <div className="bg-gray-50 border border-gray-200 p-4">
                    <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
{`// Agent-initiated request
POST /returns/authorize
X-Agent-Attestation: eyJhbGc...
{
  "return_token": "eyJhbGc...",
  "evidence": [
    {
      "type": "photo_packaging",
      "url": "https://..."
    }
  ]
}`}
                    </pre>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Protocols Section */}
      <section id="protocols" className="bg-gray-50 py-24 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-normal text-black mb-6 tracking-[-0.01em]">
              Supported Agent Platforms
            </h2>
            <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
              Verify agents from major AI platforms when they initiate returns. We support JWT, VC, and SPT attestation formats.
            </p>
          </div>

          <div className="space-y-12">
            {/* OpenAI */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid lg:grid-cols-2 gap-8 items-start"
            >
              <div>
                <h3 className="text-lg font-medium text-black mb-2">OpenAI (ChatGPT)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Verify ChatGPT agents using JWT attestations. Track which agent initiated each return for fraud prevention.
                </p>
                <div className="text-xs text-gray-500">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">JWT</span>
                  <span className="mx-2">•</span>
                  <span>Agent verification</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
{`// ChatGPT-initiated return
POST /returns/token
X-Agent-Attestation: eyJhbGc...
{
  "order_id": "ord_123",
  "policy_id": "plc_456",
  "items": [...]
}`}
                </pre>
              </div>
            </motion.div>

            {/* Anthropic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="grid lg:grid-cols-2 gap-8 items-start"
            >
              <div>
                <h3 className="text-lg font-medium text-black mb-2">Anthropic (Claude)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Verify Claude agents using verifiable credentials. Cryptographic proof of agent identity.
                </p>
                <div className="text-xs text-gray-500">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">VC</span>
                  <span className="mx-2">•</span>
                  <span>Verifiable credentials</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
{`// Claude-initiated return
POST /returns/authorize
X-Agent-Attestation: {...}
{
  "return_token": "eyJhbGc...",
  "evidence": [...]
}`}
                </pre>
              </div>
            </motion.div>

            {/* Google */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="grid lg:grid-cols-2 gap-8 items-start"
            >
              <div>
                <h3 className="text-lg font-medium text-black mb-2">Google (Gemini)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Verify Gemini agents using signed tokens. Secure agent identity verification.
                </p>
                <div className="text-xs text-gray-500">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">SPT</span>
                  <span className="mx-2">•</span>
                  <span>Signed tokens</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
{`// Gemini-initiated return
POST /returns/commit
X-Agent-Attestation: spt_...
{
  "return_token": "eyJhbGc..."
}`}
                </pre>
              </div>
            </motion.div>

            {/* Custom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="border-l-4 border-black pl-6"
            >
              <h3 className="text-lg font-medium text-black mb-2">Custom Platforms</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Building your own AI agent? We support custom attestation formats and verification protocols. Perplexity, Visa TAP, and proprietary agents supported.
              </p>
              <a href="mailto:sales@arcana.dev" className="text-sm text-black hover:text-gray-600 transition font-medium">
                Contact us →
              </a>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Integration */}
      <section id="integration" className="bg-white py-24 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-normal text-black mb-6 tracking-[-0.01em]">
              Integration
            </h2>
            <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
              10-minute integration. Zero changes to your existing code.
            </p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-12 mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                step: "01",
                title: "Agent sends request",
                desc: "ChatGPT or Gemini initiates return with attestation header"
              },
              {
                step: "02",
                title: "Arcana Labs verifies",
                desc: "We verify signature, extract agent ID, check reputation"
              },
              {
                step: "03",
                title: "You get clean data",
                desc: "Receive verified agent context. Your logic stays the same"
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="text-sm font-mono text-gray-400 mb-3">{item.step}</div>
                <h3 className="text-base font-medium text-black mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="bg-white border border-gray-200 p-8">
            <h3 className="text-base font-medium text-black mb-4">Integration Example</h3>
            <pre className="bg-gray-50 text-gray-800 p-6 overflow-x-auto text-sm font-mono border border-gray-200">
{`// Your existing code (no changes needed)
app.post('/returns', async (req, res) => {
  // Agent context auto-populated by Arcana Labs
  if (req.agentContext) {
    console.log(\`Verified: \${req.agentContext.platform}/\${req.agentContext.agent_id}\`);
  }
  
  // Your existing logic
  const return = await processReturn(req.body);
  res.json(return);
});`}
            </pre>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-24 bg-white border-t">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-normal text-black mb-6 tracking-[-0.01em]">
            Get early access
          </h2>
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            We're onboarding beta merchants now. Start accepting agent-initiated returns with one API.
          </p>
          <WaitlistForm source="returns" buttonText="Request Access" />
          <p className="text-sm text-gray-600 mt-4">
            Free beta • 10-minute integration • Deploy in 48 hours
          </p>
        </div>
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
              <span>© 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
