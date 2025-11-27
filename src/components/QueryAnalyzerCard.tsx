interface AnalysisResult {
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  suggestedIndex: string;
  rewrittenQuery: string;
  speedupEstimate: number;
}

interface Props {
  result: AnalysisResult;
}

function QueryAnalyzerCard({ result }: Props) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <style>{`
        .result-card {
          background: #111418;
          border: 2px solid #1f2327;
          border-radius: 16px;
          padding: 32px;
          animation: fadeInUp 0.5s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: linear-gradient(135deg, #0a0c0e 0%, #111418 100%);
          border: 1px solid;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: currentColor;
          opacity: 0.5;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .stat-value {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
        }

        .code-output {
          background: #0a0c0e;
          border: 2px solid #1f2327;
          border-radius: 12px;
          padding: 24px;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.7;
          overflow-x: auto;
          margin-top: 20px;
        }

        .code-header {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
          color: #00ffa3;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .issue-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .issue-item {
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid #ef4444;
          padding: 12px 16px;
          margin-bottom: 12px;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.6;
        }

        .speedup-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="result-card">
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          📊 Analysis Results
        </h2>

        <div className="stats-grid">
          <div
            className="stat-card"
            style={{
              borderColor: getScoreColor(result.score),
              color: getScoreColor(result.score)
            }}
          >
            <div className="stat-value">{result.score}</div>
            <div className="stat-label" style={{ color: '#9ca3af' }}>Score</div>
            <div style={{
              fontSize: '11px',
              marginTop: '8px',
              color: '#6b7280',
              fontWeight: '600'
            }}>
              {result.severity === 'critical' && 'Critico'}
              {result.severity === 'high' && 'Alto'}
              {result.severity === 'medium' && 'Medio'}
              {result.severity === 'low' && 'Basso'}
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              borderColor: getSeverityColor(result.severity),
              color: getSeverityColor(result.severity)
            }}
          >
            <div style={{
              fontSize: '36px',
              marginBottom: '8px'
            }}>
              {result.severity === 'critical' && '🔴'}
              {result.severity === 'high' && '🟠'}
              {result.severity === 'medium' && '🟡'}
              {result.severity === 'low' && '🟢'}
            </div>
            <div className="stat-label" style={{ color: '#9ca3af' }}>Missing Index</div>
            <div style={{
              fontSize: '12px',
              marginTop: '8px',
              color: '#9ca3af',
              fontWeight: '600'
            }}>
              {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              borderColor: '#10b981',
              color: '#10b981'
            }}
          >
            <div className="stat-value">
              +{Math.round(result.speedupEstimate * 100)}%
            </div>
            <div className="stat-label" style={{ color: '#9ca3af' }}>Speedup Stimato</div>
            <div style={{
              fontSize: '11px',
              marginTop: '8px',
              color: '#6b7280',
              fontWeight: '600'
            }}>
              Performance Gain
            </div>
          </div>
        </div>

        {result.issues.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span> Problems Found
            </h3>
            <ul className="issue-list">
              {result.issues.map((issue, index) => (
                <li key={index} className="issue-item">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.suggestedIndex && (
          <div className="code-output">
            <div className="code-header">
              <span>✨</span>
              <span>Crea un indice:</span>
            </div>
            <pre style={{
              margin: 0,
              color: '#00ffa3',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {result.suggestedIndex}
            </pre>
          </div>
        )}

        {result.rewrittenQuery && (
          <div className="code-output">
            <div className="code-header">
              <span>🔄</span>
              <span>Rewritten Query</span>
              <span className="speedup-badge">
                <span>⚡</span>
                +{Math.round(result.speedupEstimate * 100)}% faster
              </span>
            </div>
            <pre style={{
              margin: 0,
              color: '#e5e5e5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {result.rewrittenQuery}
            </pre>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(0, 255, 163, 0.05)',
          border: '1px solid rgba(0, 255, 163, 0.2)',
          borderRadius: '12px'
        }}>
          <p style={{
            fontSize: '15px',
            color: '#9ca3af',
            marginBottom: '12px'
          }}>
            Want to save this analysis and track your optimizations?
          </p>
          <a
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#00ffa3',
              color: '#0d0f11',
              padding: '12px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: '700',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00cc82';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#00ffa3';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Create Free Account
          </a>
        </div>
      </div>
    </>
  );
}

export default QueryAnalyzerCard;
