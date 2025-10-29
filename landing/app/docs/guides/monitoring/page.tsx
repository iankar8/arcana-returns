export default function MonitoringPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Monitoring & Health Checks</h1>
        <p className="text-xl text-gray-400">
          Monitor your Arcana integration with health endpoints and metrics
        </p>
      </div>

      <div className="space-y-6 text-gray-300">
        <div>
          <h2 className="text-2xl font-bold mb-4">Health Endpoints</h2>
          
          <h3 className="text-xl font-semibold mb-3">GET /health</h3>
          <p className="mb-3">Basic health check for uptime monitoring.</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`curl https://arcana-returns-api.fly.dev/health`}
          </pre>
          
          <p className="text-sm font-semibold mt-3 mb-2">Response:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2025-10-27T04:07:09.842Z"
}`}
          </pre>
          
          <p className="text-sm text-gray-400 mt-3">
            💡 Use this endpoint for simple uptime monitoring and load balancer health checks.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">GET /health/detailed</h3>
          <p className="mb-3">Comprehensive system status with subsystem checks and metrics.</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`curl https://arcana-returns-api.fly.dev/health/detailed`}
          </pre>
          
          <p className="text-sm font-semibold mt-3 mb-2">Response:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "status": "healthy",
  "timestamp": "2025-10-27T04:07:09.842Z",
  "version": "0.1.0",
  "checks": {
    "database": {
      "status": "up"
    },
    "dlq": {
      "status": "ok",
      "unresolved": 0,
      "total": 0
    },
    "rateLimits": {
      "status": "ok",
      "activeEndpoints": 5
    }
  },
  "metrics": {
    "requests": {
      "total": 1234,
      "avgDuration": 85,
      "errorRate": 0.02
    }
  }
}`}
          </pre>

          <h4 className="text-lg font-semibold mt-6 mb-3">Status Indicators</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-800 text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-4 py-2 text-left">Values</th>
                  <th className="px-4 py-2 text-left">Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>status</code></td>
                  <td className="px-4 py-2">healthy, degraded, down</td>
                  <td className="px-4 py-2">Overall system health</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>checks.database.status</code></td>
                  <td className="px-4 py-2">up, down</td>
                  <td className="px-4 py-2">Database connectivity</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2"><code>checks.dlq.status</code></td>
                  <td className="px-4 py-2">ok, warning</td>
                  <td className="px-4 py-2">Dead letter queue health</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <p className="text-sm">
              ⚠️ If <code className="text-yellow-400">checks.dlq.unresolved &gt; 100</code>, 
              investigate failed webhook deliveries!
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Metrics Endpoint</h2>
          <h3 className="text-xl font-semibold mb-3">GET /metrics</h3>
          <p className="mb-3">Prometheus-compatible metrics for monitoring and alerting.</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`curl https://arcana-returns-api.fly.dev/metrics`}
          </pre>
          
          <p className="text-sm font-semibold mt-3 mb-2">Response:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`# HELP arcana_requests_total Total number of requests
# TYPE arcana_requests_total counter
arcana_requests_total 1234

# HELP arcana_request_duration_ms Average request duration
# TYPE arcana_request_duration_ms gauge
arcana_request_duration_ms 85

# HELP arcana_error_rate Request error rate (0-1)
# TYPE arcana_error_rate gauge
arcana_error_rate 0.02

# Status codes
arcana_status_200_total 1150
arcana_status_400_total 15
arcana_status_429_total 10
arcana_status_500_total 2`}
          </pre>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Prometheus Integration</h2>
          <p className="mb-3">Add to your <code>prometheus.yml</code>:</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`scrape_configs:
  - job_name: 'arcana-returns'
    scrape_interval: 30s
    static_configs:
      - targets: ['arcana-returns-api.fly.dev']
    metrics_path: '/metrics'
    scheme: 'https'`}
          </pre>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Performance Targets</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-800 text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">Metric</th>
                  <th className="px-4 py-2 text-left">Target</th>
                  <th className="px-4 py-2 text-left">Alert Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">Error Rate</td>
                  <td className="px-4 py-2">&lt; 1%</td>
                  <td className="px-4 py-2">&gt; 5%</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">Average Latency</td>
                  <td className="px-4 py-2">&lt; 200ms</td>
                  <td className="px-4 py-2">&gt; 1000ms</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">p99 Latency</td>
                  <td className="px-4 py-2">&lt; 500ms</td>
                  <td className="px-4 py-2">&gt; 2000ms</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">DLQ Size</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2">&gt; 100</td>
                </tr>
                <tr className="border-t border-gray-800">
                  <td className="px-4 py-2">Uptime</td>
                  <td className="px-4 py-2">99.9%</td>
                  <td className="px-4 py-2">&lt; 99%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Monitoring Best Practices</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Set up uptime monitoring:</strong> Use services like Pingdom or UptimeRobot to ping <code className="text-blue-400">/health</code> every minute</li>
            <li><strong>Monitor DLQ size:</strong> Check <code className="text-blue-400">/health/detailed</code> regularly and alert if unresolved events &gt; 100</li>
            <li><strong>Track error rates:</strong> Monitor error rate and alert if it exceeds 5% for more than 5 minutes</li>
            <li><strong>Monitor latency:</strong> Track p50, p95, and p99 latency. Alert if p99 &gt; 1000ms</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Debugging with Trace IDs</h2>
          <p className="mb-3">All responses include a <code>trace_id</code> for debugging:</p>
          
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "error": {
    "code": "RT-007",
    "message": "Invalid token signature",
    "trace_id": "trc_9Nf2kL5p"
  }
}`}
          </pre>
          
          <p className="text-sm text-gray-400 mt-3">
            💡 Include the <code className="text-blue-400">trace_id</code> when contacting 
            support for faster resolution!
          </p>
        </div>
      </div>
    </div>
  );
}
