import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile, UserProfile } from '../lib/profileService';
import { Menu, X, User, LogOut } from 'lucide-react';

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userProfile = await getProfile(user.id);
        setProfile(userProfile);
        checkAdminRole();
      }
    };
    loadProfile();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin_run_tests?check=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      setIsAdmin(response.status === 200);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => authSubscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <style>{`
        .navbar {
          background: rgba(13, 15, 17, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #1f2327;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .navbar-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #00ffa3;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          cursor: pointer;
        }

        .navbar-logo img {
          width: 36px;
          height: 36px;
        }

        .navbar-logo:hover {
          opacity: 0.8;
        }

        .navbar-desktop-menu {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .navbar-link {
          color: #9ca3af;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .navbar-link:hover,
        .navbar-link.active {
          color: #00ffa3;
        }

        .navbar-user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .navbar-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 8px;
          color: #00ffa3;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .navbar-profile-btn:hover {
          background: rgba(0, 255, 163, 0.15);
        }

        .navbar-logout-btn {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #4b5563;
          border-radius: 8px;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .navbar-logout-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .navbar-mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #00ffa3;
          cursor: pointer;
          padding: 8px;
        }

        .navbar-mobile-menu {
          display: none;
          top: 65px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 12, 14, 0.98);
          backdrop-filter: blur(10px);
          z-index: 999;
          flex-direction: column;
          padding: 24px;
          gap: 24px;
          overflow-y: auto;
        }

        .navbar-mobile-menu.open {
          display: flex;
        }

        .navbar-mobile-link {
          color: #e5e5e5;
          text-decoration: none;
          font-size: 18px;
          font-weight: 600;
          padding: 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          text-align: center;
        }

        .navbar-mobile-link:hover,
        .navbar-mobile-link.active {
          color: #00ffa3;
          background: rgba(0, 255, 163, 0.1);
        }

        .navbar-mobile-divider {
          height: 1px;
          background: #1f2327;
          margin: 8px 0;
        }

        @media (max-width: 767px) {
          .navbar-desktop-menu {
            display: none;
          }

          .navbar-mobile-toggle {
            display: block;
          }

          .navbar-logo {
            font-size: 18px;
          }

          .navbar-container {
            padding: 12px 16px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="DBPowerAI" />
            DBPowerAI
          </div>

          <div className="navbar-desktop-menu">
            {user ? (
              <>
                <a href="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>About</a>
                <a href="/features" className={`navbar-link ${isActive('/features') ? 'active' : ''}`}>Features</a>
                <a href="/pricing" className={`navbar-link ${isActive('/pricing') ? 'active' : ''}`}>Pricing</a>
                <a href="/app" className={`navbar-link ${isActive('/app') ? 'active' : ''}`}>Analize</a>
                <a href="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</a>
                {isAdmin && (
                  <a href="/admin" className={`navbar-link ${isActive('/admin') ? 'active' : ''}`}>Admin</a>
                )}
                <a href="/contact" className={`navbar-link ${isActive('/contact') ? 'active' : ''}`}>Contact</a>
                <div className="navbar-user-menu">
                  <button onClick={() => navigate('/profile')} className="navbar-profile-btn">
                    <User size={16} />
                    Profile
                  </button>
                  <button onClick={handleLogout} className="navbar-logout-btn">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <a href="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>About</a>
                <a href="/features" className={`navbar-link ${isActive('/features') ? 'active' : ''}`}>Features</a>
                <a href="/pricing" className={`navbar-link ${isActive('/pricing') ? 'active' : ''}`}>Pricing</a>
                <a href="/api" className={`navbar-link ${isActive('/api') ? 'active' : ''}`}>API  <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    background: 'rgba(0, 255, 163, 0.1)',
                    border: '1px solid rgba(0,255,163,0.3)',
                    color: '#00ffa3',
                    letterSpacing: '0.5px'
                  }}
                >
                  soon
                </span></a>
                <a href="/contact" className={`navbar-link ${isActive('/contact') ? 'active' : ''}`}>Contact</a>
                <a href="/login" className={`navbar-link ${isActive('/login') ? 'active' : ''}`}>Sign in</a>
                <a href="/signup" className="navbar-profile-btn">Sign up</a>
              </>
            )}
          </div>

          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <a href="/about" className={`navbar-mobile-link ${isActive('/about') ? 'active' : ''}`} onClick={closeMobileMenu}>About</a>
              <a href="/features" className={`navbar-mobile-link ${isActive('/features') ? 'active' : ''}`} onClick={closeMobileMenu}>Features</a>
              <a href="/pricing" className={`navbar-mobile-link ${isActive('/pricing') ? 'active' : ''}`} onClick={closeMobileMenu}>Pricing</a>
              <a href="/app" className={`navbar-mobile-link ${isActive('/app') ? 'active' : ''}`} onClick={closeMobileMenu}>Analize</a>
              <a href="/dashboard" className={`navbar-mobile-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={closeMobileMenu}>Dashboard</a>
              <a href="/api" className={`navbar-mobile-link ${isActive('/api') ? 'active' : ''}`} onClick={closeMobileMenu}>API </a>
              {isAdmin && (
                <a href="/admin" className={`navbar-mobile-link ${isActive('/admin') ? 'active' : ''}`} onClick={closeMobileMenu}>Admin</a>
              )}
              <a href="/contact" className={`navbar-mobile-link ${isActive('/contact') ? 'active' : ''}`} onClick={closeMobileMenu}>Contact</a>
              <div className="navbar-mobile-divider"></div>
              <a href="/profile" className="navbar-mobile-link" onClick={closeMobileMenu}>Profile</a>
              <button onClick={handleLogout} className="navbar-mobile-link" style={{ background: 'none', border: 'none' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <a href="/about" className={`navbar-mobile-link ${isActive('/about') ? 'active' : ''}`} onClick={closeMobileMenu}>About</a>
              <a href="/features" className={`navbar-mobile-link ${isActive('/features') ? 'active' : ''}`} onClick={closeMobileMenu}>Features</a>
              <a href="/pricing" className={`navbar-mobile-link ${isActive('/pricing') ? 'active' : ''}`} onClick={closeMobileMenu}>Pricing</a>
              <a href="/api" className={`navbar-mobile-link ${isActive('/api') ? 'active' : ''}`} onClick={closeMobileMenu}>API  <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  background: 'rgba(0, 255, 163, 0.1)',
                  border: '1px solid rgba(0,255,163,0.3)',
                  color: '#00ffa3',
                  letterSpacing: '0.5px'
                }}
              >
                soon
              </span></a>
              <a href="/contact" className={`navbar-mobile-link ${isActive('/contact') ? 'active' : ''}`} onClick={closeMobileMenu}>Contact</a>
              <div className="navbar-mobile-divider"></div>
              <a href="/login" className={`navbar-mobile-link ${isActive('/login') ? 'active' : ''}`} onClick={closeMobileMenu}>Sign in</a>
              <a href="/signup" className="navbar-mobile-link" onClick={closeMobileMenu} style={{ color: '#00ffa3', background: 'rgba(0, 255, 163, 0.1)' }}>Sign up</a>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
