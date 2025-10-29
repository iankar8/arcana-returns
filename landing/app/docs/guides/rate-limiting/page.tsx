export default function RateLimitingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Rate Limiting</h1>
        <p className="text-xl text-gray-400">
          Understand and handle API rate limits
        </p>
      </div>

      <div className="space-y-6 text-gray-300">
        <div>
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p>
            Arcana uses <strong>per-endpoint, per-merchant</strong> rate limiting to ensure 
            fair resource allocation and prevent abuse. Different endpoints have different 
            limits based on their resource requirements.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-800">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">Endpoint</th>
                  <th className="px-4 py-2 text-left">Limit</th>
                  <th className="px-4 py-2 text-left">Window</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>/returns/token</code></td>
                  <td className="px-4 py-2">100 req/min</td>
                  <td className="px-4 py-2">60s</td>
                  <td className="px-4 py-2">High volume endpoint</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>/returns/authorize</code></td>
                  <td className="px-4 py-2">50 req/min</td>
                  <td className="px-4 py-2">60s</td>
                  <td className="px-4 py-2">Resource intensive</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>/returns/commit</code></td>
                  <td className="px-4 py-2">50 req/min</td>
                  <td className="px-4 py-2">60s</td>
                  <td className="px-4 py-2">Critical operation</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>/webhooks/*</code></td>
                  <td className="px-4 py-2">200 req/min</td>
                  <td className="px-4 py-2">60s</td>
                  <td className="px-4 py-2">Webhook bursts</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">Other endpoints</td>
                  <td className="px-4 py-2">1000 req/min</td>
                  <td className="px-4 py-2">60s</td>
                  <td className="px-4 py-2">Global fallback</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            💡 Limits are <strong>per merchant</strong>, so different API keys have separate quotas.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Rate Limit Headers</h2>
          <p>Every response includes rate limit information:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm mt-4">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 45
X-RateLimit-Window: 60
Retry-After: 45`}
          </pre>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">429 Response</h2>
          <p>When you exceed the rate limit:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm mt-4">
{`{
  "error": {
    "code": "RATE-001",
    "message": "Rate limit exceeded for this endpoint",
    "suggestion": "Wait for the duration specified in Retry-After header",
    "details": {
      "endpoint": "/returns/authorize",
      "limit": 50,
      "retryAfter": "45"
    },
    "trace_id": "trc_xyz789"
  }
}`}
          </pre>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Handling Rate Limits</h2>
          <h3 className="text-xl font-semibold mb-2">Check Before Sending</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`async function makeRequest(url, options) {
  const response = await fetch(url, options);
  
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));
  
  if (remaining < 10) {
    console.warn(\`Only \${remaining} requests left. Resets in \${reset}s\`);
  }
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After'));
    throw new Error(\`Rate limited. Retry after \${retryAfter}s\`);
  }
  
  return response;
}`}
          </pre>

          <h3 className="text-xl font-semibold mb-2 mt-6">Exponential Backoff</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`async function fetchWithBackoff(url, options, maxRetries = 3) {
  let delay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
    
    console.log(\`Rate limited. Waiting \${waitTime}ms...\`);
    await new Promise(r => setTimeout(r, waitTime));
    
    delay *= 2; // Exponential backoff
  }
  
  throw new Error('Max retries exceeded');
}`}
          </pre>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Always check <code className="text-blue-400">X-RateLimit-Remaining</code> and slow down when it gets low</li>
            <li>Respect the <code className="text-blue-400">Retry-After</code> header - never retry immediately on 429</li>
            <li>Implement exponential backoff with jitter to avoid thundering herd</li>
            <li>Process operations in controlled batches instead of flooding the API</li>
            <li>Cache responses when possible to reduce API calls</li>
          </ul>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-2">Need Higher Limits?</h3>
          <p>
            Enterprise plans offer custom rate limits. Contact{' '}
            <a href="mailto:sales@arcana.returns" className="text-blue-400 hover:underline">
              sales@arcana.returns
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
