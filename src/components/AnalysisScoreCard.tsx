interface AnalysisScoreCardProps {
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  speedupEstimate: number;
}

function AnalysisScoreCard({ score, severity, speedupEstimate }: AnalysisScoreCardProps) {
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
    if (score >= 80) return 'Ottimo';
    if (score >= 60) return 'Buono';
    if (score >= 40) return 'Medio';
    return 'Basso';
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
          SCORE
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6b7280'
        }}>
          {getScoreLabel()}
        </div>
      </div>

      {/* Missing Index / Severity Card */}
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
          SPEEDUP STIMATO
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
