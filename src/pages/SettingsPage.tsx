import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, User, Slack, Key, Shield, Copy, RefreshCw, Trash2, Mail, Lock } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  company: string | null;
  role: string | null;
  avatar_url: string | null;
  slack_webhook_url: string | null;
  slack_enabled: boolean;
  api_key: string | null;
  created_at: string;
}

interface AuthUser {
  created_at: string;
  last_sign_in_at: string;
}

type TabType = 'account' | 'slack' | 'api' | 'security';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Account tab state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Slack tab state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);

  // API tab state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Security tab state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();

      if (!supabaseAuthUser) {
        navigate('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseAuthUser.id)
        .single();

      if (error || !profile) {
        setErrorMessage('Failed to load profile');
        setLoading(false);
        return;
      }

      setUser({
        ...profile,
        email: supabaseAuthUser.email || '',
      });

      setAuthUser({
        created_at: supabaseAuthUser.created_at,
        last_sign_in_at: supabaseAuthUser.last_sign_in_at || supabaseAuthUser.created_at,
      });

      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setCompany(profile.company || '');
      setAvatarUrl(profile.avatar_url || '');
      setSlackWebhookUrl(profile.slack_webhook_url || '');
      setSlackEnabled(profile.slack_enabled || false);
      setApiKey(profile.api_key);
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setErrorMessage('Failed to load profile');
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  // ========== ACCOUNT TAB HANDLERS ==========

  const handleUpdateProfile = async () => {
    if (!user) return;

    clearMessages();
    setActionLoading('update-profile');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          bio: bio,
          company: company,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) {
        setErrorMessage('Failed to update profile');
        setActionLoading(null);
        return;
      }

      setSuccessMessage('Profile updated successfully');
      setActionLoading(null);
      await loadUserProfile();
    } catch (err) {
      console.error('Update profile error:', err);
      setErrorMessage('Failed to update profile');
      setActionLoading(null);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail) return;

    clearMessages();
    setActionLoading('update-email');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        setErrorMessage(error.message);
        setActionLoading(null);
        return;
      }

      setSuccessMessage('Email update sent! Check your inbox to confirm.');
      setNewEmail('');
      setActionLoading(null);
    } catch (err) {
      console.error('Update email error:', err);
      setErrorMessage('Failed to update email');
      setActionLoading(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    clearMessages();
    setActionLoading('update-password');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        setActionLoading(null);
        return;
      }

      setSuccessMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActionLoading(null);
    } catch (err) {
      console.error('Update password error:', err);
      setErrorMessage('Failed to update password');
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    clearMessages();
    setActionLoading('sign-out');

    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setErrorMessage('Failed to sign out');
      setActionLoading(null);
    }
  };

  // ========== SLACK TAB HANDLERS ==========

  const handleUpdateSlack = async () => {
    if (!user) return;

    clearMessages();
    setActionLoading('update-slack');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          slack_webhook_url: slackWebhookUrl,
          slack_enabled: slackEnabled,
        })
        .eq('id', user.id);

      if (error) {
        setErrorMessage('Failed to update Slack settings');
        setActionLoading(null);
        return;
      }

      setSuccessMessage('Slack settings updated successfully');
      setActionLoading(null);
      await loadUserProfile();
    } catch (err) {
      console.error('Update Slack error:', err);
      setErrorMessage('Failed to update Slack settings');
      setActionLoading(null);
    }
  };

  const handleTestSlack = async () => {
    if (!user) return;

    clearMessages();
    setActionLoading('test-slack');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('Not authenticated');
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
        setErrorMessage(result.error || 'Failed to test Slack integration');
        setActionLoading(null);
        return;
      }

      setSuccessMessage(result.message || 'Test message sent successfully!');
      setActionLoading(null);
    } catch (err) {
      console.error('Test Slack error:', err);
      setErrorMessage('Failed to test Slack integration');
      setActionLoading(null);
    }
  };

  // ========== API TAB HANDLERS ==========

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}****...****${key.slice(-4)}`;
  };

  const handleCopyApiKey = () => {
    if (!apiKey) return;

    navigator.clipboard.writeText(apiKey);
    setSuccessMessage('API key copied to clipboard');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRegenerateApiKey = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) {
      return;
    }

    clearMessages();
    setActionLoading('regenerate-api-key');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('Not authenticated');
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
      setSuccessMessage('API key regenerated successfully! Save it now - it won\'t be shown again.');
      setActionLoading(null);
    } catch (err) {
      console.error('Regenerate API key error:', err);
      setErrorMessage('Failed to regenerate API key');
      setActionLoading(null);
    }
  };

  // ========== SECURITY TAB HANDLERS ==========

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmText !== 'DELETE') {
      setErrorMessage('Please type DELETE to confirm');
      return;
    }

    clearMessages();
    setActionLoading('delete-account');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('Not authenticated');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .settings-container {
          min-height: 100vh;
          background: #0d0f11;
          padding: 80px 24px 80px;
        }

        .settings-wrapper {
          max-width: 900px;
          margin: 0 auto;
        }

        .settings-header {
          margin-bottom: 40px;
        }

        .settings-title {
          font-size: 32px;
          font-weight: 800;
          color: #e5e5e5;
          margin-bottom: 8px;
        }

        .settings-subtitle {
          font-size: 16px;
          color: #9ca3af;
        }

        .tabs-container {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-radius: 12px 12px 0 0;
          padding: 16px 24px 0;
        }

        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #1f2327;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: none;
          border: none;
          color: #9ca3af;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          color: #e5e5e5;
        }

        .tab.active {
          color: #00ffa3;
          border-bottom-color: #00ffa3;
        }

        .card {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-top: none;
          border-radius: 0 0 12px 12px;
          padding: 32px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #e5e5e5;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #9ca3af;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 15px;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.1);
        }

        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 15px;
          min-height: 100px;
          resize: vertical;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.1);
        }

        .read-only-field {
          padding: 12px 16px;
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-radius: 8px;
          color: #6b7280;
          font-size: 15px;
        }

        .button {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .button-primary {
          background: #00ffa3;
          color: #0d0f11;
        }

        .button-primary:hover:not(:disabled) {
          background: #00cc82;
          transform: translateY(-1px);
        }

        .button-secondary {
          background: #1f2327;
          color: #e5e5e5;
        }

        .button-secondary:hover:not(:disabled) {
          background: #2a2f35;
        }

        .button-danger {
          background: #ef4444;
          color: white;
        }

        .button-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .alert {
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: start;
          gap: 12px;
        }

        .alert-success {
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          color: #00ffa3;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .divider {
          height: 1px;
          background: #1f2327;
          margin: 32px 0;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle {
          position: relative;
          width: 48px;
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
          transform: translateX(24px);
        }

        .api-key-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          color: #e5e5e5;
        }

        .code-block {
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 8px;
          padding: 16px;
          margin-top: 12px;
          overflow-x: auto;
        }

        .code-block pre {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.6;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal-content {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          padding: 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .settings-container {
            padding: 60px 16px;
          }

          .settings-title {
            font-size: 24px;
          }

          .card {
            padding: 24px 16px;
          }

          .button-group {
            flex-direction: column;
          }

          .button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="settings-container">
        <div className="settings-wrapper">
          <div className="settings-header">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Manage your account, integrations, and preferences</p>
          </div>

          {successMessage && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {errorMessage}
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
                className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <Shield size={18} />
                Security
              </button>
            </div>
          </div>

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <>
              <div className="card">
                <div className="section-title">Profile Information</div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea
                    className="form-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input
                    type="text"
                    className="form-input"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Avatar URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <button
                  className="button button-primary"
                  onClick={handleUpdateProfile}
                  disabled={actionLoading === 'update-profile'}
                >
                  {actionLoading === 'update-profile' ? 'Updating...' : 'Update Profile'}
                </button>

                <div className="divider"></div>

                <div className="section-title">Account Information</div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="read-only-field">{user?.email}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Account Created</label>
                  <div className="read-only-field">{authUser ? formatDate(authUser.created_at) : 'N/A'}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Last Sign In</label>
                  <div className="read-only-field">{authUser ? formatDate(authUser.last_sign_in_at) : 'N/A'}</div>
                </div>

                <div className="divider"></div>

                <div className="section-title">Update Email</div>

                <div className="form-group">
                  <label className="form-label">New Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new-email@example.com"
                  />
                </div>

                <button
                  className="button button-secondary"
                  onClick={handleUpdateEmail}
                  disabled={actionLoading === 'update-email' || !newEmail}
                >
                  <Mail size={18} />
                  {actionLoading === 'update-email' ? 'Updating...' : 'Update Email'}
                </button>

                <div className="divider"></div>

                <div className="section-title">Update Password</div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  className="button button-secondary"
                  onClick={handleUpdatePassword}
                  disabled={actionLoading === 'update-password' || !newPassword || !confirmPassword}
                >
                  <Lock size={18} />
                  {actionLoading === 'update-password' ? 'Updating...' : 'Update Password'}
                </button>

                <div className="divider"></div>

                <button
                  className="button button-secondary"
                  onClick={handleSignOut}
                  disabled={actionLoading === 'sign-out'}
                >
                  {actionLoading === 'sign-out' ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </>
          )}

          {/* SLACK TAB */}
          {activeTab === 'slack' && (
            <div className="card">
              <div className="section-title">Slack Integration</div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
                Get notifications in Slack when your SQL queries are analyzed. Create an incoming webhook in your Slack workspace and paste the URL below.
              </p>

              <div className="form-group">
                <label className="form-label">Slack Webhook URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Enable Slack Notifications</label>
                <div className="toggle-container">
                  <div
                    className={`toggle ${slackEnabled ? 'active' : ''}`}
                    onClick={() => setSlackEnabled(!slackEnabled)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                    {slackEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="button-group">
                <button
                  className="button button-primary"
                  onClick={handleUpdateSlack}
                  disabled={actionLoading === 'update-slack'}
                >
                  {actionLoading === 'update-slack' ? 'Saving...' : 'Save Slack Settings'}
                </button>
                <button
                  className="button button-secondary"
                  onClick={handleTestSlack}
                  disabled={actionLoading === 'test-slack' || !slackWebhookUrl}
                >
                  {actionLoading === 'test-slack' ? 'Testing...' : 'Test Integration'}
                </button>
              </div>
            </div>
          )}

          {/* API ACCESS TAB */}
          {activeTab === 'api' && (
            <div className="card">
              <div className="section-title">API Key & Webhook Usage</div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
                Your API key authenticates webhook requests. Keep it secret and never expose it in client-side code.
              </p>

              {apiKey ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Your API Key</label>
                    <div className="api-key-display">
                      <code style={{ flex: 1 }}>
                        {showFullApiKey ? apiKey : maskApiKey(apiKey)}
                      </code>
                      <button
                        className="button button-secondary"
                        style={{ padding: '8px 12px' }}
                        onClick={handleCopyApiKey}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ padding: '8px 12px' }}
                        onClick={() => setShowFullApiKey(!showFullApiKey)}
                      >
                        {showFullApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <button
                    className="button button-secondary"
                    onClick={handleRegenerateApiKey}
                    disabled={actionLoading === 'regenerate-api-key'}
                  >
                    <RefreshCw size={18} />
                    {actionLoading === 'regenerate-api-key' ? 'Regenerating...' : 'Regenerate API Key'}
                  </button>
                </>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', background: '#0d0f11', borderRadius: '8px', border: '1px solid #1f2327' }}>
                  <Key size={48} style={{ color: '#1f2327', marginBottom: '16px' }} />
                  <p style={{ color: '#9ca3af', marginBottom: '16px' }}>No API key generated yet</p>
                  <button
                    className="button button-primary"
                    onClick={handleRegenerateApiKey}
                    disabled={actionLoading === 'regenerate-api-key'}
                  >
                    <RefreshCw size={18} />
                    {actionLoading === 'regenerate-api-key' ? 'Generating...' : 'Generate API Key'}
                  </button>
                </div>
              )}

              <div className="divider"></div>

              <div className="section-title">Webhook API</div>
              <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
                Trigger SQL analysis via HTTP POST. Authenticate using the x-api-key header.
              </p>
              <div style={{
                background: '#0d0f11',
                border: '1px solid #1f2327',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#00ffa3'
              }}>
                POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">cURL</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`curl -X POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || '<API_KEY>'}" \\
  -d '{
    "sql": "SELECT * FROM orders WHERE user_id = 123",
    "db_type": "postgres"
  }'`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`curl -X POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || '<API_KEY>'}" \\
  -d '{
    "sql": "SELECT * FROM orders WHERE user_id = 123",
    "db_type": "postgres"
  }'`, 'curl')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'curl' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">JavaScript (fetch)</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`const response = await fetch('https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey || '<API_KEY>'}'
  },
  body: JSON.stringify({
    sql: "SELECT * FROM orders WHERE user_id = 123",
    db_type: 'postgres'
  })
});

