import { useEffect } from 'react';
import { Copy, Check, Terminal, Code } from 'lucide-react';

function APIPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1800);
  };

  const exampleRequest = `
POST https://<your-project>.supabase.co/functions/v1/analyze
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "query": "SELECT * FROM orders WHERE customer_id = 42",
  "db": "PostgreSQL"
}
`.trim();

  const exampleResponse = `
{
  "success": true,
  "severity": "medium",
  "improvement": 42,
  "bottleneck": "Missing index on customer_id",
  "suggested_indexes": "CREATE INDEX idx_orders_customer_id ON orders(customer_id);",
  "rewritten_query": "SELECT * FROM orders WHERE customer_id = 42 /* optimized */",
  "patterns": [
    {
      "type": "non_sargable_filter",
      "severity": "medium",
      "message": "Filter can be optimized using proper indexing"
    }
  ]
}
  `.trim();

  const curlExample = `
curl -X POST "https://<your-project>.supabase.co/functions/v1/analyze" \\
  -H "Authorization: Bearer <your-access-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "SELECT * FROM orders WHERE customer_id = 42",
    "db": "PostgreSQL"
  }'
  `.trim();

  return (
    <>
      <style>{`
        body {
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', sans-serif;
        }

        .page-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 16px;
        }

        .title {
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 16px;
          text-shadow: 0 0 30px rgba(0,255,163,0.3);
        }

        .subtitle {
          font-size: clamp(16px, 3vw, 20px);
          color: #9ca3af;
          margin-bottom: 40px;
        }

        .badge {
          display: inline-block;
          padding: 6px 14px;
          background: rgba(0,255,163,0.1);
          border: 1px solid rgba(0,255,163,0.3);
          color: #00ffa3;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .section {
          margin-bottom: 48px;
        }

        .section-title {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .section-desc {
          color: #9ca3af;
          font-size: 16px;
          margin-bottom: 24px;
        }

        .code-block {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-left: 3px solid rgba(0,255,163,0.5);
          border-radius: 8px;
          padding: 20px;
          font-family: "Fira Code", monospace;
          font-size: 14px;
          white-space: pre-wrap;
          word-break: break-word;
          position: relative;
        }

        .copy-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: 1px solid #1f2327;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          gap: 6px;
          color: #9ca3af;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .copy-btn.copied {
          border-color: #00ffa3;
          color: #00ffa3;
        }

      `}</style>

      <div className="page-container page-fade-in">
        
        {/* TOP */}
        <span className="badge">API Preview</span>
        <h1 className="title">DBPowerAI API</h1>
        <p className="subtitle">
          Integrate AI-powered SQL optimization directly into your application.  
          Run EXPLAIN analysis, detect bottlenecks, rewrite queries, and generate 
          index recommendations programmatically.
        </p>

        {/* ENDPOINT SECTION */}
        <div className="section">
          <h2 className="section-title">Endpoint</h2>
          <p className="section-desc">
            The first available endpoint analyzes SQL queries and returns optimization insights.
          </p>

          <div className="code-block" id="endpoint">
            POST /functions/v1/analyze  
            <button
              className="copy-btn"
              id="copy-endpoint"
              onClick={() => copy("POST /functions/v1/analyze", "copy-endpoint")}
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>

        {/* REQUEST EXAMPLE */}
        <div className="section">
          <h2 className="section-title">Example Request</h2>

          <div className="code-block" id="req-example">
            {exampleRequest}
            <button
              className="copy-btn"
              id="copy-req"
              onClick={() => copy(exampleRequest, "copy-req")}
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>

        {/* cURL */}
        <div className="section">
          <h2 className="section-title">cURL Example</h2>

          <div className="code-block" id="curl-example">
            {curlExample}
            <button
              className="copy-btn"
              id="copy-curl"
              onClick={() => copy(curlExample, "copy-curl")}
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>

        {/* RESPONSE EXAMPLE */}
        <div className="section">
          <h2 className="section-title">Example Response</h2>

          <div className="code-block" id="res-example">
            {exampleResponse}
            <button
              className="copy-btn"
              id="copy-res"
              onClick={() => copy(exampleResponse, "copy-res")}
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>

        {/* COMING SOON */}
        <div className="section" style={{ marginTop: '60px' }}>
          <h2 className="section-title">Coming Soon</h2>
          <p className="section-desc">
            More API endpoints will be added:
          </p>

          <ul style={{ color: '#9ca3af', lineHeight: '1.8' }}>
            <li>✔ Query validation API</li>
            <li>✔ Bulk query analysis</li>
            <li>✔ Index advisor endpoint</li>
            <li>✔ Full DB health-check API</li>
          </ul>
        </div>

      </div>
    </>
  );
}

export default APIPage;
