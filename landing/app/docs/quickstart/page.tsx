export default function QuickstartPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Quickstart</h1>
      <p className="text-xl text-gray-400 mb-8">
        Get started with Arcana Returns in 5 minutes
      </p>

      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-2xl font-bold mb-4">1. Get Your API Key</h2>
          <p className="mb-4">
            First, sign up and get your API key from the <a href="https://arcana.returns/dashboard" className="text-blue-400 hover:underline">Arcana Dashboard</a>.
          </p>
          <div className="bg-gray-900 p-4 rounded-lg">
            <code className="text-sm text-green-400">sk_live_your_api_key_here</code>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. Install the SDK (Optional)</h2>
          <p className="mb-4">
            You can use any HTTP client, or install our official SDK:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm">{`npm install @arcana/returns-sdk`}</code>
          </pre>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. Make Your First Request</h2>
          <p className="mb-4">
            Create a return token for a customer request:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`const response = await fetch('https://arcana-returns-api.fly.dev/returns/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    order_id: 'ord_123',
    customer_ref: 'cust_456',
    items: [{
      sku: 'SHIRT-M',
      qty: 1,
      price_cents: 2999
    }],
    reason_code: 'doesnt_fit',
    policy_id: 'plc_default'
  })
});

const { return_token } = await response.json();
console.log('Return token:', return_token);`}</code>
          </pre>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Authorize the Return</h2>
          <p className="mb-4">
            Once the customer uploads evidence, authorize the return:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`const authResponse = await fetch('https://arcana-returns-api.fly.dev/returns/authorize', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    return_token: return_token,
    evidence: {
      photos: ['https://example.com/photo1.jpg'],
      description: 'Item too small'
    }
  })
});

const { decision, label } = await authResponse.json();
console.log('Decision:', decision); // 'approve' or 'deny'
console.log('Shipping label:', label);`}</code>
          </pre>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">5. Commit the Return</h2>
          <p className="mb-4">
            After the item is received, commit the return to trigger the refund:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`const commitResponse = await fetch('https://arcana-returns-api.fly.dev/returns/commit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    return_token: return_token,
    tracking_number: 'TRACK123'
  })
});

const { refund_instruction } = await commitResponse.json();
console.log('Refund:', refund_instruction);`}</code>
          </pre>
        </section>

        <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">🎉 You're Done!</h3>
          <p className="mb-4">
            You've successfully processed a return with Arcana. Next steps:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><a href="/docs/authentication" className="text-blue-400 hover:underline">Learn about authentication</a></li>
            <li><a href="/docs/guides/idempotency" className="text-blue-400 hover:underline">Implement idempotency</a></li>
            <li><a href="/docs/api-reference" className="text-blue-400 hover:underline">Explore the full API reference</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
