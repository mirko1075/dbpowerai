import { Helmet } from 'react-helmet-async';

export default function PostgresSlowQueriesPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>PostgreSQL Slow Queries | DBPowerAI</title>
        <meta
          name="description"
          content="Discover and analyze slow PostgreSQL queries using pg_stat_statements and EXPLAIN ANALYZE. Learn how to optimize queries and improve database performance."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/postgres-slow-queries"
        />
        <meta property="og:title" content="PostgreSQL Slow Queries | DBPowerAI" />
        <meta
          property="og:description"
          content="Understand PostgreSQL slow query metrics, analyze performance bottlenecks, and optimize SQL using pg_stat_statements."
        />
        <meta
          property="og:image"
          content="https://onfhmkhhjnouspczrwcr.supabase.co/storage/v1/object/public/og-images/dbpowerai/postgres-slow-queries.png"
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
          PostgreSQL Slow Queries
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 28 }}>
          PostgreSQL stores aggregated performance data inside
          <code> pg_stat_statements </code>, making it easier to discover
          high-cost queries and understand slow performance patterns.
        </p>

        <h2 style={{ fontSize: 26, marginBottom: 12 }}>
          Key metrics to watch
        </h2>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li><strong>mean_exec_time</strong> – average execution time</li>
          <li><strong>max_exec_time</strong> – worst-case spike</li>
          <li><strong>calls</strong> – workload frequency</li>
          <li><strong>rows</strong> – rows processed</li>
          <li><strong>shared_blks_hit vs read</strong> – buffer efficiency</li>
        </ul>

        <h2
          style={{
            fontSize: 26,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Example query
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
{`SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;`}
        </pre>
      </div>
    </main>
  );
}
