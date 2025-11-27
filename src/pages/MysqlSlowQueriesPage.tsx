import { Helmet } from 'react-helmet-async';

export default function MysqlSlowQueriesPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>MySQL Slow Queries | DBPowerAI</title>
        <meta
          name="description"
          content="Understand and fix slow MySQL queries using the slow query log, indexing strategies, and EXPLAIN plan analysis. Identify full scans, implicit conversions, and inefficient joins."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/mysql-slow-queries"
        />
        <meta property="og:title" content="MySQL Slow Queries | DBPowerAI" />
        <meta
          property="og:description"
          content="Analyze MySQL slow queries, discover performance bottlenecks, and improve database performance using DBPowerAI."
        />
        <meta
          property="og:image"
          content="https://onfhmkhhjnouspczrwcr.supabase.co/storage/v1/object/public/og-images/dbpowerai/mysql-slow-queries.png"
        />

      </Helmet>

      <div style={{ maxWidth: 860, margin: "0 auto", color: "#e5e7eb" }}>
        <h1
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "#22c55e",
            marginBottom: 16,
          }}
        >
          MySQL Slow Queries
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 28 }}>
          MySQL slow queries often come from missing indexes, implicit
          conversions, wildcard searches, or table scans. Understanding these
          patterns is the first step in improving performance.
        </p>

        <h2 style={{ fontSize: 26, marginBottom: 12 }}>
          Common slow patterns
        </h2>
        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li>Using <code>LIKE '%text%'</code></li>
          <li>Functions like <code>DATE()</code> on indexed columns</li>
          <li><code>ORDER BY</code> without supporting index</li>
          <li>JOINs without indexing foreign keys</li>
        </ul>

        <h2
          style={{
            fontSize: 26,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Example from mysql.slow_log
        </h2>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{`SELECT *
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 16 }}>
          DBPowerAI parses this automatically and attaches EXPLAIN insights to
          every slow query entry.
        </p>
      </div>
    </main>
  );
}
