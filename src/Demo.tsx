import { useState, useRef, useEffect } from 'react';

function Demo() {
  const [query, setQuery] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleOptimize = () => {
    if (!query.trim()) return;

    setIsOptimizing(true);

    setTimeout(() => {
      setShowOutput(true);
      setIsOptimizing(false);

      setTimeout(() => {
        outputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }, 300);
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
        }

        .page-fade-in {
          animation: pageFadeIn 0.6s ease;
        }

        @keyframes pageFadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .output-fade-in {
          animation: outputFadeIn 0.4s ease;
        }

        @keyframes outputFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        textarea {
          background: #111418;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          transition: all 0.2s ease;
          font-family: 'Fira Code', 'Courier New', monospace;
        }

        textarea::placeholder {
          color: #6b7280;
        }

        textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        .optimize-button {
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 16px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
        }

        .optimize-button:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .optimize-button:active:not(:disabled) {
          transform: scale(0.97);
        }

        .optimize-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .output-box {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          margin-top: 40px;
        }

        .output-section {
          margin-bottom: 28px;
        }

        .output-section:last-child {
          margin-bottom: 0;
        }

        .output-label {
          color: #00ffa3;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
        }

        .output-code {
          background: #14161a;
          border: 1px solid #1f2327;
          border-radius: 8px;
          padding: 20px;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #e5e5e5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .output-text {
          color: #9ca3af;
          font-size: 15px;
          line-height: 1.8;
        }

        .nav-link {
          position: fixed;
          top: 20px;
          left: 20px;
          color: #00ffa3;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 16px;
          border: 1px solid #1f2327;
          border-radius: 8px;
          background: rgba(17, 20, 24, 0.8);
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
          z-index: 1000;
        }

        .nav-link:hover {
          border-color: #00ffa3;
          background: rgba(0, 255, 163, 0.1);
        }

        @media (max-width: 768px) {
          .nav-link {
            top: 10px;
            left: 10px;
            font-size: 13px;
            padding: 8px 12px;
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11', padding: '60px 20px' }}>
        <a href="/" className="nav-link">
          ← Back to Home
        </a>

        <div className="page-fade-in" style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          {/* Page Title */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{
              fontSize: '42px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
            }}>
              DBPowerAI — Query Optimization Preview
            </h1>

            <p style={{
              fontSize: '18px',
              color: '#9ca3af',
              marginBottom: '12px'
            }}>
              Paste a SQL query below and preview how the optimizer will respond.
            </p>

            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              (This is an early preview; example output is static.)
            </p>
          </div>

          {/* SQL Input */}
          <div style={{
            background: '#111418',
            border: '1px solid #1f2327',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <label
              htmlFor="sql-input"
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '16px',
                color: '#e5e5e5',
                marginBottom: '12px',
              }}
            >
              Your SQL Query
            </label>

            <textarea
              id="sql-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM users WHERE email = 'test@example.com';"
              rows={8}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '15px',
                borderRadius: '8px',
                resize: 'vertical',
                minHeight: '200px',
              }}
            />
          </div>

          {/* Optimize Button */}
          <button
            className="optimize-button"
            onClick={handleOptimize}
            disabled={!query.trim() || isOptimizing}
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize Query'}
          </button>

          {/* Output Section */}
          {showOutput && (
            <div ref={outputRef} className="output-box output-fade-in">
              <div className="output-section">
                <div className="output-label">Optimized Query</div>
                <div className="output-code">
{`SELECT id, email
FROM users
WHERE email = :email;`}
                </div>
              </div>

              <div className="output-section">
                <div className="output-label">Suggested Index</div>
                <div className="output-code">
{`CREATE INDEX idx_users_email ON users(email);`}
                </div>
              </div>

              <div className="output-section">
                <div className="output-label">Bottleneck</div>
                <div className="output-text">
                  Full table scan caused by missing index on <code style={{
                    background: '#1f2327',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#00ffa3',
                    fontFamily: 'monospace'
                  }}>email</code> column.
                </div>
              </div>

              <div className="output-section">
                <div className="output-label">Notes</div>
                <div className="output-text">
                  Filtering with a non-indexed text column leads to full table scans.
                  Adding a simple B-tree index dramatically reduces IO and improves latency.
                </div>
              </div>
            </div>
          )}

          {/* CTA at bottom */}
          {showOutput && (
            <div style={{
              textAlign: 'center',
              marginTop: '60px',
              padding: '40px',
              background: '#111418',
              border: '1px solid #1f2327',
              borderRadius: '12px'
            }} className="output-fade-in">
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                Want to test your own queries?
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#9ca3af',
                marginBottom: '24px'
              }}>
                Join the early access list to be notified when we launch.
              </p>
              <a
                href="/#early-access"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#00ffa3',
                  color: '#0d0f11',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 25px rgba(0, 255, 163, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 255, 163, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 163, 0.4)';
                }}
              >
                Join Early Access
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Demo;
