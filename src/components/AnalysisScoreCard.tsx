interface AnalysisScoreCardProps {
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  speedupEstimate: number;
  indexCount?: number;
}

function AnalysisScoreCard({ score, severity, speedupEstimate, indexCount = 0 }: AnalysisScoreCardProps) {
  const getSeverityColor = () => {
    switch (severity) {
      case 'high':
      case 'critical':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getSeverityLabel = () => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Very good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Low';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    }}>
      {/* Score Card */}
      <div style={{
        background: '#0a0c0e',
        border: '2px solid #00ffa3',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '700',
          color: '#00ffa3',
          marginBottom: '8px'
        }}>
          {score}
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '4px'
        }}>
          SCORE (Original query)
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6b7280'
        }}>
          {getScoreLabel()}
        </div>
      </div>

      {/* Index Count / Severity Card */}
      <div style={{
        background: '#0a0c0e',
        border: `2px solid ${getSeverityColor()}`,
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {indexCount === 0 ? (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: getSeverityColor(),
              marginBottom: '12px'
            }} />
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '4px'
            }}>
              MISSING INDEX
            </div>
            <div style={{
              fontSize: '13px',
              color: getSeverityColor(),
              fontWeight: '600'
            }}>
              {getSeverityLabel()}
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#00ffa3',
              marginBottom: '8px'
            }}>
              {indexCount}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '4px'
            }}>
              {indexCount === 1 ? 'INDEX SUGGESTED' : 'INDEXES SUGGESTED'}
            </div>
            <div style={{
              fontSize: '13px',
              color: '#6b7280'
            }}>
              Performance Boost
            </div>
          </>
        )}
      </div>

      {/* Speedup Estimate Card */}
      <div style={{
        background: '#0a0c0e',
        border: '2px solid #00ffa3',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '700',
          color: '#00ffa3',
          marginBottom: '8px'
        }}>
          +{Math.round(speedupEstimate * 100)}%
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '4px'
        }}>
          ESTIMATED SPEEDUP
          </div>
        <div style={{
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Performance Gain
        </div>
      </div>
    </div>
  );
}

export default AnalysisScoreCard;
