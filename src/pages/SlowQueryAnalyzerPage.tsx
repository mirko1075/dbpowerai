import { Helmet } from 'react-helmet-async';

export default function SlowQueryAnalyzerPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>Slow Query Analyzer | DBPowerAI</title>
        <meta
          name="description"
          content="Identify, explain, and fix slow SQL queries in seconds. DBPowerAI reads EXPLAIN plans and highlights performance bottlenecks automatically."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/slow-query-analyzer"
        />
        <meta property="og:title" content="Slow Query Analyzer | DBPowerAI" />
        <meta
          property="og:description"
          content="Analyze slow queries and understand EXPLAIN plans for MySQL and PostgreSQL."
        />
        <meta
          property="og:image"
          content="https://onfhmkhhjnouspczrwcr.supabase.co/storage/v1/object/public/og-images/dbpowerai/slow-query-analyzer.png"
        />

      </Helmet>

      <div style={{ maxWidth: 860, margin: "0 auto", color: "#e5e7eb" }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#22c55e",
            marginBottom: 12,
          }}
        >
          Slow Query Analyzer
        </h1>

        <p style={{ fontSize: 18, color: "#9ca3af", marginBottom: 28 }}>
          Identify, explain, and fix slow SQL queries in seconds.
          DBPowerAI reads EXPLAIN plans and highlights performance bottlenecks
          automatically.
        </p>

        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
          What is a slow query?
        </h2>
        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          A SQL query is considered slow when it consumes excessive time or
          resources. Common causes include full table scans, missing indexes,
          inefficient joins, and poor filtering.
        </p>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Typical slow query example
        </h2>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
{`SELECT *
FROM orders
WHERE product LIKE '%iphone%'
AND status = 'PAID';`}
        </pre>

        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          This creates a full table scan, since the leading wildcard prevents
          index usage.
        </p>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          How DBPowerAI helps
        </h2>

        <ul style={{ color: "#9ca3af", paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Detects missing indexes.</li>
          <li>Analyzes EXPLAIN / EXPLAIN ANALYZE output.</li>
          <li>Highlights heavy operators (Seq Scan, Hash Join, Sort).</li>
          <li>Provides AI-generated optimization suggestions.</li>
        </ul>
      </div>
    </main>
  );
}
