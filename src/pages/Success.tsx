import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/app');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <>
      <style>{`
        body {
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          margin: 0;
        }

        .page-fade-in {
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .success-container {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 20px;
          padding: 60px 40px;
          max-width: 600px;
          width: 100%;
          text-align: center;
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .success-container {
            padding: 40px 24px;
            margin: 16px;
          }
        }

        .success-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 32px;
          background: rgba(16, 185, 129, 0.1);
          border: 3px solid rgba(16, 185, 129, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: successPulse 2s ease-in-out infinite;
        }

        @keyframes successPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
          }
        }

        .primary-button {
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .primary-button:hover {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .sparkle {
          position: absolute;
          color: #00ffa3;
          animation: sparkle 3s ease-in-out infinite;
        }

        .sparkle:nth-child(1) {
          top: 20%;
          left: 15%;
          animation-delay: 0s;
        }

        .sparkle:nth-child(2) {
          top: 30%;
          right: 20%;
          animation-delay: 1s;
        }

        .sparkle:nth-child(3) {
          bottom: 25%;
          left: 20%;
          animation-delay: 2s;
        }

        .sparkle:nth-child(4) {
          bottom: 35%;
          right: 15%;
          animation-delay: 0.5s;
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }

        .countdown {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 50%;
          font-weight: 700;
          color: #00ffa3;
          margin-left: 8px;
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11' }}>

        <div className="page-fade-in" style={{
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="success-container">
            <div className="sparkle">
              <Sparkles size={20} />
            </div>
            <div className="sparkle">
              <Sparkles size={16} />
            </div>
            <div className="sparkle">
              <Sparkles size={24} />
            </div>
            <div className="sparkle">
              <Sparkles size={18} />
            </div>

            <div className="success-icon">
              <CheckCircle size={40} style={{ color: '#10b981' }} />
            </div>

            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 36px)',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
            }}>
              Payment Successful!
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 3vw, 18px)',
              color: '#9ca3af',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              Thank you for your purchase! Your subscription has been activated and you now have access to all premium features.
            </p>

            {sessionId && (
              <div style={{
                background: 'rgba(0, 255, 163, 0.05)',
                border: '1px solid rgba(0, 255, 163, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '32px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  margin: '0 0 8px 0'
                }}>
                  Session ID:
                </p>
                <code style={{
                  fontSize: '12px',
                  color: '#00ffa3',
                  fontFamily: "'Fira Code', monospace",
                  wordBreak: 'break-all'
                }}>
                  {sessionId}
                </code>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Redirecting to dashboard in
                <span className="countdown">{countdown}</span>
              </p>
            </div>

            <button
              onClick={() => navigate('/app')}
              className="primary-button"
            >
              Go to Dashboard
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Success;