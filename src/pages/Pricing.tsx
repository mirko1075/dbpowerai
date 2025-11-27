import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check } from 'lucide-react';

interface UserPlan {
  plan: 'free' | 'web' | 'api' | 'early_adopter';
  analysis_used: number;
  analysis_limit: number;
  token_used: number;
  token_limit: number;
  early_expires_at?: string | null;
}

export default function Pricing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        const { data: plan } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (plan) {
          setUserPlan(plan);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    console.info('Early Access Mode: Upgrade disabled until launch');
    return;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d0f11',
      color: '#e5e5e5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 40px 60px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '16px',
          lineHeight: '1.1',
          textShadow: '0 0 40px rgba(0, 255, 163, 0.2)',
        }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#9ca3af',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          Start free. Upgrade when you need more power.
        </p>
      </section>

      {/* Early Access Banner */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto 40px',
        padding: '0 40px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{
            fontSize: '28px',
            marginBottom: '8px',
          }}>
            🔥
          </div>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}>
            Early Access Offer
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#ffffff',
            margin: 0,
            lineHeight: '1.5',
          }}>
            Sign up now and get full access to DBPowerAI for free until December 31, 2025.
            <br />
            No credit card required.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 40px 100px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          {/* Free Plan */}
          <div style={{
            background: '#111418',
            border: '2px solid #1f2327',
            borderRadius: '16px',
            padding: '40px',
            position: 'relative',
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}>
              Free
            </div>

            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '8px',
            }}>
              €0
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#6b7280',
              }}>
                /month
              </span>
            </div>

            <p style={{
              fontSize: '15px',
              color: '#9ca3af',
              marginBottom: '32px',
              minHeight: '40px',
            }}>
              Perfect for trying out DBPowerAI
            </p>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0',
            }}>
              <Feature text="20 analyses per month" />
              <Feature text="4k tokens per analysis" />
              <Feature text="Web interface only" />
              <Feature text="No API access" />
            </ul>

            {!isAuthenticated ? (
              <a
                href="/signup"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '15px',
                  border: '2px solid #1f2327',
                  color: '#e5e5e5',
                  backgroundColor: 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00ffa3';
                  e.currentTarget.style.color = '#00ffa3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1f2327';
                  e.currentTarget.style.color = '#e5e5e5';
                }}
              >
                Sign up for free
              </a>
            ) : userPlan?.plan === 'free' ? (
              <button
                disabled
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '15px',
                  border: '2px solid #1f2327',
                  color: '#6b7280',
                  backgroundColor: '#0d0f11',
                  cursor: 'not-allowed',
                }}
              >
                Current plan
              </button>
            ) : (
              <button
                disabled
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '15px',
                  border: '2px solid #1f2327',
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  cursor: 'not-allowed',
                }}
              >
                Downgrade not available
              </button>
            )}
          </div>

          {/* Web Plan - Most Popular */}
          <div style={{
            background: 'linear-gradient(135deg, #111418 0%, #1a1d24 100%)',
            border: '2px solid #00ffa3',
            borderRadius: '16px',
            padding: '40px',
            position: 'relative',
            boxShadow: '0 0 40px rgba(0, 255, 163, 0.2)',
            transform: 'scale(1.05)',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#00ffa3',
              color: '#0d0f11',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Most Popular
            </div>

            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#00ffa3',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}>
              Web Analyzer
            </div>

            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '8px',
            }}>
              €9
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#6b7280',
              }}>
                /month
              </span>
            </div>

            <p style={{
              fontSize: '13px',
              color: '#9ca3af',
              marginBottom: '8px',
              fontStyle: 'italic',
            }}>
              Early Access users enjoy full access for free until Dec 31, 2025.
            </p>

            <p style={{
              fontSize: '15px',
              color: '#9ca3af',
              marginBottom: '32px',
              minHeight: '40px',
            }}>
              For developers who optimize regularly
            </p>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0',
            }}>
              <Feature text="100 analyses per month" highlight />
              <Feature text="8k tokens per analysis" highlight />
              <Feature text="Full Web UI access" highlight />
              <Feature text="Query history" highlight />
              <Feature text="Priority support" highlight />
            </ul>

            <button
              disabled
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '15px',
                border: '2px solid #1f2327',
                color: '#6b7280',
                backgroundColor: 'transparent',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              Available after launch (Jan 2026)
            </button>
          </div>

          {/* API Plan - Coming Soon */}
          <div style={{
            background: '#111418',
            border: '2px solid #8b5cf6',
            borderRadius: '16px',
            padding: '40px',
            position: 'relative',
            opacity: 0.7,
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Coming Soon
            </div>

            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#8b5cf6',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}>
              API Analyzer
            </div>

            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '8px',
            }}>
              €19
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#6b7280',
              }}>
                /month
              </span>
            </div>

            <p style={{
              fontSize: '13px',
              color: '#8b5cf6',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              Coming 2026
            </p>

            <p style={{
              fontSize: '15px',
              color: '#9ca3af',
              marginBottom: '32px',
              minHeight: '40px',
            }}>
              For teams with automation needs
            </p>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0',
            }}>
              <Feature text="500 analyses per month" />
              <Feature text="Full API access" />
              <Feature text="Webhook integration" />
              <Feature text="Slack notifications" />
              <Feature text="Team collaboration" />
            </ul>

            <button
              disabled
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '15px',
                border: '2px solid #8b5cf6',
                color: '#6b7280',
                backgroundColor: 'transparent',
                cursor: 'not-allowed',
              }}
            >
              Coming Soon
            </button>
          </div>
        </div>
      </section>
{/* Enterprise Section */}
<section style={{
  maxWidth: '900px',
  margin: '60px auto 80px',
  padding: '0 40px',
  textAlign: 'center'
}}>
  <div style={{
    background: '#111418',
    border: '2px solid #fcd34d',
    borderRadius: '16px',
    padding: '40px',
    margin: '0 auto',
    maxWidth: '500px',
    position: 'relative',
  }}>
    <div style={{
      position: 'absolute',
      top: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fcd34d',
      color: '#0d0f11',
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    }}>
      Enterprise
    </div>

    <h3 style={{
      fontSize: '18px',
      fontWeight: '700',
      color: '#fcd34d',
      textTransform: 'uppercase',
      marginBottom: '12px',
    }}>
      Enterprise
    </h3>

    <div style={{
      fontSize: '42px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '12px',
    }}>
      Custom pricing
    </div>

    <p style={{
      fontSize: '15px',
      color: '#9ca3af',
      marginBottom: '24px',
      minHeight: '40px',
    }}>
      For large teams & mission-critical workloads
    </p>

    <ul style={{
      listStyle: 'none',
      padding: 0,
      margin: '0 0 32px 0',
      textAlign: 'left'
    }}>
      <Feature text="Unlimited analyses" />
      <Feature text="Unlimited tokens" />
      <Feature text="Dedicated API throughput" />
      <Feature text="Private on-prem deployment" />
      <Feature text="SLA 99.9%" />
      <Feature text="Security & compliance review" />
      <Feature text="Team training & onboarding" />
      <Feature text="Invoice payments" />
    </ul>

    <a
      href="mailto:founder@dbpowerai.com?subject=Enterprise%20Plan%20Inquiry"
      style={{
        display: 'block',
        width: '100%',
        padding: '14px',
        borderRadius: '8px',
        textAlign: 'center',
        fontWeight: '700',
        fontSize: '15px',
        backgroundColor: '#fcd34d',
        color: '#0d0f11',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      Contact Sales
    </a>
  </div>
</section>

{/* Add-ons Section */}
<section style={{
  maxWidth: '1200px',
  margin: '60px auto 80px',
  padding: '0 40px',
}}>
  <h2 style={{
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '32px',
  }}>
    Add-ons
  </h2>

  <p style={{
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: '40px',
    fontSize: '16px',
  }}>
    Need more power? Add extra tokens or analyses anytime.
  </p>

  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  }}>
    
    {/* TOKEN PACKS */}
    <div style={{
      background: '#111418',
      border: '2px solid #00ffa3',
      borderRadius: '16px',
      padding: '28px',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#00ffa3',
        marginBottom: '16px',
      }}>
        Token Packs
      </h3>

      <Feature text="+50k tokens — €9" highlight />
      <Feature text="+200k tokens — €25" highlight />
      <Feature text="+1M tokens — €99" highlight />

      <button
        disabled
        style={{
          marginTop: '24px',
          display: 'block',
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '2px solid #1f2327',
          background: 'transparent',
          color: '#6b7280',
          cursor: 'not-allowed',
        }}
      >
        Coming soon
      </button>
    </div>

    {/* ANALYSIS PACKS */}
    <div style={{
      background: '#111418',
      border: '2px solid #3b82f6',
      borderRadius: '16px',
      padding: '28px',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#3b82f6',
        marginBottom: '16px',
      }}>
        Analysis Packs
      </h3>

      <Feature text="+20 analyses — €5" />
      <Feature text="+100 analyses — €15" />
      <Feature text="+500 analyses — €49" />

      <button
        disabled
        style={{
          marginTop: '24px',
          display: 'block',
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '2px solid #3b82f6',
          background: 'transparent',
          color: '#6b7280',
          cursor: 'not-allowed',
        }}
      >
        Coming soon
      </button>
    </div>

  </div>
