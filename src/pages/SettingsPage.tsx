import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, User, Slack, Key, History, Copy, RefreshCw, Trash2 } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  slack_webhook_url: string | null;
  slack_enabled: boolean;
  api_key: string | null;
}

interface QueryHistoryItem {
  id: string;
  sql: string;
  database_schema: string | null;
  severity: string | null;
  analysis_result: any;
  origin: 'form' | 'webhook' | 'deleted_user';
  created_at: string;
}

type TabType = 'account' | 'slack' | 'api' | 'history';
type OriginFilter = 'all' | 'form' | 'webhook';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Account tab state
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Slack tab state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);

  // API tab state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showFullApiKey, setShowFullApiKey] = useState(false);

  // History tab state
  const [queries, setQueries] = useState<QueryHistoryItem[]>([]);
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQueries, setTotalQueries] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const queriesPerPage = 10;

  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      loadQueryHistory();
    }
  }, [activeTab, user, originFilter, currentPage]);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) {
        setErrorMessage('Failed to load profile');
        setLoading(false);
        return;
      }

      setUser({
        ...profile,
        email: authUser.email || '',
      });

      setFullName(profile.full_name || '');
      setSlackWebhookUrl(profile.slack_webhook_url || '');
      setSlackEnabled(profile.slack_enabled || false);
      setApiKey(profile.api_key);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorMessage('Failed to load profile');
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setActionLoading('profile');

    try {
      if (!user) return;

      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage('Profile updated successfully');
      await loadUserProfile();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!newEmail || !newEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setActionLoading('email');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setSuccessMessage('Email update initiated. Please check your inbox to confirm the change.');
      setNewEmail('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update email');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSlack = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setActionLoading('slack');

    try {
      if (!user) return;

      // Validate Slack webhook URL if provided
      if (slackWebhookUrl && !slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
        setErrorMessage('Invalid Slack webhook URL. Must start with https://hooks.slack.com/');
        setActionLoading(null);
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          slack_webhook_url: slackWebhookUrl,
          slack_enabled: slackEnabled,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage('Slack settings saved successfully');
      await loadUserProfile();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update Slack settings');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestSlack = async () => {
    clearMessages();
    setActionLoading('test-slack');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Session expired. Please log in again.');
        setActionLoading(null);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-slack`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || 'Failed to send test message');
        setActionLoading(null);
        return;
      }

      setSuccessMessage(result.message || 'Test message sent successfully!');
    } catch (err) {
      console.error('Test Slack error:', err);
      setErrorMessage('Failed to send test message');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) {
      return;
    }

    clearMessages();
    setActionLoading('regenerate-api');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Session expired. Please log in again.');
        setActionLoading(null);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-api-key`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || 'Failed to regenerate API key');
        setActionLoading(null);
        return;
      }

      setApiKey(result.api_key);
      setShowFullApiKey(true);
      setSuccessMessage('API key regenerated successfully. Copy it now - it won\'t be shown again.');
      await loadUserProfile();
    } catch (err) {
      console.error('Regenerate API key error:', err);
      setErrorMessage('Failed to regenerate API key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setSuccessMessage('API key copied to clipboard');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    clearMessages();
    setActionLoading('delete');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Session expired. Please log in again.');
        setActionLoading(null);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || 'Failed to delete account');
        setActionLoading(null);
        return;
      }

      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Delete account error:', err);
      setErrorMessage('Failed to delete account');
      setActionLoading(null);
    }
  };

  const loadQueryHistory = async () => {
    if (!user) return;

    setHistoryLoading(true);

    try {
      let query = supabase
        .from('query_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply origin filter
      if (originFilter !== 'all') {
        query = query.eq('origin', originFilter);
      }

      // Apply pagination
      const from = (currentPage - 1) * queriesPerPage;
      const to = from + queriesPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error loading query history:', error);
        setErrorMessage('Failed to load query history');
        setHistoryLoading(false);
        return;
      }

      setQueries(data || []);
      setTotalQueries(count || 0);
      setHistoryLoading(false);
    } catch (err) {
      console.error('Unexpected error loading query history:', err);
      setErrorMessage('Failed to load query history');
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateSql = (sql: string, maxLength: number = 100) => {
    if (sql.length <= maxLength) return sql;
    return sql.slice(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#e5e5e5' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #1f2327',
            borderTop: '4px solid #00ffa3',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .settings-container {
          min-height: 100vh;
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .settings-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 20px;
        }

        .settings-header {
          margin-bottom: 48px;
        }

        .settings-title {
          font-size: 42px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
          text-shadow: 0 0 30px rgba(0, 255, 163, 0.3);
        }

        .settings-subtitle {
          font-size: 18px;
          color: #9ca3af;
        }

        .tabs-container {
          border-bottom: 1px solid #1f2327;
          margin-bottom: 32px;
        }

        .tabs {
          display: flex;
          gap: 4px;
        }

        .tab {
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab:hover {
          color: #e5e5e5;
        }

        .tab.active {
          color: #00ffa3;
          border-bottom-color: #00ffa3;
        }

        .card {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          color: #e5e5e5;
          margin-bottom: 8px;
        }

        input, textarea {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          width: 100%;
          padding: 14px;
          font-size: 15px;
          border-radius: 8px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        input::placeholder {
          color: #6b7280;
        }

        .button {
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .button-primary {
          background: #00ffa3;
          color: #0d0f11;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
        }

        .button-primary:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .button-secondary {
          background: transparent;
          color: #e5e5e5;
          border: 1px solid #1f2327;
        }

        .button-secondary:hover:not(:disabled) {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .button-danger {
          background: transparent;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .button-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .alert {
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .api-key-display {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .api-key-text {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #00ffa3;
        }

        .code-block {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .code-block pre {
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #9ca3af;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 16px;
          padding: 32px;
          max-width: 450px;
          width: 90%;
        }

        .toggle-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: #1f2327;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle.active {
          background: #00ffa3;
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .toggle.active .toggle-slider {
          transform: translateX(20px);
        }

        .help-text {
          font-size: 13px;
          color: #6b7280;
          margin-top: 6px;
        }

        .danger-zone {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 24px;
          margin-top: 32px;
        }
      `}</style>

      <div className="settings-container">
        <div className="settings-content">
          <div className="settings-header">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Manage your account and preferences</p>
          </div>

          {successMessage && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <User size={18} />
                Account
              </button>
              <button
                className={`tab ${activeTab === 'slack' ? 'active' : ''}`}
                onClick={() => setActiveTab('slack')}
              >
                <Slack size={18} />
                Slack
              </button>
              <button
                className={`tab ${activeTab === 'api' ? 'active' : ''}`}
                onClick={() => setActiveTab('api')}
              >
                <Key size={18} />
                API Access
              </button>
              <button
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={18} />
                Query History
              </button>
            </div>
          </div>

          {/* Account Tab */}
          {activeTab === 'account' && (
            <>
              <div className="card">
                <div className="section-title">Profile Information</div>

                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={actionLoading === 'profile'}
                    style={{ width: '100%' }}
                  >
                    {actionLoading === 'profile' ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>

              <div className="card">
                <div className="section-title">Change Email</div>

                <form onSubmit={handleUpdateEmail}>
                  <div className="form-group">
                    <label className="label">New Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={user.email}
                    />
                    <p className="help-text">
                      You will receive a confirmation email at your new address
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={actionLoading === 'email'}
                    style={{ width: '100%' }}
                  >
                    {actionLoading === 'email' ? 'Updating...' : 'Update Email'}
                  </button>
                </form>
              </div>

              <div className="card danger-zone">
                <div className="section-title" style={{ color: '#ef4444' }}>Danger Zone</div>
                <p style={{ color: '#9ca3af', marginBottom: '20px', lineHeight: '1.6' }}>
                  Once you delete your account, there is no going back. All your data will be permanently removed.
                </p>

                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!!actionLoading}
                  style={{ width: '100%' }}
                >
                  Delete Account Permanently
                </button>
              </div>
            </>
          )}

          {/* Slack Tab */}
          {activeTab === 'slack' && (
            <div className="card">
              <div className="section-title">Slack Notifications</div>

              <form onSubmit={handleUpdateSlack}>
                <div className="form-group">
                  <label className="label">Slack Webhook URL</label>
                  <input
                    type="url"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <p className="help-text">
                    Get your webhook URL from Slack's Incoming Webhooks app
                  </p>
                </div>

                <div className="form-group">
                  <div className="toggle-wrapper">
                    <div
                      className={`toggle ${slackEnabled ? 'active' : ''}`}
                      onClick={() => setSlackEnabled(!slackEnabled)}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                    <label className="label" style={{ marginBottom: 0 }}>Enable Slack notifications</label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={actionLoading === 'slack'}
                    style={{ flex: 1 }}
                  >
                    {actionLoading === 'slack' ? 'Saving...' : 'Save Settings'}
                  </button>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleTestSlack}
                    disabled={actionLoading === 'test-slack' || !slackWebhookUrl}
                    style={{ flex: 1 }}
                  >
                    {actionLoading === 'test-slack' ? 'Testing...' : 'Send Test Message'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* API Access Tab */}
          {activeTab === 'api' && (
            <>
              <div className="card">
                <div className="section-title">Your API Key</div>

                {apiKey ? (
                  <>
                    <div className="api-key-display">
                      <span className="api-key-text">
                        {showFullApiKey ? apiKey : maskApiKey(apiKey)}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={handleCopyApiKey}
                          title="Copy API key"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setShowFullApiKey(!showFullApiKey)}
                          title={showFullApiKey ? 'Hide' : 'Show'}
                        >
                          {showFullApiKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="button button-danger"
                      onClick={handleRegenerateApiKey}
                      disabled={actionLoading === 'regenerate-api'}
                      style={{ width: '100%', marginBottom: '24px' }}
                    >
                      <RefreshCw size={16} style={{ marginRight: '8px' }} />
                      {actionLoading === 'regenerate-api' ? 'Regenerating...' : 'Regenerate API Key'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleRegenerateApiKey}
                    disabled={actionLoading === 'regenerate-api'}
                    style={{ width: '100%', marginBottom: '24px' }}
                  >
                    {actionLoading === 'regenerate-api' ? 'Generating...' : 'Generate API Key'}
                  </button>
                )}

                <div className="section-title" style={{ marginTop: '32px' }}>Usage Examples</div>

                <p style={{ color: '#9ca3af', marginBottom: '16px' }}>Using curl:</p>
                <div className="code-block">
                  <pre>{`curl -X POST \\
  "${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-analyze" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "SELECT * FROM users WHERE id = 1",
    "schema": "public",
    "execution_plan": null
  }'`}</pre>
                </div>

                <p style={{ color: '#9ca3af', marginBottom: '16px' }}>Using JavaScript:</p>
                <div className="code-block">
                  <pre>{`const response = await fetch(
  '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql: 'SELECT * FROM users WHERE id = 1',
      schema: 'public',
      execution_plan: null,
    }),
  }
);

const result = await response.json();
console.log(result.analysis);`}</pre>
                </div>
              </div>
            </>
          )}

          {/* Query History Tab */}
          {activeTab === 'history' && (
            <div className="card">
              <div className="section-title">Query History</div>

              {/* Filters */}
              <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', color: '#9ca3af' }}>Filter by origin:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`button ${originFilter === 'all' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => {
                      setOriginFilter('all');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    All
                  </button>
                  <button
                    className={`button ${originFilter === 'form' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => {
                      setOriginFilter('form');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Form
                  </button>
                  <button
                    className={`button ${originFilter === 'webhook' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => {
                      setOriginFilter('webhook');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Webhook
                  </button>
                </div>
              </div>

              {/* Table */}
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #1f2327',
                    borderTop: '3px solid #00ffa3',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Loading query history...
                </div>
              ) : queries.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#9ca3af',
                  background: '#0a0c0e',
                  borderRadius: '8px',
                  border: '1px solid #1f2327'
                }}>
                  <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p>No queries found</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    {originFilter !== 'all'
                      ? `No queries from ${originFilter} origin`
                      : 'Your query history will appear here'}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1f2327' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                            Date
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                            SQL Query
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                            Origin
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                            Severity
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {queries.map((query) => (
                          <tr key={query.id} style={{ borderBottom: '1px solid #1f2327' }}>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#e5e5e5', whiteSpace: 'nowrap' }}>
                              {formatDate(query.created_at)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                              <div title={query.sql}>
                                {truncateSql(query.sql)}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                background: query.origin === 'form'
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : query.origin === 'webhook'
                                  ? 'rgba(168, 85, 247, 0.1)'
                                  : 'rgba(107, 114, 128, 0.1)',
                                color: query.origin === 'form'
                                  ? '#3b82f6'
                                  : query.origin === 'webhook'
                                  ? '#a855f7'
                                  : '#6b7280',
                              }}>
                                {query.origin}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                              {query.severity ? (
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: query.severity.toLowerCase().includes('high')
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : query.severity.toLowerCase().includes('medium')
                                    ? 'rgba(251, 191, 36, 0.1)'
                                    : 'rgba(16, 185, 129, 0.1)',
                                  color: query.severity.toLowerCase().includes('high')
                                    ? '#ef4444'
                                    : query.severity.toLowerCase().includes('medium')
                                    ? '#fbbf24'
                                    : '#10b981',
                                }}>
                                  {query.severity}
                                </span>
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '12px' }}>N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalQueries > queriesPerPage && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '24px',
                      paddingTop: '24px',
                      borderTop: '1px solid #1f2327'
                    }}>
                      <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                        Showing {((currentPage - 1) * queriesPerPage) + 1} to {Math.min(currentPage * queriesPerPage, totalQueries)} of {totalQueries}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="button button-secondary"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
                          Previous
                        </button>
                        <button
                          className="button button-secondary"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage * queriesPerPage >= totalQueries}
                          style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '16px' }}>
                Delete Account?
              </h2>

              <p style={{ fontSize: '15px', color: '#9ca3af', marginBottom: '24px', lineHeight: '1.6' }}>
                This action cannot be undone. All your data will be permanently deleted.
                Type <strong>DELETE</strong> to confirm.
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                style={{ marginBottom: '24px' }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={!!actionLoading}
                >
                  Cancel
                </button>
                <button
                  className="button button-danger"
                  onClick={() => {
                    if (deleteConfirmText === 'DELETE') {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      handleDeleteAccount();
                    }
                  }}
                  disabled={actionLoading === 'delete' || deleteConfirmText !== 'DELETE'}
                >
                  {actionLoading === 'delete' ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SettingsPage;
