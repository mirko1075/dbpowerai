import { Helmet } from "react-helmet-async";

export default function SqlPerformanceExamplesPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>SQL Performance Examples | DBPowerAI</title>
        <meta
          name="description"
          content="Real SQL performance examples for MySQL and PostgreSQL. Learn how slow queries happen, how to optimize them with indexes, rewriting, and EXPLAIN plan analysis."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/sql-performance-examples"
        />
        <meta property="og:title" content="SQL Performance Examples" />
        <meta
          property="og:description"
          content="Real-world SQL performance optimization examples and query rewrites."
        />
      <meta
        property="og:image"
        content="https://onfhmkhhjnouspczrwcr.supabase.co/storage/v1/object/public/og-images/dbpowerai/explain-plan-analyzer.png"
      />
      </Helmet>

      <div style={{ maxWidth: 860, margin: "0 auto", color: "#e5e7eb" }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#22c55e",
            marginBottom: 16,
          }}
        >
          SQL Performance Examples
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#9ca3af",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          Explore concrete examples of SQL performance issues from real
          production scenarios. Each example includes an analysis of the
          bottleneck, a corrected version of the query, and the reasoning behind
          the optimization. These examples apply to both MySQL and PostgreSQL
          and reflect common patterns developers face every day.
        </p>

        {/* TABLE OF CONTENTS */}
        <div
          style={{
            marginBottom: 40,
            padding: 20,
            background: "#0f172a",
            borderRadius: 12,
            border: "1px solid #1e293b",
          }}
        >
          <h2
            style={{
              color: "#22c55e",
              fontSize: 22,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Contents
          </h2>
          <ul style={{ lineHeight: 2, paddingLeft: 20 }}>
            <li><a href="#example1" style={{ color: "#38bdf8" }}>1. Full Table Scan on Text Search</a></li>
            <li><a href="#example2" style={{ color: "#38bdf8" }}>2. Missing JOIN Index</a></li>
            <li><a href="#example3" style={{ color: "#38bdf8" }}>3. Sorting Without Matching Index</a></li>
            <li><a href="#example4" style={{ color: "#38bdf8" }}>4. Heavy Aggregation on Large Datasets</a></li>
            <li><a href="#faq" style={{ color: "#38bdf8" }}>FAQ</a></li>
          </ul>
        </div>

        {/* EXAMPLE 1 */}
        <h2 id="example1" style={{ fontSize: 28, marginBottom: 12, color: "#22c55e" }}>
          1. Full Table Scan on Text Search
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          A classic performance issue occurs when using a leading wildcard in a
          <code>LIKE</code> filter. This prevents index usage.
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
{`SELECT *
FROM products
WHERE name LIKE '%case%';`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 16 }}>
          This forces a <strong>full table scan</strong> on large tables,
          causing latency spikes.
        </p>

        <h3 style={{ fontSize: 22, marginTop: 24, color: "#22c55e" }}>
          Optimization: Full-text index
        </h3>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{`ALTER TABLE products
ADD FULLTEXT(name);`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 16 }}>
          Now the query becomes:
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
{`SELECT *
FROM products
WHERE MATCH(name) AGAINST ('case');`}
        </pre>

        {/* EXAMPLE 2 */}
        <h2 id="example2" style={{ fontSize: 28, marginTop: 50, color: "#22c55e" }}>
          2. Missing JOIN Index
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 12 }}>
          When joining large tables without indexing the foreign key, the
          database performs nested loops or hash joins on millions of rows.
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
{`SELECT u.email, o.id
FROM users u
JOIN orders o ON u.id = o.user_id;`}
        </pre>

        <h3 style={{ fontSize: 22, marginTop: 24, color: "#22c55e" }}>
          Optimization: index the join column
        </h3>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{`CREATE INDEX idx_orders_user_id ON orders(user_id);`}
        </pre>

        {/* EXAMPLE 3 */}
        <h2 id="example3" style={{ fontSize: 28, marginTop: 50, color: "#22c55e" }}>
          3. Sorting Without Matching Index
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 12 }}>
          ORDER BY on large tables is very slow unless supported by an index.
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
{`SELECT *
FROM events
WHERE type = 'LOGIN'
ORDER BY created_at DESC;`}
        </pre>

        <h3 style={{ fontSize: 22, marginTop: 24, color: "#22c55e" }}>
          Optimization: composite index
        </h3>

        <pre
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            padding: 16,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
{`CREATE INDEX idx_events_type_created ON events(type, created_at DESC);`}
        </pre>

        {/* EXAMPLE 4 */}
        <h2 id="example4" style={{ fontSize: 28, marginTop: 50, color: "#22c55e" }}>
          4. Heavy Aggregation on Large Datasets
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 12 }}>
          Aggregations such as COUNT, SUM, and GROUP BY can be extremely slow
          without the proper strategy.
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
{`SELECT country, COUNT(*)
FROM customers
GROUP BY country
ORDER BY COUNT(*) DESC;`}
        </pre>

        <h3 style={{ fontSize: 22, marginTop: 24, color: "#22c55e" }}>
          Optimization: partial indexes or materialized views
        </h3>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          In PostgreSQL:
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
{`CREATE MATERIALIZED VIEW customer_country_stats AS
SELECT country, COUNT(*)
FROM customers
GROUP BY country;`}
        </pre>

        {/* FAQ */}
        <h2 id="faq" style={{ fontSize: 28, marginTop: 60, color: "#22c55e" }}>
          FAQ
        </h2>

        <h3 style={{ color: "#22c55e", fontSize: 20, marginTop: 20 }}>
          Why do slow queries happen?
        </h3>
        <p style={{ color: "#9ca3af" }}>
          Most performance issues come from missing indexes, poor filtering,
          sorting, and incorrect SQL patterns.
        </p>

        <h3 style={{ color: "#22c55e", fontSize: 20, marginTop: 20 }}>
          Can DBPowerAI analyze my queries?
        </h3>
        <p style={{ color: "#9ca3af" }}>
          Yes. DBPowerAI automatically parses EXPLAIN plans and suggests
          optimizations. Try it in the{" "}
          <a href="/app" style={{ color: "#38bdf8" }}>
            Analyzer
          </a>
          .
        </p>

        <h3 style={{ color: "#22c55e", fontSize: 20, marginTop: 20 }}>
          Where can I learn optimization basics?
        </h3>
        <p style={{ color: "#9ca3af" }}>
          Visit:{" "}
          <a href="/sql-query-optimization" style={{ color: "#38bdf8" }}>
            SQL Query Optimization
          </a>{" "}
          or{" "}
          <a href="/slow-query-analyzer" style={{ color: "#38bdf8" }}>
            Slow Query Analyzer
          </a>
          .
        </p>
      </div>
    </main>
  );
}
