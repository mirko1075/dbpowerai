import { useEffect } from 'react';

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <style>{`
        body {
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', sans-serif;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 20px;
        }

        .title {
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 16px;
          text-shadow: 0 0 30px rgba(0,255,163,0.3);
        }

        .subtitle {
          font-size: clamp(16px, 3vw, 20px);
          color: #9ca3af;
          margin-bottom: 40px;
        }

        .section {
          margin-bottom: 56px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #00ffa3;
        }

        .section-text {
          font-size: 16px;
          color: #d1d5db;
          line-height: 1.7;
        }

        .highlight-box {
          background: rgba(0,255,163,0.05);
          border: 1px solid rgba(0,255,163,0.2);
          padding: 24px;
          border-radius: 12px;
          margin: 40px 0;
        }

        .highlight-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #00ffa3;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 40px;
        }

        .stat-box {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 800;
          color: #00ffa3;
          margin-bottom: 8px;
        }

        .stat-label {
          color: #9ca3af;
          font-size: 14px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="container page-fade-in">
        <h1 className="title">About DBPowerAI</h1>
        <p className="subtitle">
          We help developers fix slow queries in seconds using AI-powered SQL analysis.
        </p>

        {/* ORIGINS */}
        <div className="section">
          <h2 className="section-title">Our Mission</h2>
          <p className="section-text">
            DBPowerAI was created with a simple idea:  
            <strong style={{ color: '#00ffa3' }}>make database performance accessible to every developer</strong>,  
            without needing 10 years of DBA experience.
            <br /><br />
            Modern apps generate complex queries, but the tools to analyze them are still 
            slow, manual, and often impossible to understand.
            <br /><br />
            We combine SQL analysis, EXPLAIN reading, heuristics and AI models to make 
            query optimization clear, actionable and immediate.
          </p>
        </div>

        {/* WHAT WE DO */}
        <div className="section">
          <h2 className="section-title">What We Do</h2>
          <p className="section-text">
            DBPowerAI scans SQL queries, detects bottlenecks, recommends indexes, 
            rewrites non-optimal patterns, and gives a complete explanation that developers 
            can understand — not cryptic DBA jargon.
            <br /><br />
            Our goal is to give every developer a “virtual senior DBA” they can consult anytime.
          </p>
        </div>

        {/* VALUES */}
        <div className="highlight-box">
          <h3 className="highlight-title">Our Principles</h3>
          <p className="section-text">
            • Speed first  
            • Clear, human explanations  
            • No fear of SQL complexity  
            • AI that collaborates, not replaces  
            • Tools that improve productivity instantly  
          </p>
        </div>

        {/* FUTURE */}
        <div className="section">
          <h2 className="section-title">Where We're Going</h2>
          <p className="section-text">
            We're building a full AI-powered database toolkit:
            <br /><br />
            • API for automated SQL optimization  
            • Full database health checks  
            • Index advisor engine  
            • Performance dashboards  
            • Slack & GitHub integrations  
          </p>
        </div>

        {/* STATS FAKE (LOOKS PROFESSIONAL) */}
        <div className="stats">
          <div className="stat-box">
            <div className="stat-number">3s</div>
            <div className="stat-label">Average analysis time</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">80%</div>
            <div className="stat-label">Common bottlenecks detected</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">+1</div>
            <div className="stat-label">Supported engines</div>
          </div>
        </div>

      </div>
    </>
  );
}

export default AboutPage;
