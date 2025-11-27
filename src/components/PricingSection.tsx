import { useState } from 'react';
import { Check, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripeProducts } from '../stripe-config';

function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.href,
          mode: 'subscription'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  const product = stripeProducts[0]; // Web Plan

  return (
    <>
      <style>{`
        .pricing-section {
          padding: 80px 0;
          background: linear-gradient(135deg, #0d0f11 0%, #111418 100%);
        }

        .pricing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .pricing-card {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .pricing-card:hover {
          border-color: rgba(0, 255, 163, 0.3);
          box-shadow: 0 0 50px rgba(0, 255, 163, 0.1);
          transform: translateY(-5px);
        }

        .pricing-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #00ffa3, #00cc82);
        }

        .price-display {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin: 20px 0;
        }

        .price-amount {
          font-size: 48px;
          font-weight: 700;
          color: #00ffa3;
          text-shadow: 0 0 30px rgba(0, 255, 163, 0.3);
        }

        .price-currency {
          font-size: 24px;
          font-weight: 600;
          color: #00ffa3;
        }

        .price-period {
          font-size: 16px;
          color: #9ca3af;
          font-weight: 500;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 32px 0;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(31, 35, 39, 0.5);
        }

        .feature-item:last-child {
          border-bottom: none;
        }

        .feature-icon {
          color: #00ffa3;
          flex-shrink: 0;
        }

        .feature-text {
          color: #e5e5e5;
          font-size: 15px;
          line-height: 1.5;
        }

        .subscribe-button {
          width: 100%;
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .subscribe-button:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .subscribe-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 8px;
          margin-top: 16px;
          font-size: 14px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .pricing-section {
            padding: 60px 0;
          }

          .pricing-card {
            padding: 32px 24px;
            margin: 0 16px;
          }

          .price-amount {
            font-size: 40px;
          }
        }
      `}</style>

      <section className="pricing-section">
        <div className="pricing-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
            }}>
              Upgrade to Premium
            </h2>
            <p style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              color: '#9ca3af',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Unlock advanced SQL optimization features and get priority support
            </p>
          </div>

          <div className="pricing-card">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 255, 163, 0.1)',
                border: '1px solid rgba(0, 255, 163, 0.3)',
                borderRadius: '20px',
                padding: '6px 16px',
                marginBottom: '16px'
              }}>
                <Zap size={16} style={{ color: '#00ffa3' }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#00ffa3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Most Popular
                </span>
              </div>

              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#ffffff',
                margin: '0 0 8px 0'
              }}>
                {product.name}
              </h3>

              <p style={{
                fontSize: '16px',
                color: '#9ca3af',
                margin: 0
              }}>
                {product.description}
              </p>

              <div className="price-display">
                <span className="price-currency">{product.currencySymbol}</span>
                <span className="price-amount">{product.price.toFixed(0)}</span>
                <span className="price-period">/month</span>
              </div>
            </div>

            <ul className="feature-list">
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Unlimited SQL query optimization</span>
              </li>
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Advanced performance analysis</span>
              </li>
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Custom index recommendations</span>
              </li>
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Query execution plan analysis</span>
              </li>
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Priority email support</span>
              </li>
              <li className="feature-item">
                <Check className="feature-icon" size={20} />
                <span className="feature-text">Export optimization reports</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe(product.priceId)}
              disabled={loading === product.priceId}
              className="subscribe-button"
            >
              {loading === product.priceId ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                <>
                  Subscribe Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default PricingSection;