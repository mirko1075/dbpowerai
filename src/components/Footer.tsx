function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: #0a0c0e;
          border-top: 1px solid #1f2327;
          padding: 32px 24px;
        }

        .footer-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .footer-text {
          color: #9ca3af;
          font-size: 14px;
          text-align: center;
        }

        .footer-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .footer-link {
          color: #00ffa3;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }

        .footer-link:hover {
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .footer {
            padding: 24px 16px;
          }

          .footer-links {
            gap: 16px;
          }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-text">
            © 2025 DBPowerAI — All rights reserved.
          </div>
          <div className="footer-links">
            <a href="https://github.com/mirkosiddi" target="_blank" rel="noopener noreferrer" className="footer-link">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/mirkosiddi" target="_blank" rel="noopener noreferrer" className="footer-link">
              LinkedIn
            </a>
            <a href="https://x.com/dbpowerai" target="_blank" rel="noopener noreferrer" className="footer-link">
              X (Twitter)
            </a>
            <a href="https://www.tiktok.com/@dbpowerai" target="_blank" rel="noopener noreferrer" className="footer-link">
              TikTok
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
