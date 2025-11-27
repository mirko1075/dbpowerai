import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile, UserProfile } from '../lib/profileService';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [learnMobileOpen, setLearnMobileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const learnContentRef = useRef<HTMLDivElement | null>(null);

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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin_run_tests?check=1`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      setIsAdmin(response.status === 200);
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const isLearnActive = [
    '/slow-query-analyzer',
    '/sql-query-optimization',
    '/mysql-slow-queries',
    '/postgres-slow-queries',
    '/explain-plan-analyzer',
    '/sql-performance-examples',
  ].some(path => location.pathname.startsWith(path));

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
          cursor: pointer;
        }

        .navbar-logo img {
          width: 36px;
          height: 36px;
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
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .navbar-link:hover,
        .navbar-link.active {
          color: #00ffa3;
        }

        /* DROPDOWN DESKTOP */
        .learn-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          color: #9ca3af;
          border: none;
          background: transparent;
          padding: 0;
        }

        .learn-toggle.active,
        .learn-toggle:hover {
          color: #00ffa3;
        }

        .desktop-dropdown {
          position: absolute;
          top: 55px;
          left: 0;
          width: 260px;
          background: #020617;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 8px 0;
          opacity: 0;
          transform: translateY(-6px);
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
          box-shadow: 0px 18px 32px rgba(0, 0, 0, 0.5);
        }

        .desktop-dropdown.open {
          opacity: 1;
          transform: translateY(0px);
          pointer-events: auto;
        }

        .dropdown-link {
          display: block;
          padding: 10px 16px;
          color: #e5e7eb;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .dropdown-link:hover {
          background: rgba(0, 255, 163, 0.08);
          color: #00ffa3;
        }

        .dropdown-divider {
          height: 1px;
          background: #111827;
          margin: 6px 0;
        }

        /* MOBILE */
        .navbar-mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #00ffa3;
        }

        .navbar-mobile-menu {
          display: none;
          flex-direction: column;
          background: rgba(10, 12, 14, 0.97);
          padding: 24px;
          gap: 16px;
        }

        .navbar-mobile-menu.open {
          display: flex;
        }

        .navbar-mobile-link {
          font-size: 18px;
          color: #e5e5e5;
          text-decoration: none;
          padding: 14px;
          border-radius: 6px;
          transition: all 0.15s;
        }

        .navbar-mobile-link:hover,
        .navbar-mobile-link.active {
          background: rgba(0,255,163,0.1);
          color: #00ffa3;
        }

        /* MOBILE LEARN ACCORDION */
        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 14px;
          font-size: 18px;
          font-weight: 600;
          border-radius: 6px;
          color: #e5e7eb;
          cursor: pointer;
          transition: all 0.2s;
        }

        .accordion-header:hover {
          background: rgba(0,255,163,0.06);
        }

        .accordion-content {
          overflow: hidden;
          transition: max-height 0.25s ease, opacity 0.25s ease;
          opacity: 0;
          max-height: 0;
        }

        .accordion-content.open {
          opacity: 1;
          max-height: 500px;
        }

        .accordion-sublink {
          display: block;
          padding: 10px 24px;
          font-size: 16px;
          color: #9ca3af;
          text-decoration: none;
          transition: 0.2s;
        }

        .accordion-sublink:hover {
          color: #00ffa3;
          background: rgba(0,255,163,0.08);
        }

        @media (max-width: 767px) {
          .navbar-desktop-menu {
            display: none;
          }

          .navbar-mobile-toggle {
            display: block;
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

          {/* DESKTOP MENU */}
          <div className="navbar-desktop-menu">
            <a href="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>About</a>
            <a href="/features" className={`navbar-link ${isActive('/features') ? 'active' : ''}`}>Features</a>

            {/* LEARN DESKTOP */}
            <div style={{ position: 'relative' }}>
              <button
                className={`learn-toggle ${isLearnActive || learnOpen ? 'active' : ''}`}
                onClick={() => setLearnOpen(!learnOpen)}
              >
                Learn
                <ChevronDown
                  size={14}
                  style={{
                    transform: learnOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: '0.2s'
                  }}
                />
              </button>

              <div className={`desktop-dropdown ${learnOpen ? 'open' : ''}`}>
                <a href="/slow-query-analyzer" className="dropdown-link">Slow Query Analyzer</a>
                <a href="/sql-query-optimization" className="dropdown-link">SQL Query Optimization</a>
                <div className="dropdown-divider" />
                <a href="/mysql-slow-queries" className="dropdown-link">MySQL Slow Queries</a>
                <a href="/postgres-slow-queries" className="dropdown-link">PostgreSQL Slow Queries</a>
                <div className="dropdown-divider" />
                <a href="/explain-plan-analyzer" className="dropdown-link">EXPLAIN Plan Analyzer</a>
                <a href="/sql-performance-examples" className="dropdown-link">SQL Performance Examples</a>
              </div>
            </div>

            <a href="/pricing" className={`navbar-link ${isActive('/pricing') ? 'active' : ''}`}>Pricing</a>
            <a href="/contact" className={`navbar-link ${isActive('/contact') ? 'active' : ''}`}>Contact</a>
            {!user && (
              <>
                <a href="/login" className={`navbar-link ${isActive('/login') ? 'active' : ''}`}>Sign in</a>
                <a href="/signup" className="navbar-link" style={{ color: '#00ffa3' }}>Sign up</a>
              </>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="/about" className="navbar-mobile-link">About</a>
          <a href="/features" className="navbar-mobile-link">Features</a>

          {/* ACCORDION LEARN MOBILE */}
          <div
            className="accordion-header"
            onClick={() => setLearnMobileOpen(!learnMobileOpen)}
          >
            Learn
            <ChevronDown
              size={20}
              style={{
                transform: learnMobileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: '0.2s'
              }}
            />
          </div>

          <div className={`accordion-content ${learnMobileOpen ? 'open' : ''}`}>
            <a href="/slow-query-analyzer" className="accordion-sublink">Slow Query Analyzer</a>
            <a href="/sql-query-optimization" className="accordion-sublink">SQL Query Optimization</a>
            <a href="/mysql-slow-queries" className="accordion-sublink">MySQL Slow Queries</a>
            <a href="/postgres-slow-queries" className="accordion-sublink">PostgreSQL Slow Queries</a>
            <a href="/explain-plan-analyzer" className="accordion-sublink">EXPLAIN Plan Analyzer</a>
            <a href="/sql-performance-examples" className="accordion-sublink">SQL Performance Examples</a>
          </div>

          <a href="/pricing" className="navbar-mobile-link">Pricing</a>
          <a href="/contact" className="navbar-mobile-link">Contact</a>
          {!user ? (
            <>
              <a href="/login" className="navbar-mobile-link">Sign in</a>
              <a href="/signup" className="navbar-mobile-link" style={{ color: '#00ffa3' }}>Sign up</a>
            </>
          ) : null}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
