import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Send, CheckCircle } from 'lucide-react';

function Contact() {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !category || !message) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('https://hook.eu2.make.com/p3irpuq5pdji8g4adcz8gdwuk1q9nbgh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          category,
          message,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setEmail('');
        setCategory('');
        setMessage('');
        loadUserEmail();
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && category && message;

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

        input, select, textarea {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        input::placeholder, textarea::placeholder {
          color: #6b7280;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        select {
          cursor: pointer;
        }

        textarea {
          resize: vertical;
        }
      `}</style>

      <div className="page-fade-in" style={{ minHeight: '100vh' }}>

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px 24px'
        }}>
          <div style={{
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '16px',
                textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
              }}>
                Contact Us
              </h1>
              <p style={{
                fontSize: 'clamp(16px, 3vw, 18px)',
                color: '#9ca3af'
              }}>
                Have a question or feedback? We'd love to hear from you.
              </p>
              <p style={{
                fontSize: '16px',
                color: '#9ca3af',
                marginTop: '16px'
              }}>
                Or email us directly at{' '}
                <a
                  href="mailto:info@dbpowerai.com"
                  style={{
                    color: '#00ffa3',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  info@dbpowerai.com
                </a>
              </p>
            </div>

            <div style={{
              background: '#111418',
              border: '1px solid #1f2327',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              {success ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px'
                }}>
                  <CheckCircle size={64} style={{
                    color: '#00ffa3',
                    margin: '0 auto 24px'
                  }} />
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '12px'
                  }}>
                    Thank you!
                  </h2>
                  <p style={{
                    fontSize: '16px',
                    color: '#9ca3af',
                    marginBottom: '24px'
                  }}>
                    We will contact you soon.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    style={{
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#00ffa3',
                      background: 'transparent',
                      border: '1px solid #00ffa3',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 255, 163, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      htmlFor="email"
                      style={{
                        display: 'block',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '1px solid #1f2327'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      htmlFor="category"
                      style={{
                        display: 'block',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Category *
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '1px solid #1f2327'
                      }}
                    >
                      <option value="">Select a category</option>
                      <option value="Bug report">Bug report</option>
                      <option value="Feature request">Feature request</option>
                      <option value="Assistance">Assistance</option>
                      <option value="General feedback">General feedback</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      htmlFor="message"
                      style={{
                        display: 'block',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#e5e5e5',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us more..."
                      required
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '1px solid #1f2327',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>

                  {error && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '14px',
                      marginBottom: '24px'
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: !isFormValid || loading ? '#6b7280' : '#0d0f11',
                      background: !isFormValid || loading ? '#1f2327' : '#00ffa3',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: !isFormValid || loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: !isFormValid || loading ? 'none' : '0 0 20px rgba(0, 255, 163, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      if (isFormValid && !loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 163, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isFormValid && !loading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 163, 0.3)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: '16px',
                          height: '16px',
                          border: '2px solid #6b7280',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite'
                        }} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

export default Contact;
