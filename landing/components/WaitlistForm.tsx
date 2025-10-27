'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface WaitlistFormProps {
  source: string;
  buttonText?: string;
  placeholder?: string;
}

export default function WaitlistForm({ 
  source, 
  buttonText = 'Get Early Access',
  placeholder = 'your@company.com'
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Thanks! We\'ll be in touch soon.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to submit. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
        <motion.input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          disabled={status === 'loading' || status === 'success'}
          className="px-5 py-3 border border-gray-300 text-black focus:outline-none focus:border-black w-full sm:w-96 transition disabled:opacity-50 disabled:cursor-not-allowed"
          whileFocus={{ borderColor: '#111827' }}
        />
        <motion.button 
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="bg-black text-white px-6 py-3 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          whileHover={status === 'idle' || status === 'error' ? { scale: 1.02 } : {}}
          whileTap={status === 'idle' || status === 'error' ? { scale: 0.98 } : {}}
        >
          {status === 'loading' ? 'Submitting...' : status === 'success' ? '✓ Submitted' : buttonText}
        </motion.button>
      </div>
      {message && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}
        >
          {message}
        </motion.p>
      )}
    </form>
  );
}
