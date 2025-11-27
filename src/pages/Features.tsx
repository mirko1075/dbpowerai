import { useEffect } from 'react';
import { Zap, Database, BarChart3, Wand2, Cpu, FileSearch } from 'lucide-react';

function FeaturesPage() {
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
          max-width: 1100px;
          margin: 0 auto;
          padding: 80px 20px;
        }

        .title {
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 800;
          margin-bottom: 16px;
          color: white;
          text-shadow: 0 0 30px rgba(0,255,163,0.3);
        }

        .subtitle {
          font-size: clamp(16px, 3vw, 20px);
          color: #9ca3af;
          max-width: 700px;
          margin-bottom: 40px;
        }

        .grid {
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          margin-top: 40px;
        }

        .card {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          padding: 28px;
          border-radius: 12px;
          transition: all 0.25s ease;
          cursor: default;
          position: relative;
        }

        .card:hover {
          border-color: rgba(0,255,163,0.4);
          box-shadow: 0 0 25px rgba(0,255,163,0.08);
          transform: translateY(-3px);
        }

        .card-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-text {
          color: #9ca3af;
          font-size: 15px;
          line-height: 1.6;
        }

        .section {
          margin: 80px 0;
        }

        .section-title {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 24px;
          text-align: center;
        }

        .before-after {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 840px) {
          .before-after {
            grid-template-columns: 1fr;
          }
        }

        .ba-box {
          background: rgba(0,255,163,0.06);
          border: 1px solid rgba(0,255,163,0.2);
          padding: 28px;
          border-radius: 12px;
        }

        .ba-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #00ffa3;
        }

        .ba-text {
          color: #d1d5db;
          line-height: 1.6;
          font-size: 15px;
        }

        .why-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .why-item {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
        }

        .why-num {
          font-size: 36px;
          font-weight: 800;
          color: #00ffa3;
          margin-bottom: 8px;
        }

        .why-label {
          font-size: 14px;
          color: #9ca3af;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }

      `}</style>

      <div className="container page-fade-in">

        {/* HERO */}
        <h1 className="title">Powerful Features</h1>
        <p className="subtitle">
          DBPowerAI helps developers fix slow queries instantly, detect hidden bottlenecks,
          rewrite inefficient SQL, and understand EXPLAIN plans like a senior DBA.
        </p>

        {/* CARDS */}
        <div className="grid">

          <div className="card">
            <h3 className="card-title">
              <Zap size={20} color="#00ffa3" /> Instant Query Analysis
            </h3>
            <p className="card-text">
              Paste any SQL and get immediate insights, performance evaluation 
              and clear explanations — no waiting, no manual work.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">
              <Database size={20} color="#00ffa3" /> EXPLAIN Plan Reader
            </h3>
            <p className="card-text">
              Stop guessing. AI interprets your EXPLAIN output and highlights 
              the exact steps slowing down your query.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">
              <BarChart3 size={20} color="#00ffa3" /> Bottleneck Detection
            </h3>
            <p className="card-text">
              Missing indexes, sequential scans, non-sargable filters, large sorts — 
              DBPowerAI identifies them instantly.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">
              <Wand2 size={20} color="#00ffa3" /> Smart Query Rewriting
            </h3>
            <p className="card-text">
              Automatically rewrites non-optimal queries with AI-generated improvements
              that maintain the original logic.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">
              <Cpu size={20} color="#00ffa3" /> Index Advisor Engine
            </h3>
            <p className="card-text">
              Get precise index recommendations based on real analysis — not generic rules.  
              Full SQL for every suggested index.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">
              <FileSearch size={20} color="#00ffa3" /> Pattern Recognition
            </h3>
            <p className="card-text">
              Detects anti-patterns, joins that can be optimized, unnecessary filters, 
              and expensive table scans.
            </p>
          </div>

        </div>

        {/* BEFORE / AFTER */}
        <div className="section">
          <h2 className="section-title">Before & After DBPowerAI</h2>

          <div className="before-after">

            <div className="ba-box">
              <h3 className="ba-title">Before</h3>
              <p className="ba-text">
                • Manual SQL debugging  
                • Slow, confusing EXPLAIN plans  
                • Trial-and-error optimizations  
                • Hours wasted investigating  
                • Hard to understand complex queries  
              </p>
            </div>

            <div className="ba-box" style={{ borderColor: 'rgba(0,255,163,0.4)' }}>
              <h3 className="ba-title">After</h3>
              <p className="ba-text">
                • Instant AI-powered explanations  
                • Clear bottleneck detection  
                • Recommended indexes  
                • Query rewrite suggestions  
                • 80% of slow queries fixed in minutes  
              </p>
            </div>

          </div>
        </div>

        {/* WHY DBPOWERAI */}
        <div className="section">
          <h2 className="section-title">Why Developers Choose DBPowerAI</h2>

          <div className="why-grid">
            <div className="why-item">
              <div className="why-num">3s</div>
              <div className="why-label">Analysis Time</div>
            </div>
            <div className="why-item">
              <div className="why-num">80%</div>
              <div className="why-label">Bottlenecks Detected</div>
            </div>
            <div className="why-item">
              <div className="why-num">10x</div>
              <div className="why-label">Faster Optimization</div>
            </div>
          </div>
        </div>
        {/* EXPERIENCE SECTION */}
        <div className="section">
          <h2 className="section-title">Built From Real Experience</h2>
        
          <div style={{
            background: '#0a0c0e',
            border: '1px solid #1f2327',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '850px',
            margin: '0 auto',
            lineHeight: '1.8'
          }}>
            <p style={{ fontSize: '16px', color: '#e5e5e5', marginBottom: '20px' }}>
              DBPowerAI is designed by <strong style={{ color: '#00ffa3' }}>Mirko Siddi</strong>, 
              a software engineer and former systems & database specialist with
              over <strong style={{ color: '#00ffa3' }}>20 years</strong> of experience managing 
              enterprise infrastructure, SQL performance, datacenters and mission-critical systems.
            </p>
        
            <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '20px' }}>
              After spending years analyzing slow queries manually, reading complex EXPLAIN plans 
              and fixing production issues under pressure, the vision behind DBPowerAI became clear:
            </p>
        
            <blockquote style={{
              margin: '20px 0',
              padding: '20px',
              borderLeft: '3px solid #00ffa3',
              background: 'rgba(0,255,163,0.06)',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#e5e5e5'
            }}>
              “Every developer should have access to a senior-level SQL advisor — instantly, 
              24/7, without needing to become a DBA.”
            </blockquote>
        
            <p style={{ fontSize: '16px', color: '#9ca3af' }}>
              The mission is simple:  
              help developers ship faster, avoid performance disasters, and optimize SQL 
              with confidence — even without deep database expertise.
            </p>
          </div>
        </div>

      </div>
    </>
  );
}

export default FeaturesPage;
