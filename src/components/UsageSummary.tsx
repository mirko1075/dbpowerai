import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UsageSummaryProps {
  planName?: string;
  analysisUsed?: number;
  analysisLimit?: number;
  tokenUsed?: number;
  tokenLimit?: number;
}

interface UserPlan {
  plan: 'free' | 'web' | 'api' | 'early_adopter';
  analysis_used: number;
  analysis_limit: number;
  token_used: number;
  token_limit: number;
  early_expires_at?: string | null;
}

function UsageSummary({
  planName,
  analysisUsed,
  analysisLimit,
  tokenUsed,
  tokenLimit
}: UsageSummaryProps) {
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planName !== undefined && analysisUsed !== undefined && analysisLimit !== undefined && tokenUsed !== undefined && tokenLimit !== undefined) {
      setLoading(false);
      return;
    }

    const fetchUserPlan = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data: planData, error: planError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!planError && planData) {
          setUserPlan(planData);
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, [planName, analysisUsed, analysisLimit, tokenUsed, tokenLimit]);

  const displayPlan = planName || (userPlan?.plan === 'early_adopter' ? 'Early Adopter' : userPlan?.plan === 'free' ? 'Free' : userPlan?.plan === 'web' ? 'Web' : userPlan?.plan === 'api' ? 'API' : 'Free');
  const displayAnalysisUsed = analysisUsed ?? userPlan?.analysis_used ?? 0;
  const displayAnalysisLimit = analysisLimit ?? userPlan?.analysis_limit ?? 20;
  const displayTokenUsed = tokenUsed ?? userPlan?.token_used ?? 0;
  const displayTokenLimit = tokenLimit ?? userPlan?.token_limit ?? 40000;

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #111418 0%, #0d0f11 100%)',
        border: '1px solid #1f2327',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ color: '#9ca3af', textAlign: 'center' }}>Loading usage...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #111418 0%, #0d0f11 100%)',
      border: '1px solid #1f2327',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '700',
          color: '#e5e5e5'
        }}>
          Usage Statistics
        </h3>
        <span style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#00ffa3',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding: '4px 12px',
          background: 'rgba(0, 255, 163, 0.1)',
          border: '1px solid rgba(0, 255, 163, 0.3)',
          borderRadius: '6px'
        }}>
          {displayPlan}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>Analyses</span>
          <span style={{ fontSize: '14px', color: '#e5e5e5', fontWeight: '700' }}>
            {displayAnalysisUsed} / {displayAnalysisLimit}
          </span>
        </div>
        <div style={{
          background: '#0a0c0e',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: displayAnalysisUsed >= displayAnalysisLimit ? '#ef4444' :
                      displayAnalysisUsed >= displayAnalysisLimit - 2 ? '#fb923c' : '#00ffa3',
            height: '100%',
            width: `${Math.min(100, (displayAnalysisUsed / displayAnalysisLimit) * 100)}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>Tokens</span>
          <span style={{ fontSize: '14px', color: '#e5e5e5', fontWeight: '700' }}>
            {displayTokenUsed.toLocaleString()} / {displayTokenLimit.toLocaleString()}
          </span>
        </div>
        <div style={{
          background: '#0a0c0e',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: displayTokenUsed >= displayTokenLimit ? '#ef4444' :
                      displayTokenUsed >= displayTokenLimit - 5000 ? '#fb923c' : '#8b5cf6',
            height: '100%',
            width: `${Math.min(100, (displayTokenUsed / displayTokenLimit) * 100)}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </div>
  );
}

export default UsageSummary;