</section>

      {/* FAQ Section */}
      <section style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '60px 40px 100px',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <FAQItem
            question="What counts as an analysis?"
            answer="Each time you submit a SQL query for optimization counts as one analysis. This includes the optimized query, suggested indexes, and explanation."
          />
          <FAQItem
            question="What are tokens?"
            answer="Tokens are units that measure the size of your query, schema, and EXPLAIN output. A typical query uses 200-500 tokens. Complex queries with large schemas may use more."
          />
          <FAQItem
            question="Can I upgrade or downgrade anytime?"
            answer="Yes! You can upgrade your plan anytime. Changes take effect immediately. For downgrades, your new plan starts at the next billing cycle."
          />
          <FAQItem
            question="Do unused analyses roll over?"
            answer="No, analysis limits reset monthly. We recommend choosing a plan that fits your regular usage pattern."
          />
          <FAQItem
            question="Is there a refund policy?"
            answer="We offer a 14-day money-back guarantee. If you're not satisfied, contact us for a full refund, no questions asked."
          />
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1f2327',
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <a
            href="/"
            style={{
              color: '#9ca3af',
              textDecoration: 'none',
              marginRight: '24px',
            }}
          >
            Home
          </a>
          <a
            href="/pricing"
            style={{
              color: '#00ffa3',
              textDecoration: 'none',
              marginRight: '24px',
            }}
          >
            Pricing
          </a>
          <a
            href="/login"
            style={{
              color: '#9ca3af',
              textDecoration: 'none',
            }}
          >
            Sign in
          </a>
        </div>
        <div>
          © 2025 DBPowerAI — Built for developers who ship fast
        </div>
      </footer>
    </div>
  );
}

function Feature({ text, highlight = false }: { text: string; highlight?: boolean }) {
  return (
    <li style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
      fontSize: '15px',
      color: highlight ? '#e5e5e5' : '#9ca3af',
    }}>
      <Check
        size={18}
        style={{
          color: highlight ? '#00ffa3' : '#6b7280',
          flexShrink: 0,
        }}
      />
      <span>{text}</span>
    </li>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div style={{
      background: '#111418',
      border: '1px solid #1f2327',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: '12px',
      }}>
        {question}
      </h3>
      <p style={{
        fontSize: '15px',
        color: '#9ca3af',
        lineHeight: '1.6',
        margin: 0,
      }}>
        {answer}
      </p>
    </div>
  );
}
