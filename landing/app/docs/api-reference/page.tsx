export default function APIReferencePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">API Reference</h1>
      <p className="text-xl text-gray-400 mb-8">
        Complete reference for the Arcana Returns API
      </p>

      <div className="space-y-12 text-gray-300">
        {/* Returns API */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Returns API</h2>
          
          {/* POST /returns/token */}
          <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">POST</span>
                <code className="text-blue-400">/returns/token</code>
              </div>
              <p className="text-sm text-gray-400 mt-2">Create a return token</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "order_id": "ord_123",
  "customer_ref": "cust_456",
  "items": [{
    "sku": "SHIRT-M",
    "qty": 1,
    "price_cents": 2999
  }],
  "reason_code": "doesnt_fit",
  "policy_id": "plc_default"
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "return_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-01-01T12:00:00Z",
  "policy_snapshot_hash": "sha256:abc123..."
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* POST /returns/authorize */}
          <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">POST</span>
                <code className="text-blue-400">/returns/authorize</code>
              </div>
              <p className="text-sm text-gray-400 mt-2">Authorize a return with evidence</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "return_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "evidence": {
    "photos": ["https://example.com/photo1.jpg"],
    "description": "Item too small"
  }
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "decision": "approve",
  "label": {
    "url": "https://shipping-label.com/123",
    "tracking": "TRACK123"
  },
  "decision_id": "dec_789"
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* POST /returns/commit */}
          <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">POST</span>
                <code className="text-blue-400">/returns/commit</code>
              </div>
              <p className="text-sm text-gray-400 mt-2">Commit return and trigger refund</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "return_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "tracking_number": "TRACK123"
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "refund_instruction": {
    "amount_cents": 2999,
    "method": "original_payment",
    "status": "processing"
  },
  "ael_entry_id": "ael_456"
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Policy API */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Policy API</h2>
          
          <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">POST</span>
                <code className="text-blue-400">/policy/import</code>
              </div>
              <p className="text-sm text-gray-400 mt-2">Import a return policy</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "source": "url",
  "url": "https://example.com/return-policy.pdf",
  "name": "Default Return Policy"
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                  <code>{`{
  "policy_id": "plc_abc123",
  "snapshot_hash": "sha256:def456...",
  "extracted_rules": [...]
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Error Codes */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Common Error Codes</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-4 p-3 bg-gray-900 rounded">
              <code className="text-red-400 font-bold">400</code>
              <span>Bad Request - Invalid parameters</span>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-900 rounded">
              <code className="text-red-400 font-bold">401</code>
              <span>Unauthorized - Invalid API key</span>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-900 rounded">
              <code className="text-red-400 font-bold">404</code>
              <span>Not Found - Resource doesn't exist</span>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-900 rounded">
              <code className="text-red-400 font-bold">429</code>
              <span>Rate Limited - Too many requests</span>
            </div>
            <div className="flex items-start gap-4 p-3 bg-gray-900 rounded">
              <code className="text-red-400 font-bold">500</code>
              <span>Internal Server Error - Something went wrong</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
