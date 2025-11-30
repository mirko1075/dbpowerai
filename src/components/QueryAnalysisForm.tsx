import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Check, Download, Mail } from 'lucide-react';
import AnalysisScoreCard from './AnalysisScoreCard';
import { getOrCreateFreeToken, isFreeTokenUsed, markFreeTokenAsUsed } from '../lib/freeToken';
import { trackEvent } from '../lib/tracking';

interface DetectedPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

interface OptimizationResult {
  id?: string;
  analysis: string;
  warnings: string[];
  rewrittenQuery: string;
  recommendedIndexes: string;
  notes: string;
  detectedPatterns?: DetectedPattern[];
  bottleneck?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  score?: number;
  speedupEstimate?: number;
}

interface QueryAnalysisFormProps {
  mode: 'free-trial' | 'authenticated';
  onFreeTrialExpired?: () => void;
}

function QueryAnalysisForm({ mode, onFreeTrialExpired }: QueryAnalysisFormProps) {
  const [database, setDatabase] = useState('MySQL');
  const [sqlQuery, setSqlQuery] = useState('');
  const [schema, setSchema] = useState('');
  const [executionPlan, setExecutionPlan] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errors, setErrors] = useState({ database: '', sqlQuery: '', api: '' });

  const handleOptimize = useCallback(async () => {
    let hasErrors = false;
    const newErrors = { database: '', sqlQuery: '', api: '' };

    if (!database) {
      newErrors.database = 'Please select a database engine';
      hasErrors = true;
    }

    if (!sqlQuery.trim()) {
      newErrors.sqlQuery = 'Please enter a SQL query';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    // Free trial check
    if (mode === 'free-trial' && isFreeTokenUsed()) {
      if (onFreeTrialExpired) {
        onFreeTrialExpired();
      }
      return;
    }

    setErrors({ database: '', sqlQuery: '', api: '' });
    setResult(null);
    setLoading(true);

    trackEvent('analysis_executed', {
      logged_in: mode === 'authenticated',
      sql_length: sqlQuery.length,
      db_type: database
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (mode === 'authenticated') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setErrors({ database: '', sqlQuery: '', api: 'You must be logged in to optimize queries' });
          setLoading(false);
          return;
        }
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        const freeToken = getOrCreateFreeToken();
        headers['X-Free-Analysis-Token'] = freeToken;
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: sqlQuery,
          db: database,
          schema: schema.trim() || undefined,
          explain: executionPlan.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (mode === 'free-trial' && (data.error === 'free_limit_reached' || data.error === 'no_free_token')) {
          markFreeTokenAsUsed();
          if (onFreeTrialExpired) {
            onFreeTrialExpired();
          }
          return;
        }
        setErrors({ database: '', sqlQuery: '', api: data.error || 'Unable to optimize query. Please check your SQL and try again.' });
        setLoading(false);
        return;
      }

      if (mode === 'free-trial') {
        markFreeTokenAsUsed();
      }

      // Handle both response formats: { success: true, data: {...} } or direct object
      const payload = data.success ? data.data : data;

      const normalized = {
        ...payload,
        recommendedIndexes: payload.recommendedIndexes ?? payload.suggestedIndex ?? payload.suggested_indexes ?? null,
        detectedPatterns: payload.detectedPatterns ?? payload.issues ?? [],
        warnings: payload.warnings ?? (Array.isArray(payload.issues) ? payload.issues : []),
        speedupEstimate: payload.speedupEstimate ?? payload.estimated_speedup ?? payload.speedup_estimate ?? 0,
      } as OptimizationResult;

      setResult(normalized);
      setLoading(false);

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error optimizing query:', error);
      setErrors({ database: '', sqlQuery: '', api: 'Unable to optimize query. Please check your SQL and try again.' });
      setLoading(false);
    }
  }, [database, sqlQuery, schema, executionPlan, mode, onFreeTrialExpired]);

  const copyText = useCallback(async (text: string, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const downloadReport = useCallback((filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const emailReport = useCallback((subject: string, body: string) => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }, []);

  const rewritten = result?.rewrittenQuery ?? '';
  const indexes = result?.recommendedIndexes ?? [];
  const analysis = result?.analysis ?? '';
  const notes = result?.notes ?? '';
  const warnings = (result?.warnings ?? []).join('\n');
  const patterns = (result?.detectedPatterns ?? [])
    .map(p => `${p.type}: ${p.message}`)
    .join('\n');

  // Parse indexes to get count and formatted display
  const parseIndexes = (indexesString: string) => {
    if (Array.isArray(indexesString)) {
      return {
        count: indexesString.length,
        formatted: indexesString.join('\n\n')
      };
    }
    return {
      count: 0, formatted: 'No index to apply'
    }
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(indexesString);
      if (Array.isArray(parsed)) {
        return {
          count: parsed.length,
          formatted: parsed.join('\n\n')
        };
      }
    } catch {
      // Not JSON, check if it's a multi-line string with CREATE INDEX statements
      const lines = indexesString.split('\n').filter(line => line.trim());
      const createIndexLines = lines.filter(line =>
        line.trim().toUpperCase().startsWith('CREATE INDEX') ||
        line.trim().toUpperCase().startsWith('CREATE UNIQUE INDEX')
      );

      if (createIndexLines.length > 0) {
        return {
          count: createIndexLines.length,
          formatted: indexesString
        };
      }
    }

    // Default: count by semicolons or newlines containing CREATE INDEX
    const indexStatements = indexesString.split(';').filter(stmt =>
      stmt.trim() && stmt.toUpperCase().includes('CREATE INDEX')
    );

    return {
      count: Math.max(indexStatements.length, 1),
      formatted: indexesString
    };
  };

  const { count: indexCount, formatted: formattedIndexes } = parseIndexes(indexes);

  const fullReport = `SQL QUERY ADVISOR REPORT
========================

Rewritten Query:
${rewritten}

Recommended Indexes:
${formattedIndexes}

Analysis:
${analysis}

Warnings:
${warnings}

Detected Patterns:
${patterns}

Notes:
${notes}
`;

  return (
    <>
      <style>{`
        .query-analysis-form {
          max-width: 900px;
          margin: 0 auto;
        }

        .input-card {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          transition: all 0.3s ease;
        }

        .input-card:hover {
          border-color: rgba(0, 255, 163, 0.3);
        }

        select, textarea {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        select {
          cursor: pointer;
        }

        textarea {
          font-family: 'Fira Code', 'Courier New', monospace;
          resize: vertical;
        }

        select::placeholder, textarea::placeholder {
          color: #6b7280;
        }

        select:focus, textarea:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        .optimize-button {
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
          width: 100%;
          max-width: 400px;
        }

        .optimize-button:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .optimize-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .optimize-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #0d0f11;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .result-card {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 32px;
          margin-top: 40px;
        }

        .section-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 700;
          color: #00ffa3;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .code-block {
          background: #14161a;
          border: 1px solid #1f2327;
          border-radius: 8px;
          padding: 20px;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #e5e5e5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .modal-info-block {
          background: #14161a;
          border: 1px solid #1f2327;
          border-radius: 8px;
          padding: 20px;
          font-size: 15px;
          line-height: 1.8;
          color: #9ca3af;
        }

        .copy-button {
          background: transparent;
          border: 1px solid #1f2327;
          color: #9ca3af;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .copy-button:hover {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .copy-button.copied {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .error-message {
          color: #ef4444;
          font-size: 13px;
          margin-top: 6px;
        }

        .action-buttons-container {
          display: flex;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #1f2327;
          flex-wrap: wrap;
        }

        .action-button {
          background: #111418;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          flex: 1;
          justify-content: center;
          min-width: 150px;
        }

        .action-button:hover {
          border-color: #00ffa3;
          color: #00ffa3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 163, 0.2);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .toggle-link {
          color: #00ffa3;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
        }

        .toggle-link:hover {
          opacity: 0.8;
        }

        .advanced-fields {
          animation: slideDown 0.3s ease;
          overflow: hidden;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 800px;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .input-card {
            padding: 24px;
          }

          .result-card {
            padding: 24px;
          }

          .optimize-button {
            max-width: 100%;
          }

          .action-buttons-container {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="query-analysis-form">
        <div className="input-card">
          <div style={{ marginBottom: '28px' }}>
            <label
              htmlFor="database"
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '14px',
                color: '#e5e5e5',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Database Engine *
            </label>
            <select
              id="database"
              value={database}
              onChange={(e) => {
                setDatabase(e.target.value);
                setErrors(prev => ({ ...prev, database: '' }));
              }}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: '8px',
                border: errors.database ? '1px solid #ef4444' : '1px solid #1f2327'
              }}
            >
              <option value="">Select a database</option>
              <option value="MySQL">MySQL</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="Oracle">Oracle</option>
              <option value="SQL Server">SQL Server</option>
              <option value="MariaDB">MariaDB</option>
            </select>
            {errors.database && (
              <div className="error-message">{errors.database}</div>
            )}
          </div>

          <div>
            <label
              htmlFor="sqlQuery"
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '14px',
                color: '#e5e5e5',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              SQL Query *
            </label>
            <textarea
              id="sqlQuery"
              value={sqlQuery}
              onChange={(e) => {
                setSqlQuery(e.target.value);
                setErrors(prev => ({ ...prev, sqlQuery: '' }));
              }}
              placeholder="Paste your SQL query here…"
              rows={10}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '14px',
                borderRadius: '8px',
                minHeight: '220px',
                lineHeight: '1.6',
                border: errors.sqlQuery ? '1px solid #ef4444' : '1px solid #1f2327'
              }}
            />
            {errors.sqlQuery && (
              <div className="error-message">{errors.sqlQuery}</div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <span
              className="toggle-link"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Add Schema / Execution Plan (optional)
            </span>
          </div>

          {showAdvanced && (
            <div className="advanced-fields" style={{
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div>
                <label
                  htmlFor="schema"
                  style={{
                    display: 'block',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#e5e5e5',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Table Schema (optional)
                </label>
                <textarea
                  id="schema"
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  placeholder="CREATE TABLE users (&#10;  id INT PRIMARY KEY,&#10;  email VARCHAR(255),&#10;  created_at TIMESTAMP&#10;);"
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    minHeight: '140px',
                    lineHeight: '1.6',
                    border: '1px solid #1f2327'
                  }}
                />
                <div style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginTop: '6px'
                }}>
                  Provide your table schema for better analysis
                </div>
              </div>

              <div>
                <label
                  htmlFor="executionPlan"
                  style={{
                    display: 'block',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#e5e5e5',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  EXPLAIN Output (optional)
                </label>
                <textarea
                  id="executionPlan"
                  value={executionPlan}
                  onChange={(e) => setExecutionPlan(e.target.value)}
                  placeholder="Paste your EXPLAIN or EXPLAIN ANALYZE output here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    minHeight: '140px',
                    lineHeight: '1.6',
                    border: '1px solid #1f2327'
                  }}
                />
                <div style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginTop: '6px'
                }}>
                  Include EXPLAIN output for detailed performance insights
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '32px'
        }}>
          <button
            className="optimize-button"
            onClick={handleOptimize}
            disabled={loading}
          >
            {loading && <span className="loading-spinner" />}
            {loading ? 'Analyzing...' : 'Analyze Query'}
          </button>
          {errors.api && (
            <div className="error-message" style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span>{errors.api}</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="result-card">
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#9ca3af'
            }}>
              <div className="loading-spinner" style={{
                width: '40px',
                height: '40px',
                borderWidth: '3px',
                margin: '0 auto 20px',
                borderColor: '#00ffa3',
                borderTopColor: 'transparent'
              }} />
              <p style={{ fontSize: '16px' }}>Analyzing your query...</p>
            </div>
          </div>
        )}

        {!loading && result && (
          <div id="results-section" className="result-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px',
              flexWrap: 'wrap'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
              }}>
                Query Analysis Results
              </h2>
              <span style={{
                fontSize: '13px',
                color: '#00ffa3',
                background: 'rgba(0, 255, 163, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(0, 255, 163, 0.3)'
              }}>
                Query saved to your history
              </span>
            </div>

            {/* Score Card */}
            {result.score !== undefined && result.severity && result.speedupEstimate !== undefined && (
              <AnalysisScoreCard
                score={result.score}
                severity={result.severity}
                speedupEstimate={result.speedupEstimate}
                indexCount={indexCount}
              />
            )}

            {/* Original Query */}
            <div style={{ marginBottom: '32px' }}>
              <div className="section-label">
                <span>Original Query</span>
                <button
                  className={`copy-button ${copiedField === 'raw_query' ? 'copied' : ''}`}
                  onClick={() => copyText(sqlQuery, 'raw_query')}
                >
                  {copiedField === 'raw_query' ? (
                    <>
                      <Check size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="code-block">{sqlQuery}</div>
            </div>

            {/* Optimized Query */}
            {result.rewrittenQuery && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Optimized Query</span>
                  <button
                    className={`copy-button ${copiedField === 'optimized_query' ? 'copied' : ''}`}
                    onClick={() => copyText(result.rewrittenQuery, 'optimized_query')}
                  >
                    {copiedField === 'optimized_query' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="code-block" style={{ color: '#00ffa3' }}>
                  {result.rewrittenQuery}
                </div>
              </div>
            )}

            {/* Suggested Indexes */}
            {result.recommendedIndexes && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Suggested Indexes</span>
                  <button
                    className={`copy-button ${copiedField === 'suggested_indexes' ? 'copied' : ''}`}
                    onClick={() => copyText(formattedIndexes, 'suggested_indexes')}
                  >
                    {copiedField === 'suggested_indexes' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
                  {formattedIndexes}
                </div>
              </div>
            )}

            {/* Bottleneck Analysis */}
            {result.bottleneck && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Bottleneck Analysis</span>
                  <button
                    className={`copy-button ${copiedField === 'bottleneck' ? 'copied' : ''}`}
                    onClick={() => copyText(result.bottleneck || '', 'bottleneck')}
                  >
                    {copiedField === 'bottleneck' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="modal-info-block">
                  {result.bottleneck}
                </div>
              </div>
            )}

            {/* Notes */}
            {result.notes && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Notes</span>
                  <button
                    className={`copy-button ${copiedField === 'notes' ? 'copied' : ''}`}
                    onClick={() => copyText(result.notes, 'notes')}
                  >
                    {copiedField === 'notes' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="modal-info-block">
                  {result.notes}
                </div>
              </div>
            )}

            {/* Table Schema */}
            {schema && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Table Schema</span>
                  <button
                    className={`copy-button ${copiedField === 'schema' ? 'copied' : ''}`}
                    onClick={() => copyText(schema, 'schema')}
                  >
                    {copiedField === 'schema' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="code-block" style={{ fontSize: '13px', color: '#9ca3af' }}>
                  {schema}
                </div>
              </div>
            )}

            {/* Execution Plan */}
            {executionPlan && (
              <div style={{ marginBottom: '32px' }}>
                <div className="section-label">
                  <span>Execution Plan</span>
                  <button
                    className={`copy-button ${copiedField === 'execution_plan' ? 'copied' : ''}`}
                    onClick={() => copyText(executionPlan, 'execution_plan')}
                  >
                    {copiedField === 'execution_plan' ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="code-block" style={{ fontSize: '13px', color: '#9ca3af' }}>
                  {executionPlan}
                </div>
              </div>
            )}

            <div className="action-buttons-container">
              <button
                className="action-button"
                onClick={() => downloadReport('query_report.txt', fullReport)}
              >
                <Download size={18} />
                Download Report
              </button>

              <button
                className="action-button"
                onClick={() => emailReport('SQL Query Advisor Report', fullReport)}
              >
                <Mail size={18} />
                Share via Email
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default QueryAnalysisForm;
