export default function IntroductionPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to Arcana Labs</h1>
      <p className="text-xl text-gray-400 mb-8">
        Agentic returns with audit-grade logging
      </p>

      <div className="space-y-6 text-gray-300">
        <p>
          Arcana provides a minimal API surface for intelligent return decisions with complete auditability. 
          Every decision is bound to a versioned policy snapshot and logged in an append-only ledger (AEL-lite) 
          for time-travel replay.
        </p>

        <div className="grid grid-cols-2 gap-4 my-8">
          <a href="/docs/quickstart" className="block p-6 border border-gray-800 rounded-lg hover:border-blue-500 transition">
            <h3 className="text-lg font-semibold mb-2">🚀 Quickstart</h3>
            <p className="text-sm text-gray-400">Get your first API call working in 5 minutes</p>
          </a>
          <a href="/docs/api-reference" className="block p-6 border border-gray-800 rounded-lg hover:border-blue-500 transition">
            <h3 className="text-lg font-semibold mb-2">📖 API Reference</h3>
            <p className="text-sm text-gray-400">Explore the complete API documentation</p>
          </a>
        </div>

        <h2 className="text-2xl font-bold mt-12 mb-4">Features</h2>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">🔐 Policy Snapshot Extractor</h3>
            <p className="text-sm text-gray-400">
              Version-controlled policy graphs with content hashing. Import policies from PDF, URL, 
              or text and track changes over time.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">🔄 3-Step Returns API</h3>
            <p className="text-sm text-gray-400">
              Simple, powerful API with just 3 endpoints: <code className="text-blue-400">/token</code>, 
              <code className="text-blue-400"> /authorize</code>, <code className="text-blue-400"> /commit</code>. 
              Signed Return Tokens with Ed25519 for security.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">📚 AEL-lite Audit Ledger</h3>
            <p className="text-sm text-gray-400">
              Append-only decision ledger with replay capability. Every decision is logged with full 
              Bill of Materials for compliance.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-2">🔌 Platform Adapters</h3>
            <p className="text-sm text-gray-400">
              Pre-built integrations for Shopify and Stripe. Webhook-driven, easy to set up.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-12 mb-4">Quick Example</h2>
        
        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`const response = await fetch('https://arcana-returns-api.fly.dev/returns/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    order_id: 'ord_123',
    customer_ref: 'cust_456',
    items: [{ sku: 'SHIRT-M', qty: 1, price_cents: 2999 }],
    reason_code: 'doesnt_fit',
    policy_id: 'plc_abc'
  })
});

const { return_token } = await response.json();`}</code>
        </pre>

        <h2 className="text-2xl font-bold mt-12 mb-4">Next Steps</h2>
        
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Get API Keys - Sign up at <a href="https://arcana.returns/dashboard" className="text-blue-400 hover:underline">dashboard.arcana.returns</a></li>
          <li>Import your return policy via API or dashboard</li>
          <li>Follow our <a href="/docs/quickstart" className="text-blue-400 hover:underline">Quickstart</a> to issue your first return token</li>
          <li>Integrate with your platform</li>
        </ol>
      </div>
    </div>
  );
}