const result = await response.json();
console.log('Score:', result.score);
console.log('Rewritten:', result.rewrittenQuery);
console.log('Index:', result.suggestedIndex);`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`const response = await fetch('https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey || '<API_KEY>'}'
  },
  body: JSON.stringify({
    sql: "SELECT * FROM orders WHERE user_id = 123",
    db_type: 'postgres'
  })
});

const result = await response.json();
console.log('Score:', result.score);
console.log('Rewritten:', result.rewrittenQuery);
console.log('Index:', result.suggestedIndex);`, 'js-fetch')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'js-fetch' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Node.js (axios)</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`import axios from 'axios';

async function analyzeQuery(sql, dbType = 'postgres') {
  try {
    const response = await axios.post(
      'https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook',
      {
        sql: sql,
        db_type: dbType
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.DBPOWERAI_API_KEY
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Analysis failed:', error.response?.data);
    throw error;
  }
}

// Usage
const result = await analyzeQuery(
  "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'"
);
console.log(\`Performance score: \${result.score}\`);
console.log(\`Suggested index: \${result.suggestedIndex}\`);`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`import axios from 'axios';

async function analyzeQuery(sql, dbType = 'postgres') {
  try {
    const response = await axios.post(
      'https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook',
      {
        sql: sql,
        db_type: dbType
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.DBPOWERAI_API_KEY
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Analysis failed:', error.response?.data);
    throw error;
  }
}

// Usage
const result = await analyzeQuery(
  "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'"
);
console.log(\`Performance score: \${result.score}\`);
console.log(\`Suggested index: \${result.suggestedIndex}\`);`, 'node-axios')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'node-axios' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Python (requests)</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`import requests
import os

def analyze_query(sql, db_type='postgres', schema=None, explain_plan=None):
    payload = {
        'sql': sql,
        'db_type': db_type
    }

    if schema:
        payload['database_schema'] = schema

    if explain_plan:
        payload['explain_plan'] = explain_plan

    response = requests.post(
        'https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.getenv('DBPOWERAI_API_KEY')
        },
        json=payload
    )

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Analysis failed: {response.status_code} - {response.text}")

# Usage
result = analyze_query(
    "SELECT * FROM users WHERE email LIKE '%@gmail.com'",
    db_type='postgres'
)

print(f"Score: {result['score']}")
print(f"Severity: {result['severity']}")
print(f"Speedup: {result['speedupEstimate']}")
print(f"Bottleneck: {result.get('bottleneck', 'None')}")
print(f"Index: {result['suggestedIndex']}")

for issue in result['issues']:
    print(f"Issue: {issue}")

if result.get('warnings'):
    print(f"Warnings: {result['warnings']}")

if result.get('detected_patterns'):
    import json
    patterns = json.loads(result['detected_patterns'])
    print(f"Detected patterns: {patterns}")`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`import requests
import os

def analyze_query(sql, db_type='postgres', schema=None, explain_plan=None):
    payload = {
        'sql': sql,
        'db_type': db_type
    }

    if schema:
        payload['database_schema'] = schema

    if explain_plan:
        payload['explain_plan'] = explain_plan

    response = requests.post(
        'https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.getenv('DBPOWERAI_API_KEY')
        },
        json=payload
    )

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Analysis failed: {response.status_code} - {response.text}")

# Usage
result = analyze_query(
    "SELECT * FROM users WHERE email LIKE '%@gmail.com'",
    db_type='postgres'
)

print(f"Score: {result['score']}")
print(f"Severity: {result['severity']}")
print(f"Speedup: {result['speedupEstimate']}")
print(f"Bottleneck: {result.get('bottleneck', 'None')}")
print(f"Index: {result['suggestedIndex']}")

for issue in result['issues']:
    print(f"Issue: {issue}")

if result.get('warnings'):
    print(f"Warnings: {result['warnings']}")

if result.get('detected_patterns'):
    import json
    patterns = json.loads(result['detected_patterns'])
    print(f"Detected patterns: {patterns}")`, 'python')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'python' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">GitHub Action</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`name: Analyze SQL Queries

on:
  pull_request:
    paths:
      - '**.sql'
      - 'migrations/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Analyze SQL files
        run: |
          for file in $(find . -name "*.sql"); do
            echo "Analyzing $file"

            SQL_CONTENT=$(cat "$file" | jq -Rs .)

            RESPONSE=$(curl -s -X POST \\
              https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
              -H "Content-Type: application/json" \\
              -H "x-api-key: \${{ secrets.DBPOWERAI_API_KEY }}" \\
              -d "{\\"sql\\": $SQL_CONTENT, \\"db_type\\": \\"postgres\\"}")

            SCORE=$(echo $RESPONSE | jq -r '.score')
            SEVERITY=$(echo $RESPONSE | jq -r '.severity')

            echo "Score: $SCORE | Severity: $SEVERITY"

            if [ "$SEVERITY" = "high" ]; then
              echo "::error file=$file::High severity issues detected"
              exit 1
            fi
          done`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`name: Analyze SQL Queries

on:
  pull_request:
    paths:
      - '**.sql'
      - 'migrations/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Analyze SQL files
        run: |
          for file in $(find . -name "*.sql"); do
            echo "Analyzing $file"

            SQL_CONTENT=$(cat "$file" | jq -Rs .)

            RESPONSE=$(curl -s -X POST \\
              https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
              -H "Content-Type: application/json" \\
              -H "x-api-key: \${{ secrets.DBPOWERAI_API_KEY }}" \\
              -d "{\\"sql\\": $SQL_CONTENT, \\"db_type\\": \\"postgres\\"}")

            SCORE=$(echo $RESPONSE | jq -r '.score')
            SEVERITY=$(echo $RESPONSE | jq -r '.severity')

            echo "Score: $SCORE | Severity: $SEVERITY"

            if [ "$SEVERITY" = "high" ]; then
              echo "::error file=$file::High severity issues detected"
              exit 1
            fi
          done`, 'github-action')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'github-action' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
                  💡 Store your API key in GitHub Secrets as DBPOWERAI_API_KEY
                </p>
              </div>

              <div className="divider"></div>

              <div className="section-title">Request & Response Format</div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Request Fields</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`{
  "sql": "string (required) — Your SQL query",
  "db_type": "string (optional) — 'postgres' or 'mysql'",
  "database_schema": "string (optional) — CREATE TABLE statements",
  "explain_plan": "string (optional) — EXPLAIN output"
}`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`{
  "sql": "string (required) — Your SQL query",
  "db_type": "string (optional) — 'postgres' or 'mysql'",
  "database_schema": "string (optional) — CREATE TABLE statements",
  "explain_plan": "string (optional) — EXPLAIN output"
}`, 'request-fields')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'request-fields' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Response Fields</label>
                <div style={{ position: 'relative' }}>
                  <div className="code-block">
                    <pre>{`{
  "score": number,              // 0-100 performance score (e.g., 85)
  "severity": string,           // "low", "medium", or "high"
  "speedupEstimate": number,    // Estimated speedup multiplier (e.g., 0.5)
  "rewrittenQuery": string,     // Optimized SQL
  "suggestedIndex": string,     // CREATE INDEX statement or message
  "issues": string[],           // Array of detected issues
  "semantic_warning": string | null,  // Semantic change warning
  "validator_status": string,   // "valid" or validation status
  "bottleneck": string | null,  // Main performance bottleneck detected
  "analysis": string | null,    // Detailed analysis JSON string
  "warnings": string | null,    // Performance warnings
  "detected_patterns": string | null,  // Anti-patterns found (JSON)
  "schema": string | null,      // Database schema used
  "execution_plan": string | null     // EXPLAIN plan analysis
}`}</pre>
                  </div>
                  <button
                    onClick={() => handleCopyCode(`{
  "score": number,              // 0-100 performance score (e.g., 85)
  "severity": string,           // "low", "medium", or "high"
  "speedupEstimate": number,    // Estimated speedup multiplier (e.g., 0.5)
  "rewrittenQuery": string,     // Optimized SQL
  "suggestedIndex": string,     // CREATE INDEX statement or message
  "issues": string[],           // Array of detected issues
  "semantic_warning": string | null,  // Semantic change warning
  "validator_status": string,   // "valid" or validation status
  "bottleneck": string | null,  // Main performance bottleneck detected
  "analysis": string | null,    // Detailed analysis JSON string
  "warnings": string | null,    // Performance warnings
  "detected_patterns": string | null,  // Anti-patterns found (JSON)
  "schema": string | null,      // Database schema used
  "execution_plan": string | null     // EXPLAIN plan analysis
}`, 'response-fields')}
                    className="button button-secondary"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      minWidth: '70px'
                    }}
                  >
                    {copiedCode === 'response-fields' ? (
                      <>
                        <CheckCircle size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="divider"></div>

              <div className="section-title">Webhook FAQ</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    Do I need a JWT, signature, or timestamp?
                  </h4>
                  <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
                    No. Authentication uses only the x-api-key header. No signing, no HMAC, no additional security headers.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    What is the exact endpoint URL?
                  </h4>
                  <div style={{ position: 'relative', marginTop: '8px' }}>
                    <div className="code-block">
                      <pre>POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook</pre>
                    </div>
                    <button
                      onClick={() => handleCopyCode('POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook', 'faq-endpoint')}
                      className="button button-secondary"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        minWidth: '70px'
                      }}
                    >
                      {copiedCode === 'faq-endpoint' ? (
                        <>
                          <CheckCircle size={14} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    What fields does the request accept?
                  </h4>
                  <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '8px' }}>
                    • <strong>sql</strong> (string, required) — Your SQL query<br />
                    • <strong>db_type</strong> (string, optional) — "postgres" or "mysql"<br />
                    • <strong>database_schema</strong> (string, optional) — CREATE TABLE statements for context<br />
                    • <strong>explain_plan</strong> (string, optional) — EXPLAIN output for deeper analysis
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                    No other fields are supported. Do not send invented fields.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    What errors can I get?
                  </h4>
                  <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
                    • <strong>400 Bad Request</strong> — Missing sql field or invalid JSON<br />
                    • <strong>401 Unauthorized</strong> — Missing x-api-key header<br />
                    • <strong>403 Forbidden</strong> — Invalid or expired API key<br />
                    • <strong>500 Internal Server Error</strong> — Contact support if this persists
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    Is there a payload size limit?
                  </h4>
                  <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
                    Keep queries under 50KB. For very large schemas, include only relevant tables.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    How do I test the webhook?
                  </h4>
                  <div style={{ position: 'relative', marginTop: '8px' }}>
                    <div className="code-block">
                      <pre>{`curl -X POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"sql": "SELECT * FROM users LIMIT 10", "db_type": "postgres"}'`}</pre>
                    </div>
                    <button
                      onClick={() => handleCopyCode(`curl -X POST https://onfhmkhhjnouspczrwcr.supabase.co/functions/v1/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"sql": "SELECT * FROM users LIMIT 10", "db_type": "postgres"}'`, 'faq-test')}
                      className="button button-secondary"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        minWidth: '70px'
                      }}
                    >
                      {copiedCode === 'faq-test' ? (
                        <>
                          <CheckCircle size={14} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>
                    Check for a 200 response with a score field.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#e5e5e5', marginBottom: '8px' }}>
                    Can I send EXPLAIN output for better analysis?
                  </h4>
                  <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
                    Yes. Run EXPLAIN or EXPLAIN ANALYZE on your database, then include the output in the explain_plan field. This gives more accurate bottleneck detection.
                  </p>
                </div>
              </div>

              <div className="divider"></div>

              <div style={{
                background: 'rgba(0, 255, 163, 0.05)',
                border: '1px solid rgba(0, 255, 163, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                  🔒 <strong style={{ color: '#e5e5e5' }}>Security Notice:</strong> Never expose your API key in client-side code. Use it only in backend services, CI/CD pipelines, or server environments.
                </p>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                  ✓ Include database_schema for better index recommendations<br />
                  ✓ Send explain_plan output when available for accurate bottleneck detection<br />
                  ✓ Speedup estimates are pattern-based — always benchmark in staging<br />
                  ✓ Check semantic_warning field before deploying rewritten queries<br />
                  ✓ Store API key in environment variables (DBPOWERAI_API_KEY)
                </p>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="section-title">Danger Zone</div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
                Once you delete your account, there is no going back. This will permanently delete your profile data and anonymize your query history.
              </p>

              <div style={{ background: '#0d0f11', border: '1px solid #ef4444', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ color: '#ef4444', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
                  Delete Account
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                  This action cannot be undone. Your profile will be permanently deleted, your query history will be anonymized, and your authentication account will be removed.
                </p>
                <button
                  className="button button-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={18} />
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '16px' }}>
                Delete Account?
              </h2>
              <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
                This action is permanent and cannot be undone. All your profile data will be deleted and your query history will be anonymized.
              </p>
              <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
                Type <strong style={{ color: '#e5e5e5' }}>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                className="form-input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                style={{ marginBottom: '24px' }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="button button-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || actionLoading === 'delete-account'}
                  style={{ flex: 1 }}
                >
                  {actionLoading === 'delete-account' ? 'Deleting...' : 'Delete Account'}
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
