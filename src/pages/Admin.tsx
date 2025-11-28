import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface TestCase {
  query: string;
  schema?: string;
  explain?: string;
  test_type?: string;
}

interface TestResult {
  id: number;
  status: string;
  query: string;
  test_type?: string;
  validator_status?: string;
  semantic_warning?: string | null;
}

interface AITest {
  id: number;
  created_at: string;
  status: string;
  test_type: string | null;
  query: string;
}

function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tests, setTests] = useState<AITest[]>([]);
  const [testsJson, setTestsJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; passed: number; failed: number; tests: TestResult[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminRole();
    loadTests();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error in checkAdminRole:', error);
      setIsAdmin(false);
    }
  };

  const loadTests = async () => {
    const { data } = await supabase
      .from('ai_tests')
      .select('id, created_at, status, test_type, query')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setTests(data);
    }
  };

  const runTests = async () => {
    if (!testsJson.trim()) {
      alert('Please paste test JSON');
      return;
    }

    let parsedTests: TestCase[];
    try {
      parsedTests = JSON.parse(testsJson);
      if (!Array.isArray(parsedTests)) {
        throw new Error('Tests must be an array');
      }
    } catch (error) {
      alert('Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin_run_tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tests: parsedTests }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run tests');
      }

      const data = await response.json();
      setResult(data);
      loadTests();
    } catch (error) {
      console.error('Error running tests:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0d10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div style={{
          minHeight: '100vh',
          background: '#0a0d10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#ffffff'
        }}>
          <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '16px' }}>403</h1>
          <p style={{ fontSize: '18px', color: '#9ca3af' }}>You are not authorized to access this page.</p>
          <button
            onClick={() => navigate('/app')}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: '#00ffa3',
              color: '#0a0d10',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go to App
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{
      minHeight: '100vh',
      background: '#0a0d10',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '32px',
        }}>
          Admin Control Panel
        </h1>

        <div style={{
          background: '#111418',
          border: '1px solid #1f2327',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '16px',
          }}>
            Run Tests
          </h2>

          <textarea
            value={testsJson}
            onChange={(e) => setTestsJson(e.target.value)}
            placeholder='Paste test JSON here, e.g. [{"query": "SELECT * FROM users", "test_type": "basic"}]'
            rows={8}
            style={{
              width: '100%',
              padding: '16px',
              background: '#0a0d10',
              border: '1px solid #1f2327',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'monospace',
              marginBottom: '16px',
              resize: 'vertical',
            }}
          />

          <button
            onClick={runTests}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? '#4a5568' : '#00ffa3',
              color: loading ? '#ffffff' : '#0a0d10',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Running Tests...' : 'Run Tests'}
          </button>

          {result && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#0a0d10',
              border: '1px solid #1f2327',
              borderRadius: '8px',
            }}>
              <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '16px',
              }}>
                <div>
                  <span style={{ color: '#9ca3af' }}>Total: </span>
                  <span style={{ color: '#ffffff', fontWeight: '600' }}>{result.total}</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Passed: </span>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>{result.passed}</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Failed: </span>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>{result.failed}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          background: '#111418',
          border: '1px solid #1f2327',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '16px',
          }}>
            Recent Test Runs
          </h2>

          {tests.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#9ca3af',
            }}>
              No tests run yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid #1f2327',
                  }}>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>ID</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>Created At</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>Status</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>Test Type</th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>Query</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id} style={{
                      borderBottom: '1px solid #1f2327',
                    }}>
                      <td style={{
                        padding: '12px',
                        color: '#ffffff',
                        fontSize: '14px',
                      }}>{test.id}</td>
                      <td style={{
                        padding: '12px',
                        color: '#ffffff',
                        fontSize: '14px',
                      }}>{new Date(test.created_at).toLocaleString()}</td>
                      <td style={{
                        padding: '12px',
                        fontSize: '14px',
                      }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: test.status === 'passed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: test.status === 'passed' ? '#10b981' : '#ef4444',
                        }}>
                          {test.status}
                        </span>
                      </td>
                      <td style={{
                        padding: '12px',
                        color: '#9ca3af',
                        fontSize: '14px',
                      }}>{test.test_type || '-'}</td>
                      <td style={{
                        padding: '12px',
                        color: '#9ca3af',
                        fontSize: '14px',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{test.query}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default Admin;
