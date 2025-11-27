import { Helmet } from 'react-helmet-async';

export default function ExplainPlanAnalyzerPage() {
  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "80px 16px",
      }}
    >
      <Helmet>
        <title>EXPLAIN Plan Analyzer | DBPowerAI</title>
        <meta
          name="description"
          content="Learn how to read and optimize MySQL and PostgreSQL EXPLAIN and EXPLAIN ANALYZE plans. Understand costs, node types, Seq Scans, Index Scans, JOIN strategies, and performance bottlenecks."
        />
        <link
          rel="canonical"
          href="https://www.dbpowerai.com/explain-plan-analyzer"
        />
        <meta property="og:title" content="EXPLAIN Plan Analyzer | DBPowerAI" />
        <meta
          property="og:description"
          content="Analyze complex execution plans with a clear and human-readable breakdown. Improve query performance by understanding costs and node types."
        />
        <meta
          property="og:image"
          content="https://www.dbpowerai.com/og/explain-plan-analyzer.png"
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
          EXPLAIN Plan Analyzer
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 28 }}>
          Understanding execution plans is the key to optimizing SQL queries.
          DBPowerAI transforms complex EXPLAIN output into human-readable insights,
          highlighting bottlenecks, unnecessary scans, inefficient JOINs, and costly operations.
        </p>

        {/* WHAT WE DETECT */}
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>What we detect</h2>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li><strong>Full table scans</strong> (Seq Scan / type = ALL)</li>
          <li><strong>Index usage or missing indexes</strong></li>
          <li><strong>Inefficient JOIN strategies</strong> (Nested Loop, Hash Join)</li>
          <li><strong>Sorting operations</strong> that spill to disk</li>
          <li><strong>Filtering inefficiencies</strong> (poor selectivity)</li>
          <li><strong>Functions preventing index use</strong></li>
          <li><strong>Row estimate mismatches</strong> (cardinality misestimation)</li>
          <li><strong>Repeated node re-scans</strong></li>
        </ul>

        {/* MYSQL EXAMPLE */}
        <h2
          style={{
            fontSize: 26,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Example: MySQL EXPLAIN
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
{`id | select_type | table  | type | possible_keys       | key  | rows  | Extra
1  | SIMPLE      | orders | ALL  | idx_status, idx_date | NULL | 12000 | Using where; Using filesort`}
        </pre>

        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          This EXPLAIN shows:
        </p>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li><strong>type = ALL</strong> → full table scan</li>
          <li><strong>key = NULL</strong> → no index selected</li>
          <li><strong>Using filesort</strong> → slow ORDER BY using disk</li>
        </ul>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          A composite index like:
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
{`CREATE INDEX idx_orders_status_date
ON orders(status, created_at DESC);`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          Fixes both the scan and the sorting.
        </p>

        {/* POSTGRES EXAMPLE */}
        <h2
          style={{
            fontSize: 26,
            marginTop: 40,
            marginBottom: 12,
          }}
        >
          Example: PostgreSQL EXPLAIN ANALYZE
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
{`Seq Scan on orders  (cost=0.00..431.00 rows=12000 width=80)
  Filter: (status = 'PAID')
Execution time: 82.5 ms`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          PostgreSQL shows:
        </p>

        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "#9ca3af" }}>
          <li><strong>Seq Scan</strong> → sequential full scan</li>
          <li><strong>cost=0..431</strong> → estimated work to process</li>
          <li><strong>rows=12000</strong> → rows Postgres expects to scan</li>
          <li><strong>Execution time</strong> → actual time (important!)</li>
        </ul>

        <h3 style={{ color: "#22c55e", fontSize: 22, marginTop: 32 }}>
          Why Seq Scan is bad here
        </h3>

        <p style={{ color: "#9ca3af", marginBottom: 12 }}>
          Because <strong>status</strong> is selective and should be indexed.
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
{`CREATE INDEX idx_orders_status ON orders(status);`}
        </pre>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          After indexing, PostgreSQL will switch from <strong>Seq Scan</strong> to
          <strong> Index Scan</strong>, reducing execution time dramatically.
        </p>

        {/* JOIN STRATEGIES */}
        <h2
          style={{
            fontSize: 26,
            marginTop: 45,
            marginBottom: 12,
          }}
        >
          JOIN Strategies Explained
        </h2>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li><strong>Nested Loop</strong> – great with small inner tables + index</li>
          <li><strong>Hash Join</strong> – excellent for large sets, but uses memory</li>
          <li><strong>Merge Join</strong> – needs sorted inputs, but is very fast</li>
        </ul>

        <p style={{ color: "#9ca3af", marginTop: 12 }}>
          DBPowerAI detects when a JOIN strategy is suboptimal and suggests a better one.
        </p>

        {/* TAKEAWAYS */}
        <h2
          style={{
            fontSize: 26,
            marginTop: 45,
            marginBottom: 12,
          }}
        >
          Key Takeaways
        </h2>

        <ul style={{ paddingLeft: 20, color: "#9ca3af", lineHeight: 1.8 }}>
          <li>EXPLAIN shows what the database <strong>plans</strong> to do.</li>
          <li>EXPLAIN ANALYZE shows what it <strong>actually</strong> does.</li>
          <li>Full scans, missing indexes, and bad JOINs are the main issues.</li>
          <li>Composite indexes solve most performance bottlenecks.</li>
          <li>Cardinality estimation affects plan choice—DBPowerAI checks mismatches.</li>
        </ul>
      </div>
    </main>
  );
}
