import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateFreeToken, isFreeTokenUsed, markFreeTokenAsUsed } from '../lib/freeToken';
import { trackEvent } from '../lib/tracking';
import QueryAnalyzerCard from '../components/QueryAnalyzerCard';
import FreeTrialModal from '../components/FreeTrialModal';
import FloatingCta from '../components/FloatingCta';

interface AnalysisResult {
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  suggestedIndex: string;
  rewrittenQuery: string;
  speedupEstimate: number;
}

function Landing() {
  const [query, setQuery] = useState('');
  const [schema, setSchema] = useState('');
  const [explain, setExplain] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = () => {
    if (window.innerWidth < 768) {
      document.body.classList.add('is-mobile');
    } else {
      document.body.classList.remove('is-mobile');
      setMobileMenuOpen(false);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleAnalyze = async () => {
    if (!query.trim()) {
      alert('Please enter a SQL query');
      return;
    }

    if (!isAuthenticated && isFreeTokenUsed()) {
      setShowFreeTrialModal(true);
      return;
    }

    if (!isAuthenticated) {
      trackEvent('user_ran_free_analysis', {
        sql_length: query.length
      });
    } else {
      trackEvent('analysis_executed', {
        logged_in: true,
        sql_length: query.length
      });
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isAuthenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } else {
        const freeToken = getOrCreateFreeToken();
        headers['X-Free-Analysis-Token'] = freeToken;
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: query.trim(),
          schema: schema.trim() || undefined,
          explain: explain.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'free_limit_reached' || data.error === 'no_free_token') {
          markFreeTokenAsUsed();
          setShowFreeTrialModal(true);
          return;
        }
        throw new Error(data.message || 'Analysis failed');
      }

      if (!isAuthenticated) {
        markFreeTokenAsUsed();
      }

      setResult(data);
    } catch (error) {
      console.error('Error analyzing query:', error);
      alert('Failed to analyze query. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <style>{`
        .landing-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0c0e 0%, #0d0f11 50%, #0a0c0e 100%);
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .logo-container {
          display: flex;
          width: 100%;
          flex-direction: row;
          justify-content: center;
          align-items: center;
        }
        .neon-glow {
          text-shadow: 0 0 40px rgba(0, 255, 163, 0.6), 0 0 80px rgba(0, 255, 163, 0.3);
        }

        .brand-logo {
          font-size: 56px;
          font-weight: 900;
          background: linear-gradient(135deg, #00ffa3 0%, #00cc82 50%, #00ffa3 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          display: inline-block;
        }

        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        .animated-terminal {
          background: #0a0c0e;
          border: 2px solid #1f2327;
          border-radius: 12px;
          padding: 24px;
          margin: 48px auto;
          max-width: 700px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 255, 163, 0.15);
        }

        .terminal-header {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .terminal-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
        }

        .terminal-dot:nth-child(2) { background: #eab308; }
        .terminal-dot:nth-child(3) { background: #10b981; }

        .terminal-line {
          font-family: 'Fira Code', monospace;
          font-size: 13px;
          line-height: 1.8;
          color: #9ca3af;
          margin-bottom: 4px;
          opacity: 0;
          animation: typeIn 0.5s ease forwards;
        }

        .terminal-line:nth-child(1) { animation-delay: 0.2s; }
        .terminal-line:nth-child(2) { animation-delay: 0.8s; }
        .terminal-line:nth-child(3) { animation-delay: 1.4s; }
        .terminal-line:nth-child(4) { animation-delay: 2s; }
        .terminal-line:nth-child(5) { animation-delay: 2.6s; }

        @keyframes typeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .keyword { color: #8b5cf6; }
        .string { color: #10b981; }
        .comment { color: #6b7280; }
        .success { color: #00ffa3; font-weight: 600; }

        .query-textarea {
          background: #0a0c0e;
          border: 2px solid #1f2327;
          color: #e5e5e5;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 15px;
          width: 100%;
          padding: 20px;
          border-radius: 12px;
          resize: vertical;
          min-height: 150px;
          transition: all 0.3s ease;
          line-height: 1.6;
        }

        .query-textarea::placeholder {
          color: #4b5563;
        }

        .query-textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 4px rgba(0, 255, 163, 0.15), 0 0 30px rgba(0, 255, 163, 0.2);
        }

        .analyze-button {
          background: linear-gradient(135deg, #00ffa3 0%, #00cc82 100%);
          color: #0d0f11;
          border: none;
          padding: 18px 48px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 30px rgba(0, 255, 163, 0.5), 0 4px 20px rgba(0, 255, 163, 0.3);
        }

        .toggle-link {
          color: #00ffa3;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 1px dashed #00ffa3;
          cursor: pointer;
        }

        .toggle-link:hover { opacity: 0.8; }

        .auth-links {
          top: 24px;
          right: 24px;
          display: flex;
          gap: 20px;
          align-items: center;
          z-index: 1000;
        }

        .auth-link {
          color: #9ca3af;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .auth-link:hover {
          color: #00ffa3;
          background: rgba(0, 255, 163, 0.1);
        }

        .auth-link.signup {
          background: #00ffa3;
          color: #0d0f11;
        }

        .auth-link.signup:hover {
          background: #00cc82;
        }

        .mobile-menu-button {
          display: none;
          background: none;
          border: none;
          color: #00ffa3;
          font-size: 28px;
          cursor: pointer;
          padding: 8px;
          z-index: 1001;
        }

        body.is-mobile .desktop-menu {
          display: none !important;
        }

        body.is-mobile .mobile-menu-button {
          display: block !important;
        }

        .mobile-menu {
          display: none;
          position: fixed;
          top: 0;
          right: 0;
          width: 100%;
          height: 100vh;
          background: rgba(10, 12, 14, 0.98);
          backdrop-filter: blur(10px);
          z-index: 1000;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 32px;
        }

        .mobile-menu.open {
          display: flex;
        }

        .mobile-menu a {
          color: #e5e5e5;
          text-decoration: none;
          font-size: 24px;
          font-weight: 600;
          padding: 16px 32px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .mobile-menu a:hover {
          color: #00ffa3;
          background: rgba(0, 255, 163, 0.1);
        }

        .mobile-menu a.signup {
          background: #00ffa3;
          color: #0d0f11;
        }

        .mobile-menu a.signup:hover {
          background: #00cc82;
        }

        @media (max-width: 767px) {
          .desktop-menu {
            display: none;
          }

          .mobile-menu-button {
            display: block;
          }
        }
      `}</style>

      <div className="landing-page">
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="/login" onClick={() => setMobileMenuOpen(false)}>Sign in</a>
          <a
            href="/signup"
            className="signup"
            onClick={() => {
              setMobileMenuOpen(false);
              trackEvent('user_opened_signup_modal');
            }}
          >
            Sign up
          </a>
        </div>

        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '80px 24px 100px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '60px', position: 'relative' }}>
            <div className="brand-logo">
              DBPowerAI
            </div>

            <h1 className="neon-glow" style={{
              fontSize: 'clamp(40px, 6vw, 68px)',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '20px',
              lineHeight: '1.1',
              letterSpacing: '-0.03em'
            }}>
              Fix Slow SQL Queries Automatically with a Rule-Based Analyzer
            </h1>
            <h2>
            Detect slow SQL queries automatically. DBPowerAI analyzes EXPLAIN plans, identifies missing indexes, JOIN issues & performance bottlenecks. MySQL & PostgreSQL. Rule-based AI + DevOps integration.
            </h2>
            <p style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              color: '#00ffa3',
              marginBottom: '24px',
              fontWeight: '600'
            }}>
              Without becoming a DBA.
            </p>
          <FloatingCta />
            <p style={{
              fontSize: '18px',
              color: '#9ca3af',
              lineHeight: '1.7',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              Paste a slow query, click Analyze, and watch the magic happen:<br />
              score, issues, index suggestions, rewritten fix, and estimated speedup.<br />
              <span style={{ color: '#6b7280', fontSize: '16px' }}>
                It feels like a game — but it actually works.
              </span>
            </p>

            <div className="animated-terminal">
              <div className="terminal-header">
                <div className="terminal-dot"></div>
                <div className="terminal-dot"></div>
                <div className="terminal-dot"></div>
              </div>
              <div>
                <div className="terminal-line">
                  <span className="comment">// Your slow query</span>
                </div>
                <div className="terminal-line">
                  <span className="keyword">SELECT</span> * <span className="keyword">FROM</span> orders <span className="keyword">WHERE</span> status = <span className="string">'PENDING'</span>
                </div>
                <div className="terminal-line">
                  <span className="comment">↓ DBPowerAI analyzing...</span>
                </div>
                <div className="terminal-line">
                  <span className="success">✓ Optimized query ready</span>
                </div>
                <div className="terminal-line">
                  <span className="success">✓ Index suggestion: CREATE INDEX idx_orders_status</span>
                </div>
              </div>
            </div>
          </div>


          <div style={{
            background: '#111418',
            border: '2px solid #1f2327',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <textarea
              className="query-textarea"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM orders WHERE status = 'PENDING' AND updated_at > NOW() - INTERVAL 5 DAY;"
            />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              marginTop: '24px'
            }}>
              <button
                className="analyze-button"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : 'Analyze now'}
              </button>

              <span
                className="toggle-link"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '▼' : '▶'} Add schema / EXPLAIN (optional)
              </span>
            </div>

            {showAdvanced && (
              <div className="advanced-fields" style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#9ca3af',
                    marginBottom: '8px'
                  }}>
                    Schema (optional)
                  </label>
                  <textarea
                    className="query-textarea"
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    placeholder="CREATE TABLE orders (&#10;  id INT PRIMARY KEY,&#10;  status VARCHAR(50),&#10;  updated_at TIMESTAMP&#10;);"
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#9ca3af',
                    marginBottom: '8px'
                  }}>
                    EXPLAIN output (optional)
                  </label>
                  <textarea
                    className="query-textarea"
                    value={explain}
                    onChange={(e) => setExplain(e.target.value)}
                    placeholder="Paste your EXPLAIN output here..."
                    style={{ minHeight: '100px' }}
                  />
                </div>
              </div>
            )}

            <div style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Or{' '}
              <a
                href="/signup"
                style={{ color: '#00ffa3', textDecoration: 'underline' }}
                onClick={() => trackEvent('user_clicked_create_api_key')}
              >
                create your API Key
              </a>
              {' '}and send queries via webhook
            </div>
          </div>

          {result && (
            <div style={{ marginTop: '48px' }}>
              <QueryAnalyzerCard result={result} />
            </div>
          )}

          {!isAuthenticated && !isFreeTokenUsed() && (
            <div style={{
              marginTop: '48px',
              padding: '24px',
              background: 'rgba(0, 255, 163, 0.05)',
              border: '1px solid rgba(0, 255, 163, 0.2)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '15px',
                color: '#9ca3af',
                marginBottom: '12px'
              }}>
                🎁 You have <strong style={{ color: '#00ffa3' }}>1 free analysis</strong> remaining
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Sign up for unlimited access — it's free!
              </p>
            </div>
          )}
        </div>
<>
  {/* ============================ */}
  {/*      HOW DBPOWERAI WORKS     */}
  {/* ============================ */}

  <section
    style={{
      maxWidth: "860px",
      margin: "100px auto 60px",
      padding: "0 20px",
      color: "white",
    }}
  >
    <h2
      style={{
        textAlign: "center",
        fontSize: "2.2rem",
        fontWeight: 700,
        marginBottom: "50px",
        color: "#00FFB2",
      }}
    >
      How DBPowerAI Works
    </h2>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "45px",
        fontSize: "1.15rem",
        lineHeight: 1.7,
      }}
    >
      {/* Step 1 */}
      <div>
        <h3
          style={{
            fontSize: "1.4rem",
            color: "#00FFB2",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          1. Paste a slow SQL query
        </h3>
        <p style={{ opacity: 0.85 }}>
          You paste the SQL query you want to analyze. DBPowerAI works
          completely manually today — no setup, no ingestion, no DB connection
          required.
        </p>
      </div>

      {/* Step 2 */}
      <div>
        <h3
          style={{
            fontSize: "1.4rem",
            color: "#00FFB2",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          2. (Optional) Add schema or EXPLAIN
        </h3>
        <p style={{ opacity: 0.85 }}>
          Add CREATE TABLE statements or EXPLAIN output if you want deeper
          diagnostics. DBPowerAI works with or without it — perfect for quick
          debugging.
        </p>
      </div>

      {/* Step 3 */}
      <div>
        <h3
          style={{
            fontSize: "1.4rem",
            color: "#00FFB2",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          3. AI-enhanced rule engine
        </h3>
        <p style={{ opacity: 0.85 }}>
          DBPowerAI combines SQL-aware AI with deterministic rules to detect the
          most common performance issues: full table scans, missing indexes,
          inefficient JOINs, OR conditions, functions disabling indexes and
          implicit casts.
        </p>
      </div>

      {/* Step 4 */}
      <div>
        <h3
          style={{
            fontSize: "1.4rem",
            color: "#00FFB2",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          4. Get fixes, index suggestions & rewritten SQL
        </h3>
        <p style={{ opacity: 0.85 }}>
          You receive concrete index suggestions, rewritten queries, efficiency
          scores and estimated speedups — all explained clearly, even if you're
          not a DBA.
        </p>
      </div>

      {/* Step 5 */}
      <div>
        <h3
          style={{
            fontSize: "1.4rem",
            color: "#00FFB2",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          5. Coming soon: API, CI/CD & Slack alerts
        </h3>
        <p style={{ opacity: 0.85 }}>
          The next version will add API automation, webhook triggers,
          performance gates in CI/CD pipelines and Slack notifications. Today,
          everything is manual and instantly usable.
        </p>
      </div>
    </div>
  </section>

  {/* ============================ */}
  {/*      SUPPORTED DATABASES     */}
  {/* ============================ */}

  <section
    style={{
      maxWidth: "860px",
      margin: "100px auto 60px",
      padding: "0 20px",
      color: "white",
    }}
  >
    <h2
      style={{
        textAlign: "center",
        fontSize: "2.2rem",
        fontWeight: 700,
        marginBottom: "40px",
        color: "#00FFB2",
      }}
    >
      Supported Databases
    </h2>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "40px",
        fontSize: "1.15rem",
        lineHeight: 1.7,
      }}
    >
      <div>
        <h3 style={{ fontSize: "1.4rem", color: "#00FFB2", marginBottom: "8px" }}>
          MySQL
        </h3>
        <p style={{ opacity: 0.85 }}>
          Works with MySQL 5.7 and MySQL 8. Paste your SQL and optional EXPLAIN
          for accurate diagnostics.
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: "1.4rem", color: "#00FFB2", marginBottom: "8px" }}>
          PostgreSQL
        </h3>
        <p style={{ opacity: 0.85 }}>
          Supports PostgreSQL 12+. DBPowerAI analyzes EXPLAIN output, JOIN
          plans, index usage and query shape.
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: "1.4rem", color: "#00FFB2", marginBottom: "8px" }}>
          Cloud Databases
        </h3>
        <p style={{ opacity: 0.85 }}>
          Fully compatible with Amazon RDS, AWS Aurora, Azure Database and
          Google Cloud SQL — just paste your SQL.
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: "1.4rem", color: "#00FFB2", marginBottom: "8px" }}>
          Local & Docker environments
        </h3>
        <p style={{ opacity: 0.85 }}>
          Works with any local or containerized database. No installation
          needed, no credentials required.
        </p>
      </div>
    </div>
  </section>

  {/* ============================ */}
  {/*   WHY SQL QUERIES ARE SLOW   */}
  {/* ============================ */}

  <section
    style={{
      maxWidth: "860px",
      margin: "100px auto 60px",
      padding: "0 20px",
      color: "white",
    }}
  >
    <h2
      style={{
        textAlign: "center",
        fontSize: "2.2rem",
        fontWeight: 700,
        marginBottom: "40px",
        color: "#00FFB2",
      }}
    >
      Why SQL Queries Become Slow
    </h2>

    <ul
      style={{
        listStyle: "none",
        paddingLeft: 0,
        fontSize: "1.15rem",
        lineHeight: 1.9,
        opacity: 0.85,
      }}
    >
      <li>• Missing or incorrect indexes</li>
      <li>• Full table scans on large datasets</li>
      <li>• Inefficient JOINs or nested loops</li>
      <li>• Functions on indexed columns</li>
      <li>• OR conditions disabling index usage</li>
      <li>• Implicit type casts and mismatches</li>
      <li>• Sorting or grouping without proper indexes</li>
    </ul>
  </section>

  {/* ============================ */}
  {/*       WHO IS IT FOR?         */}
  {/* ============================ */}

  <section
    style={{
      maxWidth: "860px",
      margin: "100px auto 60px",
      padding: "0 20px",
      color: "white",
    }}
  >
    <h2
      style={{
        textAlign: "center",
        fontSize: "2.2rem",
        fontWeight: 700,
        marginBottom: "40px",
        color: "#00FFB2",
      }}
    >
      Who DBPowerAI Is For
    </h2>

    <ul
      style={{
        listStyle: "none",
        paddingLeft: 0,
        fontSize: "1.15rem",
        lineHeight: 1.9,
        opacity: 0.85,
      }}
    >
      <li>• Backend developers debugging slow SQL</li>
      <li>• Teams without a dedicated DBA</li>
      <li>• Startups scaling their first SQL workloads</li>
      <li>• SaaS teams monitoring performance regressions</li>
      <li>• Engineers wanting clear, actionable insights</li>
    </ul>
  </section>

  {/* ============================ */}
  {/*           USE CASES          */}
  {/* ============================ */}

  <section
    style={{
      maxWidth: "860px",
      margin: "100px auto 60px",
      padding: "0 20px",
      color: "white",
    }}
  >
    <h2
      style={{
        textAlign: "center",
        fontSize: "2.2rem",
        fontWeight: 700,
        marginBottom: "40px",
        color: "#00FFB2",
      }}
    >
      Use Cases
    </h2>

    <ul
      style={{
        listStyle: "none",
        paddingLeft: 0,
        fontSize: "1.15rem",
        lineHeight: 1.9,
        opacity: 0.85,
      }}
    >
      <li>• Optimize expensive queries before release</li>
      <li>• Debug slow endpoints caused by SQL bottlenecks</li>
      <li>• Validate database performance in code reviews</li>
      <li>• Learn SQL performance tuning faster</li>
      <li>• Compare different versions of a query</li>
    </ul>
  </section>
</>


        {/* Pricing Teaser Section */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0c0e 0%, #111418 100%)',
          borderTop: '1px solid rgba(0, 255, 163, 0.1)',
          padding: '80px 24px',
          marginTop: '60px'
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: 'clamp(32px, 5vw, 42px)',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
            }}>
              Simple Pricing
            </h3>
            <p style={{
              fontSize: '18px',
              color: '#9ca3af',
              marginBottom: '32px'
            }}>
              Start free. Upgrade when you need more power.
            </p>

            {/* Early Access Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              borderRadius: '16px',
              padding: '20px 28px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '48px',
              maxWidth: '700px',
              margin: '0 auto 48px'
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '6px',
              }}>
                🔥
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '6px',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}>
                Early Access Offer
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#ffffff',
                margin: 0,
                lineHeight: '1.5',
              }}>
                Sign up now and get full access to DBPowerAI for free until December 31, 2025.
                <br />
                No credit card required.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {/* Free Plan Card */}
              <div style={{
                background: '#0d0f11',
                border: '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '32px 24px',
                position: 'relative',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.2)';
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px'
                }}>
                  Free Plan
                </div>
                <div style={{
                  fontSize: '42px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  €0
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    /forever
                  </span>
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0',
                  textAlign: 'left'
                }}>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#3b82f6'
                    }}>✓</span>
                    1 free analysis
                  </li>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#3b82f6'
                    }}>✓</span>
                    No credit card required
                  </li>
                </ul>
                <a
                  href="/pricing"
                  style={{
                    display: 'inline-block',
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Learn more →
                </a>
              </div>

              {/* Web Plan Card */}
              <div style={{
                background: '#0d0f11',
                border: '2px solid #00ffa3',
                borderRadius: '16px',
                padding: '32px 24px',
                position: 'relative',
                boxShadow: '0 0 30px rgba(0, 255, 163, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 255, 163, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 163, 0.2)';
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#00ffa3',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px'
                }}>
                  Web Analyzer
                </div>
                <div style={{
                  fontSize: '42px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  €9
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    /month
                  </span>
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0',
                  textAlign: 'left'
                }}>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#00ffa3'
                    }}>✓</span>
                    100 analyses/month
                  </li>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#00ffa3'
                    }}>✓</span>
                    Full Web UI
                  </li>
                </ul>
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  Free for Early Adopters until Dec 31, 2025.
                </p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    console.info('Early Access Mode: Upgrade disabled');
                  }}
                  style={{
                    display: 'inline-block',
                    color: '#6b7280',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'not-allowed'
                  }}
                >
                  Available after launch
                </a>
              </div>

              {/* API Plan Card */}
              <div style={{
                background: '#0d0f11',
                border: '2px solid #8b5cf6',
                borderRadius: '16px',
                padding: '32px 24px',
                position: 'relative',
                opacity: 0.85,
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.2)';
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#8b5cf6',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Coming Soon
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#8b5cf6',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px'
                }}>
                  API Analyzer
                </div>
                <div style={{
                  fontSize: '42px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  €19
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    /month
                  </span>
                </div>
                <p style={{
                  fontSize: '13px',
                  color: '#8b5cf6',
                  fontWeight: '600',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  Coming 2026
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0',
                  textAlign: 'left'
                }}>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#8b5cf6'
                    }}>✓</span>
                    API + webhook integration
                  </li>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    marginBottom: '10px',
                    paddingLeft: '24px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#8b5cf6'
                    }}>✓</span>
                    Automation ready
                  </li>
                </ul>
                <a
                  href="/pricing"
                  style={{
                    display: 'inline-block',
                    color: '#8b5cf6',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        </div>

        {showFreeTrialModal && (
          <FreeTrialModal onClose={() => setShowFreeTrialModal(false)} />
        )}
      </div>
    </>
  );
}

export default Landing;
