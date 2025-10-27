export default function IdempotencyPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Idempotency</h1>
      <p className="text-xl text-gray-400 mb-8">
        Safely retry API requests without duplicate processing
      </p>

      <div className="space-y-6 text-gray-300">
        <p>
          All POST endpoints support idempotency keys to prevent duplicate processing when retrying requests.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
        <p>
          Include an <code className="text-blue-400">Idempotency-Key</code> header with a unique value (e.g., UUID) in your request:
        </p>

        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`fetch('https://arcana-returns-api.fly.dev/returns/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Idempotency-Key': 'a7b3c9d2-1234-5678-90ab-cdef12345678',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ /* your data */ })
});`}</code>
        </pre>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 my-6">
          <p className="text-sm">
            <strong>💡 Tip:</strong> Generate a new UUID for each unique operation. Reuse the same key when retrying a failed request.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-8 mb-4">Key Expiration</h2>
        <p>
          Idempotency keys are stored for 24 hours. After that, the same key can be reused for a new operation.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Example</h2>
        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`import { v4 as uuidv4 } from 'uuid';

async function createReturnToken(data) {
  const idempotencyKey = uuidv4();
  
  try {
    const response = await fetch(
      'https://arcana-returns-api.fly.dev/returns/token',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_live_...',
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    
    return await response.json();
  } catch (error) {
    // Safe to retry with the same idempotencyKey
    console.error('Request failed, retrying...', error);
    throw error;
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}
