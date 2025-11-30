import { useEffect } from 'react';
import { logEvent } from '../lib/logEvent';
import { trackEvent as trackAnalytics } from '../utils/analytics';
import QueryAnalysisForm from '../components/QueryAnalysisForm';

function AppPage() {
  useEffect(() => {
    logEvent('open_analyzer');
    trackAnalytics('app_open', {
      user_logged: true,
      subscription_plan: 'free'
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11' }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '80px 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '16px',
            textShadow: '0 0 30px rgba(0, 255, 163, 0.3)',
            lineHeight: '1.1'
          }}>
            Optimize Your SQL Query
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#9ca3af',
            lineHeight: '1.6',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            Paste your SQL query, select your database, and preview optimization.
          </p>
        </div>

        <QueryAnalysisForm mode="authenticated" />
      </div>
    </div>
  );
}

export default AppPage;
