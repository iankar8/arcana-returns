export default function ErrorCodesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Error Codes Reference</h1>
        <p className="text-xl text-gray-400">
          Complete list of API error codes with resolutions
        </p>
      </div>

      <div className="space-y-6 text-gray-300">
        <div>
          <h2 className="text-2xl font-bold mb-4">Error Response Format</h2>
          <p className="mb-3">All errors follow a consistent format:</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "error": {
    "code": "RT-007",
    "message": "Invalid token signature",
    "suggestion": "Do not modify the token. Generate a new one if needed.",
    "docs_url": "https://docs.arcana.dev/errors/RT-007",
    "trace_id": "trc_9Nf2kL5p",
    "fields": [
      {
        "field": "return_token",
        "issue": "Signature verification failed",
        "example": "rt.eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
      }
    ]
  }
}`}
          </pre>
          
          <p className="text-sm text-gray-400 mt-3">
            💡 Always include the <code className="text-blue-400">trace_id</code> when 
            contacting support for faster resolution!
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Authentication Errors</h2>
          
          <div className="border-l-4 border-red-500 pl-4 mb-4">
            <h3 className="text-lg font-semibold mb-2">AUTH-001: Invalid API Key</h3>
            <p className="text-sm mb-2"><strong>Status:</strong> 401 Unauthorized</p>
            <p className="text-sm mb-2"><strong>Cause:</strong> Missing or invalid API key in Authorization header</p>
            <p className="text-sm"><strong>Resolution:</strong></p>
            <ul className="list-disc list-inside text-sm ml-4">
              <li>Check that Authorization header is set: <code>Authorization: Bearer sk_...</code></li>
              <li>Verify API key hasn't been revoked</li>
              <li>Ensure you're using the correct environment (test vs live)</li>
            </ul>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="text-lg font-semibold mb-2">AUTH-002: Unauthorized</h3>
            <p className="text-sm mb-2"><strong>Status:</strong> 403 Forbidden</p>
            <p className="text-sm mb-2"><strong>Cause:</strong> API key doesn't have permission for this resource</p>
            <p className="text-sm"><strong>Resolution:</strong> Verify the resource belongs to your merchant account</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Return Token Errors</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">RT-003: Items Outside Return Window</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 422 Unprocessable Entity</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Items are outside the return window per policy</p>
              <p className="text-sm"><strong>Resolution:</strong> Check policy return window and order date</p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">RT-004: Token Expired</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 410 Gone</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Return token has expired (15 minute TTL)</p>
              <p className="text-sm"><strong>Resolution:</strong> Generate a new token via <code>POST /returns/token</code></p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">RT-007: Invalid Token Signature</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 401 Unauthorized</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Token signature verification failed</p>
              <p className="text-sm"><strong>Resolution:</strong> Do not modify the token. Generate a new one if needed.</p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">RT-008: Evidence Incomplete</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 422 Unprocessable Entity</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Required evidence not provided or validation failed</p>
              <p className="text-sm"><strong>Resolution:</strong> Check <code>required_evidence</code> and provide all requested types</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Evidence Validation Errors</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">EV-001: HTTPS Required</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 400 Bad Request</p>
              <p className="text-sm"><strong>Resolution:</strong> Use HTTPS URLs for security</p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">EV-004: URL Not Accessible</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 400 Bad Request</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Evidence URL returned non-200 response</p>
              <p className="text-sm"><strong>Resolution:</strong> Verify URL is publicly accessible and returns 200 OK</p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-lg font-semibold mb-2">EV-011: File Size Exceeded</h3>
              <p className="text-sm mb-2"><strong>Status:</strong> 400 Bad Request</p>
              <p className="text-sm mb-2"><strong>Cause:</strong> Evidence file exceeds 10MB limit</p>
              <p className="text-sm"><strong>Resolution:</strong> Compress the file or use image optimization</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Rate Limiting Errors</h2>
          
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-lg font-semibold mb-2">RATE-001: Rate Limit Exceeded</h3>
            <p className="text-sm mb-2"><strong>Status:</strong> 429 Too Many Requests</p>
            <p className="text-sm mb-3"><strong>Resolution:</strong></p>
            <ul className="list-disc list-inside text-sm ml-4 mb-3">
              <li>Wait for duration specified in <code>Retry-After</code> header</li>
              <li>Implement exponential backoff</li>
              <li>Respect rate limit headers</li>
            </ul>
            
            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`async function fetchWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '60');
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }
    
    return res;
  }
}`}
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">HTTP Status Code Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-800 text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Retry?</th>
                  <th className="px-4 py-2 text-left">Common Causes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">200</td>
                  <td className="px-4 py-2">Success</td>
                  <td className="px-4 py-2">No</td>
                  <td className="px-4 py-2">Request succeeded</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">400</td>
                  <td className="px-4 py-2">Client Error</td>
                  <td className="px-4 py-2">No</td>
                  <td className="px-4 py-2">Validation error, malformed request</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">401</td>
                  <td className="px-4 py-2">Auth Error</td>
                  <td className="px-4 py-2">No</td>
                  <td className="px-4 py-2">Invalid/missing API key</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">404</td>
                  <td className="px-4 py-2">Client Error</td>
                  <td className="px-4 py-2">No</td>
                  <td className="px-4 py-2">Resource not found</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">429</td>
                  <td className="px-4 py-2">Rate Limit</td>
                  <td className="px-4 py-2">Yes</td>
                  <td className="px-4 py-2">Too many requests</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">500</td>
                  <td className="px-4 py-2">Server Error</td>
                  <td className="px-4 py-2">Yes</td>
                  <td className="px-4 py-2">Internal error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
          <p>
            Include your <code className="text-blue-400">trace_id</code> for faster resolution:{' '}
            <a href="mailto:api-support@arcana.returns" className="text-blue-400 hover:underline">
              api-support@arcana.returns
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
