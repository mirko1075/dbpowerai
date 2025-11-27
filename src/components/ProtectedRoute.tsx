import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Once loading is done and there's no user, redirect to login
    if (!isLoading && !user) {
      console.log('🔒 ProtectedRoute: No user found, redirecting to login');
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0d0f11',
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
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not loading and no user, return null (redirect happens in useEffect)
  if (!user) {
    return null;
  }

  // User is authenticated, render the protected content
  console.log('✅ ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
}

export default ProtectedRoute;
