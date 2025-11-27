import { Helmet } from 'react-helmet-async';

export default function SqlQueryOptimizationPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>SQL Query Optimization | DBPowerAI</title>
        <meta
          name="description"
          content="Learn SQL query optimization techniques for MySQL and PostgreSQL: indexing strategies, query rewrites, and execution plan analysis."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/sql-query-optimization"
        />
        <meta property="og:title" content="SQL Query Optimization | DBPowerAI" />
        <meta
          property="og:description"
          content="Real-world tips to optimize SQL queries and improve database performance."
        />
        <meta
          property="og:image"
          content="https://onfhmkhhjnouspczrwcr.supabase.co/storage/v1/object/public/og-images/dbpowerai/sql_query_optimization.png"
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
          SQL Query Optimization
        </h1>

        <p style={{ fontSize: 18, color: "#9ca3af", marginBottom: 28 }}>
          Learn how to improve SQL performance with indexing, rewrites, and
          execution plan analysis.
        </p>

        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
          Core principles of optimization
        </h2>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li>Index the columns used in JOINs, WHERE clauses, and ORDER BY.</li>
          <li>Avoid functions on indexed columns.</li>
          <li>Prefer selective filters early in the query.</li>
          <li>Use proper cardinality and statistics.</li>
        </ul>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Example: Bad → Good
        </h2>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
            marginBottom: 20,
          }}
        >
{`SELECT *
FROM orders
WHERE status = 'PAID'
ORDER BY created_at DESC;`}
        </pre>

        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          On large tables this results in a full scan + sort. A composite index
          fixes the performance:
        </p>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{`CREATE INDEX idx_orders_status_created
ON orders(status, created_at DESC);`}
        </pre>
      </div>
    </main>
  );
}
