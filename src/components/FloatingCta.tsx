import { useState, useEffect } from 'react';

function FloatingCta() {
  const [isHovered, setIsHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date('2025-12-31T23:59:59').getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <style>{`
        .cta-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 48px auto;
          padding: 0 24px;
        }

        .cta-wrapper {
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cta-pill {
          background: rgba(0, 255, 163, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 255, 163, 0.4);
          border-radius: 9999px;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 700;
          color: #00ffa3;
          box-shadow: 0 0 20px rgba(0, 255, 163, 0.6);
          animation: pulse-glow 2s ease-in-out infinite;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
        }

        .cta-wrapper:hover .cta-pill {
          transform: scale(1.05);
          padding: 16px 40px;
          background: rgba(0, 255, 163, 0.2);
          box-shadow: 0 0 30px rgba(0, 255, 163, 0.8), 0 0 60px rgba(0, 255, 163, 0.4);
        }

        .cta-title {
          font-size: 16px;
          margin-bottom: 8px;
        }

        .cta-countdown {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 6px;
        }

        .countdown-numbers {
          font-weight: 700;
          color: #00ffa3;
          letter-spacing: 0.5px;
          font-size: 14px;
        }

        .cta-expanded-box {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 0;
        }

        .cta-wrapper:hover .cta-expanded-box {
          max-height: 194px;
          opacity: 1;
          margin-top: 12px;
          margin-bottom: 12px;
        }

        .cta-expanded-content {
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 12px;
          padding: 16px 24px;
          text-align: center;
        }

        .cta-expanded-title {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 8px;
        }

        .cta-expanded-countdown {
          font-size: 18px;
          font-weight: 700;
          color: #00ffa3;
          letter-spacing: 1px;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 255, 163, 0.6);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 255, 163, 0.9), 0 0 60px rgba(0, 255, 163, 0.5);
          }
        }

        @media (max-width: 768px) {
          .cta-container {
            margin: 32px auto;
          }

          .cta-pill {
            font-size: 14px;
            padding: 12px 24px;
          }

          .cta-wrapper:hover .cta-pill {
            padding: 14px 28px;
          }

          .cta-title {
            font-size: 14px;
          }

          .countdown-numbers {
            font-size: 12px;
          }

          .cta-expanded-countdown {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="cta-container">
        <div
          className="cta-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          <div className="cta-pill">
            <div className="cta-title">Early Access</div>
            <div className="cta-countdown">
              <span className="countdown-numbers">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>
          </div>

          <div className="cta-expanded-box">
            <div className="cta-expanded-content">
              <div className="cta-expanded-title">Offer ends on</div>
              <div className="cta-expanded-countdown">
                {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m : {timeLeft.seconds}s
              </div>
              <div className="cta-expanded-title" style={{ marginTop: '8px' }}>December 31, 2025</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default FloatingCta;
