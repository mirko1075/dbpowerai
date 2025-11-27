import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ensureProfileExists, updateProfile, getProfileStats, UserProfile as DBUserProfile } from '../lib/profileService';
import { AlertCircle, CheckCircle, User, Mail, Lock, Trash2, Briefcase, FileText } from 'lucide-react';

interface UserProfile extends DBUserProfile {
  provider: string;
  totalQueries?: number;
  memberSince?: string;
}

function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        navigate('/login');
        return;
      }

      const profile = await ensureProfileExists(authUser.id);

      if (!profile) {
        setErrorMessage('Failed to load profile');
        setLoading(false);
        return;
      }

      const stats = await getProfileStats(authUser.id);
      const provider = authUser.app_metadata.provider || 'email';

      setUser({
        ...profile,
        provider,
        totalQueries: stats.totalQueries,
        memberSince: stats.memberSince,
      });

      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setCompany(profile.company || '');
      setRole(profile.role || '');
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorMessage('Failed to load profile');
      setLoading(false);
    }
  };

  const getInitials = (email: string, name: string | null) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
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

      const updated = await updateProfile(user.id, {
        full_name: fullName,
        bio: bio,
        company: company,
        role: role,
      });

      if (!updated) {
        throw new Error('Failed to update profile');
      }

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setActionLoading('password');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccessMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update password');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    clearMessages();
    setActionLoading('delete');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Delete account error:', result.error);
        setErrorMessage('Something went wrong while deleting your account. Please try again.');
        setActionLoading(null);
        return;
      }

      await supabase.auth.signOut();

      navigate('/');
    } catch (err) {
      console.error('Unexpected error deleting account:', err);
      setErrorMessage('Unexpected error. Please try again.');
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    clearMessages();
    setActionLoading('logout');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to log out');
      setActionLoading(null);
    }
  };

  const isGoogleAccount = user?.provider === 'google';

  if (loading) {
    return (
      <>
        <style>{`
          body {
            background-color: #0d0f11;
            color: #e5e5e5;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11' }}>
          <div style={{
            minHeight: 'calc(100vh - 80px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e5e5e5'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #1f2327',
                borderTop: '4px solid #00ffa3',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading profile...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

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

        .profile-card {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 24px;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffa3 0%, #00cc82 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          color: #0d0f11;
          margin: 0 auto 16px;
          box-shadow: 0 0 30px rgba(0, 255, 163, 0.3);
        }

        .provider-badge {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #00ffa3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        input {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          transition: all 0.2s ease;
          width: 100%;
          padding: 14px;
          font-size: 15px;
          border-radius: 8px;
          font-family: inherit;
        }

        input::placeholder {
          color: #6b7280;
        }

        input:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-button {
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
        }

        .submit-button:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-button {
          background: transparent;
          color: #e5e5e5;
          border: 1px solid #1f2327;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-button:hover:not(:disabled) {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .danger-button {
          background: transparent;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .danger-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .danger-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
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

        .danger-zone {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 24px;
        }

        .disabled-note {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          padding: 12px;
          color: #fbbf24;
          font-size: 14px;
          margin-bottom: 16px;
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
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11' }}>

        <div className="page-fade-in" style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '80px 20px'
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '16px',
            textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
          }}>
            Profile Settings
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#9ca3af',
            marginBottom: '48px'
          }}>
            Manage your account settings and preferences
          </p>

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

          <div className="profile-card">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="avatar">
                {getInitials(user.email, user.full_name)}
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                {user.full_name || 'User'}
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#9ca3af',
                marginBottom: '12px'
              }}>
                {user.email}
              </p>
              <span className="provider-badge">
                {isGoogleAccount ? 'Google Account' : 'Email Account'}
              </span>

              {user.totalQueries !== undefined && (
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #1f2327'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ffa3' }}>
                      {user.totalQueries}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      Queries Analyzed
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ffa3' }}>
                      {new Date(user.memberSince || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      Member Since
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="section-title">
                <User size={20} style={{ color: '#00ffa3' }} />
                Profile Information
              </div>

              <div className="form-group">
                <label className="label" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  style={{
                    background: '#0a0c0e',
                    border: '1px solid #1f2327',
                    color: '#e5e5e5',
                    width: '100%',
                    padding: '14px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="company">
                  <Briefcase size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="role">
                  <FileText size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    background: '#0a0c0e',
                    border: '1px solid #1f2327',
                    color: '#e5e5e5',
                    width: '100%',
                    padding: '14px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select your role</option>
                  <option value="developer">Developer</option>
                  <option value="dba">Database Administrator</option>
                  <option value="data-engineer">Data Engineer</option>
                  <option value="analyst">Data Analyst</option>
                  <option value="architect">Software Architect</option>
                  <option value="devops">DevOps Engineer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={actionLoading === 'profile'}
                style={{ width: '100%' }}
              >
                {actionLoading === 'profile' ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          <div className="profile-card">
            <div className="section-title">
              <Mail size={20} style={{ color: '#00ffa3' }} />
              Change Email
            </div>

            <form onSubmit={handleUpdateEmail}>
              <div className="form-group">
                <label className="label" htmlFor="newEmail">
                  New Email Address
                </label>
                <input
                  type="email"
                  id="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newemail@example.com"
                />
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginTop: '6px'
                }}>
                  You will receive a confirmation email at your new address
                </p>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={actionLoading === 'email'}
                style={{ width: '100%' }}
              >
                {actionLoading === 'email' ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          </div>

          <div className="profile-card">
            <div className="section-title">
              <Lock size={20} style={{ color: '#00ffa3' }} />
              Change Password
            </div>

            {isGoogleAccount ? (
              <div className="disabled-note">
                Password management is not available for Google accounts. Your password is managed by Google.
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword}>
                <div className="form-group">
                  <label className="label" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={actionLoading === 'password'}
                  style={{ width: '100%' }}
                >
                  {actionLoading === 'password' ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

          <div className="profile-card danger-zone">
            <div className="section-title">
              <Trash2 size={20} style={{ color: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>Danger Zone</span>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#9ca3af',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Once you delete your account, there is no going back. All your data will be permanently removed.
            </p>

            <button
              type="button"
              className="danger-button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!!actionLoading}
              style={{ width: '100%' }}
            >
              Delete Account Permanently
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleLogout}
              disabled={actionLoading === 'logout'}
            >
              {actionLoading === 'logout' ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ef4444',
                marginBottom: '16px'
              }}>
                Delete Account?
              </h2>

              <p style={{
                fontSize: '15px',
                color: '#9ca3af',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}>
                Are you absolutely sure? This action cannot be undone. All your queries and data will be permanently deleted.
              </p>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  className="secondary-button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={!!actionLoading}
                >
                  Cancel
                </button>
                <button
                  className="danger-button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteAccount();
                  }}
                  disabled={actionLoading === 'delete'}
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

export default ProfilePage;
