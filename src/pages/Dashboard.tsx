import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UsageSummary from '../components/UsageSummary';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';
import { trackEvent } from '../utils/analytics';
import {
  X,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  Database,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Download,
  Mail,
  XCircle,
  FileText,
  TrendingUp
} from 'lucide-react';

interface DetectedPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

interface Query {
  id: string;
  user_id: string;
  raw_query: string;
  optimized_query: string | null;
  suggested_indexes: string | null;
  bottleneck: string | null;
  db_type: string;
  notes: string | null;
  analysis: string | null;
  warnings: string | null;
  detected_patterns: string | null;
  schema: string | null;
  execution_plan: string | null;
  created_at: string;
}

interface UserPlan {
  plan: 'free' | 'web' | 'api' | 'early_adopter';
  analysis_used: number;
  analysis_limit: number;
  token_used: number;
  token_limit: number;
  early_expires_at?: string | null;
}

interface QueryHistory {
  id: string;
  input_query: string;
  analysis_result: any;
  created_at: string;
}

type SortField = 'created_at' | 'db_type' | 'query_length' | 'bottleneck' | 'severity' | 'improvement';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | '7days' | '30days';

function Dashboard() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [copiedIndexesId, setCopiedIndexesId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dbFilter, setDbFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<QueryHistory | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [checklistState, setChecklistState] = useState({
    runAnalysis: false,
    viewSummary: false,
    viewLimits: false,
    viewHistory: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchQueries();
    checkWelcomeModal();
    loadChecklistState();

    trackEvent('dashboard_open', {
      total_queries_analyzed: queries.length,
      subscription_plan: 'free'
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchQueries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = setInterval(() => {
      fetchQueries();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, []);

  const loadChecklistState = () => {
    setChecklistState({
      runAnalysis: localStorage.getItem('onboarding_run_analysis') === 'true',
      viewSummary: localStorage.getItem('onboarding_view_summary') === 'true',
      viewLimits: localStorage.getItem('onboarding_view_limits') === 'true',
      viewHistory: localStorage.getItem('onboarding_view_history') === 'true',
    });
  };

  const completeChecklistItem = (item: keyof typeof checklistState) => {
    const storageKeys = {
      runAnalysis: 'onboarding_run_analysis',
      viewSummary: 'onboarding_view_summary',
      viewLimits: 'onboarding_view_limits',
      viewHistory: 'onboarding_view_history',
    };

    localStorage.setItem(storageKeys[item], 'true');
    setChecklistState(prev => ({ ...prev, [item]: true }));
  };

  const checkWelcomeModal = () => {
    const welcomeShown = localStorage.getItem('welcome_shown');
    if (!welcomeShown) {
      setShowWelcomeModal(true);
    }
  };

  const handleCloseWelcome = () => {
    localStorage.setItem('welcome_shown', 'true');
    setShowWelcomeModal(false);
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [queries, searchTerm, dbFilter, dateFilter, sortField, sortDirection]);

  useEffect(() => {
    if (selectedQuery || deleteConfirm || showWelcomeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedQuery, deleteConfirm, showWelcomeModal]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();

      // ProtectedRoute already ensures user is authenticated
      if (!session) {
        console.log('❌ Dashboard: No session found (should not happen due to ProtectedRoute)');
        navigate('/login');
        return;
      }

      logEvent('visit_dashboard');

      const { data, error: fetchError } = await supabase
        .from('queries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Failed to load queries');
        console.error('Error fetching queries:', fetchError);
      } else {
        setQueries(data || []);
        if (data && data.length > 0) {
          completeChecklistItem('runAnalysis');
        }
      }

      const { data: planData, error: planError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!planError && planData) {
        setUserPlan(planData);
      }

      const { data: historyData, error: historyError } = await supabase
        .from('query_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!historyError && historyData) {
        setQueryHistory(historyData);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...queries];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.raw_query.toLowerCase().includes(search) ||
        q.optimized_query?.toLowerCase().includes(search) ||
        q.bottleneck?.toLowerCase().includes(search)
      );
    }

    if (dbFilter !== 'all') {
      filtered = filtered.filter(q => q.db_type === dbFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === '7days') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === '30days') {
        filterDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter(q => new Date(q.created_at) >= filterDate);
    }

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'db_type':
          aValue = a.db_type.toLowerCase();
          bValue = b.db_type.toLowerCase();
          break;
        case 'query_length':
          aValue = a.raw_query.length;
          bValue = b.raw_query.length;
          break;
        case 'bottleneck':
          aValue = (a.bottleneck || '').toLowerCase();
          bValue = (b.bottleneck || '').toLowerCase();
          break;
        case 'severity':
          {
            const aPatt = getDetectedPatterns(a);
            const bPatt = getDetectedPatterns(b);
            const aSev = calculateSeverity(aPatt);
            const bSev = calculateSeverity(bPatt);
            const sevOrder = { high: 3, medium: 2, low: 1 };
            aValue = sevOrder[aSev];
            bValue = sevOrder[bSev];
          }
          break;
        case 'improvement':
          {
            const aPatt = getDetectedPatterns(a);
            const bPatt = getDetectedPatterns(b);
            aValue = calculateImprovement(aPatt);
            bValue = calculateImprovement(bPatt);
          }
          break;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredQueries(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getDbBadgeColor = (db: string) => {
    const colors: Record<string, string> = {
      'MySQL': '#00758F',
      'PostgreSQL': '#336791',
      'Oracle': '#F80000',
      'SQL Server': '#CC2927',
      'MariaDB': '#003545',
    };
    return colors[db] || '#00ffa3';
  };

  const truncate = (s: string, maxLength: number = 80) => {
    if (!s) return '';
    return s.length > maxLength ? s.slice(0, maxLength) + '...' : s;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleRerun = async (query: Query) => {
    setRerunLoading(true);
    setError('');
    setSuccessMessage('');

    trackEvent('re_run_query', {
      query_id: query.id,
      previous_score: 0,
      previous_severity: query.detected_patterns ? JSON.parse(query.detected_patterns)[0]?.severity : 'low'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.raw_query,
          db: query.db_type,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to re-run optimization');
      }

      setSuccessMessage('Query re-optimized successfully!');
      await fetchQueries();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to re-run optimization');
    } finally {
      setRerunLoading(false);
    }
  };

  const handleDelete = async (queryId: string) => {
    const queryToDelete = queries.find(q => q.id === queryId);

    try {
      const { error: deleteError } = await supabase
        .from('queries')
        .delete()
        .eq('id', queryId);

      if (deleteError) throw deleteError;

      trackEvent('delete_result', {
        result_id: queryId,
        severity: queryToDelete?.detected_patterns ? JSON.parse(queryToDelete.detected_patterns)[0]?.severity : 'low'
      });

      setSuccessMessage('Query deleted successfully');
      await fetchQueries();
      setSelectedQuery(null);
      setDeleteConfirm(null);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete query');
    }
  };

  const copyText = async (text: string, field: string, query?: Query) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);

    trackEvent('export_result', {
      action_type: field.includes('index') ? 'copy_indexes' : 'copy_query',
      result_id: query?.id || selectedQuery?.id || 'unknown',
      has_indexes: !!(query?.suggested_indexes || selectedQuery?.suggested_indexes)
    });
  };

  const downloadReport = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    trackEvent('export_result', {
      action_type: 'download',
      result_id: selectedQuery?.id || 'unknown',
      has_indexes: !!selectedQuery?.suggested_indexes
    });
  };

  const emailReport = (subject: string, body: string) => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');

    trackEvent('export_result', {
      action_type: 'email',
      result_id: selectedQuery?.id || 'unknown',
      has_indexes: !!selectedQuery?.suggested_indexes
    });
  };

  const generateFullReport = (query: Query) => {
    const patterns = getDetectedPatterns(query);
    const severity = calculateSeverity(patterns);
    const improvement = calculateImprovement(patterns);

    return `SQL QUERY REPORT
===================

Database: ${query.db_type}
Created: ${formatDate(query.created_at)}
Query ID: ${query.id}
Severity: ${severity.toUpperCase()}
Estimated Improvement: +${improvement}%

Original Query:
${query.raw_query}

Optimized Query:
${query.optimized_query || 'N/A'}

Recommended Indexes:
${query.suggested_indexes || 'N/A'}

Bottleneck Analysis:
${query.bottleneck || 'N/A'}

Detailed Analysis:
${query.analysis || 'N/A'}

Warnings:
${query.warnings ? JSON.parse(query.warnings).join('\n') : 'N/A'}

Detected Patterns:
${patterns.length > 0 ? patterns.map(p => `- ${p.message}`).join('\n') : 'No issues detected'}

Notes:
${query.notes || 'N/A'}

Table Schema:
${query.schema || 'N/A'}

Execution Plan:
${query.execution_plan || 'N/A'}
`;
  };

  const copyQueryText = async (text: string, queryId: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedQueryId(queryId);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const copyIndexesText = async (text: string, queryId: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedIndexesId(queryId);
    setTimeout(() => setCopiedIndexesId(null), 2000);
  };

  const getDetectedPatterns = (query: Query): DetectedPattern[] => {
    if (!query.detected_patterns) return [];
    try {
      return JSON.parse(query.detected_patterns);
    } catch {
      return [];
    }
  };

  const severityScore: Record<string, number> = {
    join_explosion: 100,
    count_star_with_joins: 90,
    missing_distinct: 80,
    non_sargable_like: 70,
    wordpress_meta_query: 100,
    non_sargable_or: 60,
    non_sargable_case_conversion: 50,
    join_chain_without_aggregation: 40,
    missing_group_by: 60,
  };

  const calculateSeverity = (patterns: DetectedPattern[]): 'low' | 'medium' | 'high' => {
    const total = patterns.reduce((sum, p) => sum + (severityScore[p.type] || 0), 0);
    if (total >= 100) return 'high';
    if (total >= 50) return 'medium';
    return 'low';
  };

  const improvementMap: Record<string, number> = {
    join_explosion: 80,
    count_star_with_joins: 70,
    missing_distinct: 25,
    non_sargable_like: 50,
    non_sargable_or: 20,
    non_sargable_case_conversion: 40,
    wordpress_meta_query: 90,
    join_chain_without_aggregation: 10,
    missing_group_by: 20,
  };

  const calculateImprovement = (patterns: DetectedPattern[]): number => {
    let score = patterns.reduce((sum, p) => sum + (improvementMap[p.type] || 0), 0);
    if (score > 95) score = 95;
    return score;
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#fb923c';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getSeverityBgColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'rgba(239, 68, 68, 0.1)';
      case 'medium': return 'rgba(251, 146, 60, 0.1)';
      case 'low': return 'rgba(34, 197, 94, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  };

  const getSeverityBorderColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'rgba(239, 68, 68, 0.3)';
      case 'medium': return 'rgba(251, 146, 60, 0.3)';
      case 'low': return 'rgba(34, 197, 94, 0.3)';
      default: return 'rgba(107, 114, 128, 0.3)';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp size={16} style={{ color: '#00ffa3' }} /> :
      <ChevronDown size={16} style={{ color: '#00ffa3' }} />;
  };

  const dbEngines = ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'MariaDB'];

  return (
    <>
      <style>{`
        body {
          background-color: #0d0f11;
          color: #e5e5e5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          margin: 0;
        }

        .page-fade-in {
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .filter-bar {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .filter-bar {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 16px;
          }
        }

        .input-field, .select-field {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          color: #e5e5e5;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .input-field:focus, .select-field:focus {
          outline: none;
          border-color: #00ffa3;
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.15);
        }

        .table-container {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          overflow: hidden;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th {
          background: #0a0c0e;
          color: #9ca3af;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #1f2327;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }

        .table th:hover {
          background: #111418;
          color: #00ffa3;
        }

        .table th div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .table td {
          padding: 16px;
          border-bottom: 1px solid #1f2327;
          font-size: 14px;
        }

        .table tbody tr {
          transition: all 0.2s ease;
        }

        .table tbody tr:hover {
          background: rgba(0, 255, 163, 0.05);
        }

        .mobile-card {
          background: #111418;
          border: 1px solid #1f2327;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }

        .mobile-card:hover {
          border-color: rgba(0, 255, 163, 0.3);
          box-shadow: 0 0 20px rgba(0, 255, 163, 0.1);
        }

        .db-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #00ffa3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .action-button {
          background: transparent;
          border: 1px solid #1f2327;
          color: #9ca3af;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .action-button:hover {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .action-button.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .action-button {
            flex: 1;
            padding: 12px;
          }
        }

        .skeleton {
          background: linear-gradient(90deg, #111418 25%, #1a1d23 50%, #111418 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 8px;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: overlayFade 0.2s ease-out;
        }

        @keyframes overlayFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: #0d0f11;
          border: 1px solid #1f2327;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          animation: modalEnter 0.25s ease-out;
          position: relative;
        }

        @media (max-width: 768px) {
          .modal-content {
            max-width: 95vw;
            width: 95vw;
            margin: auto;
            border-radius: 12px;
            max-height: 85vh;
          }
        }

        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: #0d0f11;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: #1f2327;
          border-radius: 4px;
        }

        .code-block {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-left: 2px solid rgba(0, 255, 163, 0.5);
          border-radius: 8px;
          padding: 20px;
          padding-left: 16px;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #e5e5e5;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: break-word;
          overflow-x: auto;
          user-select: text;
          cursor: text;
        }

        @media (max-width: 768px) {
          .code-block {
            padding: 12px;
            padding-left: 12px;
            font-size: 13px;
            line-height: 1.4;
          }
        }

        .section-label {
          color: #00ffa3;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .severity-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }

        .index-status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }

        .index-status-yes {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .index-status-no {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .quick-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .quick-action-btn {
          background: transparent;
          border: 1px solid #1f2327;
          color: #9ca3af;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          min-height: 36px;
          min-width: 36px;
        }

        .quick-action-btn:hover:not(:disabled) {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .quick-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .quick-action-btn.success {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        @media (max-width: 768px) {
          .quick-action-btn {
            flex: 1;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
          }
        }

        .improvement-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(0, 255, 163, 0.1);
          border: 1px solid rgba(0, 255, 163, 0.3);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #00ffa3;
        }

        .alert {
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .primary-button {
          background: #00ffa3;
          color: #0d0f11;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
        }

        .primary-button:hover:not(:disabled) {
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
          transform: translateY(-2px);
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-button {
          background: transparent;
          border: 1px solid #1f2327;
          color: #9ca3af;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-button:hover:not(:disabled) {
          border-color: #00ffa3;
          color: #00ffa3;
        }

        .danger-button {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .danger-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        @media (max-width: 768px) {
          .primary-button, .secondary-button, .danger-button {
            width: 100%;
          }
        }

        .empty-state {
          padding: 80px 40px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .empty-state {
            padding: 40px 20px;
          }
        }

        @keyframes spinning {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spinning 1s linear infinite;
        }

        .modal-close-button {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: 1px solid #1f2327;
          color: #9ca3af;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .modal-close-button:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ffffff;
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }

        .modal-header-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (min-width: 640px) {
          .modal-header-info {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
        }

        .modal-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }

        .modal-buttons-container {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .modal-buttons-container {
            flex-direction: column;
            gap: 8px;
          }
        }

        .modal-info-block {
          background: #0a0c0e;
          border: 1px solid #1f2327;
          border-left: 2px solid rgba(0, 255, 163, 0.5);
          border-radius: 8px;
          padding: 20px;
          padding-left: 16px;
          font-size: 15px;
          line-height: 1.8;
          color: #9ca3af;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .modal-info-block {
            padding: 12px;
            padding-left: 12px;
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#0d0f11' }}>

        <div className="page-fade-in" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 16px'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 0 30px rgba(0, 255, 163, 0.3)'
            }}>
              Query Dashboard
            </h1>

            <p style={{
              fontSize: 'clamp(15px, 3vw, 18px)',
              color: '#9ca3af'
            }}>
              View, filter, and manage all your optimized SQL queries
            </p>
          </div>

          {/* Getting Started Checklist */}
          {Object.values(checklistState).some(v => !v) && (
            <div style={{
              background: 'linear-gradient(135deg, #111418 0%, #1a1d24 100%)',
              border: '2px solid #00ffa3',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(0, 255, 163, 0.2)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0,
                }}>
                  Getting Started
                </h3>
                <span style={{
                  fontSize: '13px',
                  color: '#00ffa3',
                  fontWeight: '600',
                }}>
                  {Object.values(checklistState).filter(v => v).length} / 4 steps completed
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: checklistState.runAnalysis ? '#9ca3af' : '#e5e5e5',
                }}>
                  <span style={{
                    fontSize: '18px',
                    color: checklistState.runAnalysis ? '#00ffa3' : '#4b5563',
                  }}>
                    {checklistState.runAnalysis ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: '15px' }}>
                    Run your first analysis
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: checklistState.viewSummary ? '#9ca3af' : '#e5e5e5',
                }}>
                  <span style={{
                    fontSize: '18px',
                    color: checklistState.viewSummary ? '#00ffa3' : '#4b5563',
                  }}>
                    {checklistState.viewSummary ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: '15px' }}>
                    View the optimization summary
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: checklistState.viewLimits ? '#9ca3af' : '#e5e5e5',
                }}>
                  <span style={{
                    fontSize: '18px',
                    color: checklistState.viewLimits ? '#00ffa3' : '#4b5563',
                  }}>
                    {checklistState.viewLimits ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: '15px' }}>
                    Check your plan & limits
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: checklistState.viewHistory ? '#9ca3af' : '#e5e5e5',
                }}>
                  <span style={{
                    fontSize: '18px',
                    color: checklistState.viewHistory ? '#00ffa3' : '#4b5563',
                  }}>
                    {checklistState.viewHistory ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: '15px' }}>
                    Explore your query history
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Usage Metrics Section */}
          {userPlan && (
            <div
              onClick={() => completeChecklistItem('viewLimits')}
              style={{
                background: '#111418',
                border: '1px solid #1f2327',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                cursor: 'pointer'
              }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '20px'
              }}>
                Your Plan: <span style={{ color: '#00ffa3', textTransform: 'capitalize' }}>{userPlan.plan}</span>
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {/* Analyses Usage */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>Analyses</span>
                    <span style={{ fontSize: '14px', color: '#e5e5e5', fontWeight: '700' }}>
                      {userPlan.analysis_used} / {userPlan.analysis_limit}
                    </span>
                  </div>
                  <div style={{
                    background: '#0a0c0e',
                    borderRadius: '8px',
                    height: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: userPlan.analysis_used >= userPlan.analysis_limit ? '#ef4444' :
                                userPlan.analysis_used >= userPlan.analysis_limit - 2 ? '#fb923c' : '#00ffa3',
                      height: '100%',
                      width: `${Math.min(100, (userPlan.analysis_used / userPlan.analysis_limit) * 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Tokens Usage */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>Tokens</span>
                    <span style={{ fontSize: '14px', color: '#e5e5e5', fontWeight: '700' }}>
                      {userPlan.token_used.toLocaleString()} / {userPlan.token_limit.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    background: '#0a0c0e',
                    borderRadius: '8px',
                    height: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: userPlan.token_used >= userPlan.token_limit ? '#ef4444' :
                                userPlan.token_used >= userPlan.token_limit - 5000 ? '#fb923c' : '#00ffa3',
                      height: '100%',
                      width: `${Math.min(100, (userPlan.token_used / userPlan.token_limit) * 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade CTA */}
          {userPlan && (userPlan.analysis_used >= userPlan.analysis_limit - 2 || userPlan.token_used >= userPlan.token_limit - 5000) && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '6px'
                }}>
                  You're close to your monthly limits
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  margin: 0
                }}>
                  Upgrade your plan to continue analyzing queries without interruption
                </p>
              </div>
              <a
                href="/pricing"
                style={{
                  background: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 25px rgba(139, 92, 246, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(139, 92, 246, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(139, 92, 246, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                View Pricing
              </a>
            </div>
          )}

          {/* Query History Section */}
          {queryHistory.length > 0 && (
            <div style={{
              background: '#111418',
              border: '1px solid #1f2327',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                Query History {userPlan?.plan === 'free' && <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>(Last 5)</span>}
              </h2>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {(userPlan?.plan === 'free' ? queryHistory.slice(0, 5) : queryHistory).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#0a0c0e',
                      border: '1px solid #1f2327',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 163, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1f2327';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#e5e5e5',
                        fontFamily: "'Fira Code', monospace",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.input_query}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedHistoryItem(item)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #1f2327',
                        color: '#9ca3af',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#00ffa3';
                        e.currentTarget.style.color = '#00ffa3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#1f2327';
                        e.currentTarget.style.color = '#9ca3af';
                      }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
              {userPlan?.plan === 'free' && queryHistory.length > 5 && (
                <div style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Upgrade to view full history ({queryHistory.length} total queries)
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!loading && queries.length > 0 && (
            <div className="filter-bar">
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Search Query
                </label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by query text..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '44px', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Database Engine
                </label>
                <select
                  className="select-field"
                  value={dbFilter}
                  onChange={(e) => setDbFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Databases</option>
                  {dbEngines.map(db => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Date Range
                </label>
                <select
                  className="select-field"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
            </div>
          )}

          {loading && (
            <div className="table-container">
              <div style={{ padding: '32px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div className="skeleton" style={{ height: '60px', marginBottom: '8px' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && queries.length === 0 && (
            <div className="table-container">
              <div className="empty-state">
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 24px',
                  background: 'rgba(0, 255, 163, 0.1)',
                  border: '2px solid #1f2327',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px'
                }}>
                  <Database size={36} style={{ color: '#00ffa3' }} />
                </div>

                <h2 style={{
                  fontSize: 'clamp(20px, 4vw, 24px)',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  No optimized queries yet
                </h2>

                <p style={{
                  fontSize: '16px',
                  color: '#9ca3af',
                  marginBottom: '32px',
                  maxWidth: '500px',
                  margin: '0 auto 32px'
                }}>
                  Optimize your first query and it will appear here
                </p>

                <a
                  href="/app"
                  className="primary-button"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Optimize your first query →
                </a>
              </div>
            </div>
          )}

          {!loading && queries.length > 0 && filteredQueries.length === 0 && (
            <div className="table-container">
              <div className="empty-state">
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  No queries match your filters
                </h2>

                <p style={{
                  fontSize: '15px',
                  color: '#9ca3af'
                }}>
                  Try adjusting your search or filter criteria
                </p>
              </div>
            </div>
          )}

          {!loading && filteredQueries.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="table-container" style={{ display: 'none' }}>
                <style>{`
                  @media (min-width: 769px) {
                    .table-container {
                      display: block !important;
                    }
                    .mobile-cards-container {
                      display: none !important;
                    }
                  }
                `}</style>
                <table className="table">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th onClick={() => handleSort('db_type')}>
                        <div>
                          Database
                          <SortIcon field="db_type" />
                        </div>
                      </th>
                      <th onClick={() => handleSort('query_length')}>
                        <div>
                          Query
                          <SortIcon field="query_length" />
                        </div>
                      </th>
                      <th onClick={() => handleSort('severity')}>
                        <div>
                          Severity
                          <SortIcon field="severity" />
                        </div>
                      </th>
                      <th onClick={() => handleSort('improvement')}>
                        <div>
                          Improvement
                          <SortIcon field="improvement" />
                        </div>
                      </th>
                      <th>Indexes</th>
                      <th onClick={() => handleSort('created_at')}>
                        <div>
                          Created
                          <SortIcon field="created_at" />
                        </div>
                      </th>
                      <th>Copy</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueries.map((query) => {
                      const patterns = getDetectedPatterns(query);
                      const severity = calculateSeverity(patterns);
                      const improvement = calculateImprovement(patterns);
                      const hasIndexes = query.suggested_indexes && query.suggested_indexes.trim().length > 0;

                      return (
                        <tr key={query.id}>
                          <td>
                            <div
                              className="db-badge"
                              style={{
                                backgroundColor: `${getDbBadgeColor(query.db_type)}15`,
                                borderColor: `${getDbBadgeColor(query.db_type)}40`,
                                color: getDbBadgeColor(query.db_type)
                              }}
                            >
                              <Database size={14} />
                              {query.db_type}
                            </div>
                          </td>
                          <td>
                            <code style={{
                              fontFamily: "'Fira Code', monospace",
                              fontSize: '13px',
                              color: '#e5e5e5'
                            }}>
                              {truncate(query.raw_query, 60)}
                            </code>
                          </td>
                          <td>
                            <span
                              className="severity-badge"
                              style={{
                                backgroundColor: getSeverityBgColor(severity),
                                borderColor: getSeverityBorderColor(severity),
                                color: getSeverityColor(severity)
                              }}
                            >
                              {severity}
                            </span>
                          </td>
                          <td>
                            <span className="improvement-badge">
                              <TrendingUp size={14} />
                              +{improvement}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div
                              className={`index-status-icon ${hasIndexes ? 'index-status-yes' : 'index-status-no'}`}
                              title={hasIndexes ? 'Indexes recommended' : 'No indexes'}
                              aria-label={hasIndexes ? 'Has indexes' : 'No indexes'}
                              style={{ flexShrink: 0 }}
                            >
                              {hasIndexes ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </div>
                          </td>
                          <td style={{ color: '#9ca3af', fontSize: '13px' }}>
                            {formatDate(query.created_at)}
                          </td>
                          <td>
                            <div className="quick-actions">
                              <button
                                className={`quick-action-btn ${copiedQueryId === query.id ? 'success' : ''}`}
                                onClick={() => copyQueryText(query.raw_query, query.id)}
                                title="Copy Query"
                                aria-label="Copy query"
                              >
                                {copiedQueryId === query.id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                              <button
                                className={`quick-action-btn ${copiedIndexesId === query.id ? 'success' : ''}`}
                                onClick={() => copyIndexesText(query.suggested_indexes || '', query.id)}
                                disabled={!hasIndexes}
                                title="Copy Indexes"
                                aria-label="Copy recommended indexes"
                              >
                                {copiedIndexesId === query.id ? <Check size={14} /> : <FileText size={14} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="action-button"
                                onClick={() => {
                                  setSelectedQuery(query);
                                  completeChecklistItem('viewHistory');
                                  completeChecklistItem('viewSummary');

                                  trackEvent('result_opened', {
                                    result_id: query.id,
                                    severity: query.detected_patterns ? JSON.parse(query.detected_patterns)[0]?.severity : 'low',
                                    has_index_suggestions: !!query.suggested_indexes
                                  });
                                }}
                                title="View"
                                aria-label="View"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className="quick-action-btn"
                                onClick={() => handleRerun(query)}
                                disabled={rerunLoading}
                                title="Re-run Advisor"
                                aria-label="Re-run optimization"
                              >
                                <RefreshCw size={14} className={rerunLoading ? 'spinning' : ''} />
                              </button>

                              <button
                                className="action-button danger"
                                onClick={() => setDeleteConfirm(query.id)}
                                title="Delete"
                                aria-label="Delete query"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-cards-container">
                {filteredQueries.map((query) => {
                  const patterns = getDetectedPatterns(query);
                  const severity = calculateSeverity(patterns);
                  const improvement = calculateImprovement(patterns);
                  const hasIndexes = query.suggested_indexes && query.suggested_indexes.trim().length > 0;

                  return (
                    <div key={query.id} className="mobile-card">
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                        gap: '12px'
                      }}>
                        <div
                          className="db-badge"
                          style={{
                            backgroundColor: `${getDbBadgeColor(query.db_type)}15`,
                            borderColor: `${getDbBadgeColor(query.db_type)}40`,
                            color: getDbBadgeColor(query.db_type)
                          }}
                        >
                          <Database size={14} />
                          {query.db_type}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatDate(query.created_at)}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '14px',
                        color: '#e5e5e5',
                        marginBottom: '8px',
                        fontFamily: "'Fira Code', monospace",
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        <strong style={{ color: '#9ca3af' }}>Query:</strong> {truncate(query.raw_query, 100)}
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <span
                          className="severity-badge"
                          style={{
                            backgroundColor: getSeverityBgColor(severity),
                            borderColor: getSeverityBorderColor(severity),
                            color: getSeverityColor(severity)
                          }}
                        >
                          {severity}
                        </span>
                        <span className="improvement-badge">
                          <TrendingUp size={12} />
                          +{improvement}%
                        </span>
                        <div
                          className={`index-status-icon ${hasIndexes ? 'index-status-yes' : 'index-status-no'}`}
                          aria-label={hasIndexes ? 'Has indexes' : 'No indexes'}
                          title={hasIndexes ? 'Has indexes' : 'No indexes'}
                        >
                          {hasIndexes ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <button
                          className={`quick-action-btn ${copiedQueryId === query.id ? 'success' : ''}`}
                          onClick={() => copyQueryText(query.raw_query, query.id)}
                          aria-label="Copy query"
                        >
                          {copiedQueryId === query.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                          className={`quick-action-btn ${copiedIndexesId === query.id ? 'success' : ''}`}
                          onClick={() => copyIndexesText(query.suggested_indexes || '', query.id)}
                          disabled={!hasIndexes}
                          aria-label="Copy indexes"
                        >
                          {copiedIndexesId === query.id ? <Check size={16} /> : <FileText size={16} />}
                        </button>
                        <button
                          className="quick-action-btn"
                          onClick={() => handleRerun(query)}
                          disabled={rerunLoading}
                          aria-label="Re-run optimization"
                        >
                          <RefreshCw size={16} className={rerunLoading ? 'spinning' : ''} />
                        </button>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        <button
                          className="action-button"
                          onClick={() => {
                            setSelectedQuery(query);
                            completeChecklistItem('viewHistory');
                            completeChecklistItem('viewSummary');
                          }}
                          aria-label="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-button danger"
                          onClick={() => setDeleteConfirm(query.id)}
                          aria-label="Delete query"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {filteredQueries.length > 0 && (
            <div style={{
              marginTop: '16px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Showing {filteredQueries.length} of {queries.length} queries
            </div>
          )}
        </div>

        {selectedQuery && (() => {
          const patterns = getDetectedPatterns(selectedQuery);
          const severity = calculateSeverity(patterns);
          const improvement = calculateImprovement(patterns);

          return (
            <div className="modal-overlay" onClick={() => setSelectedQuery(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                  className="modal-close-button"
                  onClick={() => setSelectedQuery(null)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>

                <div style={{
                  padding: 'clamp(20px, 4vw, 32px)',
                  paddingTop: 'clamp(24px, 5vw, 32px)',
                  borderBottom: '1px solid #1f2327'
                }}>
                  <div className="modal-header-info" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div
                        className="modal-header-badge"
                        style={{
                          backgroundColor: `${getDbBadgeColor(selectedQuery.db_type)}15`,
                          borderColor: `${getDbBadgeColor(selectedQuery.db_type)}40`,
                          color: getDbBadgeColor(selectedQuery.db_type)
                        }}
                      >
                        <Database size={14} />
                        {selectedQuery.db_type}
                      </div>
                      <span
                        className="severity-badge"
                        style={{
                          backgroundColor: getSeverityBgColor(severity),
                          borderColor: getSeverityBorderColor(severity),
                          color: getSeverityColor(severity)
                        }}
                      >
                        {severity} severity
                      </span>
                      <span className="improvement-badge">
                        <TrendingUp size={12} />
                        +{improvement}%
                      </span>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      {formatDate(selectedQuery.created_at)}
                    </div>
                  </div>
                  <h2 style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: '700',
                    color: '#ffffff',
                    margin: 0
                  }}>
                    Query Details
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginTop: '8px'
                  }}>
                    ID: {selectedQuery.id.slice(0, 8)}...
                  </p>
                </div>

              <div style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
                <div style={{ marginBottom: '32px' }}>
                  <div className="section-label">
                    <span>Original Query</span>
                    <button
                      className={`copy-button ${copiedField === 'raw_query' ? 'copied' : ''}`}
                      onClick={() => copyText(selectedQuery.raw_query, 'raw_query', selectedQuery)}
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
                  <div className="code-block">{selectedQuery.raw_query}</div>
                </div>

                {selectedQuery.optimized_query && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Optimized Query</span>
                      <button
                        className={`copy-button ${copiedField === 'optimized_query' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.optimized_query!, 'optimized_query', selectedQuery)}
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
                      {selectedQuery.optimized_query}
                    </div>
                  </div>
                )}

                {selectedQuery.suggested_indexes && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Suggested Indexes</span>
                      <button
                        className={`copy-button ${copiedField === 'suggested_indexes' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.suggested_indexes!, 'suggested_indexes', selectedQuery)}
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
                    <div className="code-block">{selectedQuery.suggested_indexes}</div>
                  </div>
                )}

                {selectedQuery.bottleneck && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Bottleneck Analysis</span>
                      <button
                        className={`copy-button ${copiedField === 'bottleneck' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.bottleneck!, 'bottleneck', selectedQuery)}
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
                      {selectedQuery.bottleneck}
                    </div>
                  </div>
                )}

                {selectedQuery.notes && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Notes</span>
                      <button
                        className={`copy-button ${copiedField === 'notes' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.notes!, 'notes', selectedQuery)}
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
                      {selectedQuery.notes}
                    </div>
                  </div>
                )}

                {selectedQuery.schema && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Table Schema</span>
                      <button
                        className={`copy-button ${copiedField === 'schema' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.schema!, 'schema', selectedQuery)}
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
                      {selectedQuery.schema}
                    </div>
                  </div>
                )}

                {selectedQuery.execution_plan && (
                  <div style={{ marginBottom: '32px' }}>
                    <div className="section-label">
                      <span>Execution Plan</span>
                      <button
                        className={`copy-button ${copiedField === 'execution_plan' ? 'copied' : ''}`}
                        onClick={() => copyText(selectedQuery.execution_plan!, 'execution_plan', selectedQuery)}
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
                      {selectedQuery.execution_plan}
                    </div>
                  </div>
                )}

                <div style={{
                  marginTop: '32px',
                  paddingTop: '24px',
                  borderTop: '1px solid #1f2327',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    className="secondary-button"
                    onClick={() => downloadReport(`query_${selectedQuery.id.slice(0, 8)}.txt`, generateFullReport(selectedQuery))}
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <Download size={16} style={{ marginRight: '8px' }} />
                    Download Report
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => emailReport('SQL Query Report', generateFullReport(selectedQuery))}
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <Mail size={16} style={{ marginRight: '8px' }} />
                    Share via Email
                  </button>
                </div>

                <div className="modal-buttons-container" style={{ marginTop: '16px' }}>
                  <button
                    className="secondary-button"
                    onClick={() => handleRerun(selectedQuery)}
                    disabled={rerunLoading}
                  >
                    <RefreshCw size={16} style={{ marginRight: '8px' }} />
                    {rerunLoading ? 'Re-optimizing...' : 'Re-run Optimization'}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      setDeleteConfirm(selectedQuery.id);
                    }}
                  >
                    <Trash2 size={16} style={{ marginRight: '8px' }} />
                    Delete Query
                  </button>
                </div>
              </div>
              </div>
            </div>
          );
        })()}

        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px' }}
            >
              <button
                className="modal-close-button"
                onClick={() => setDeleteConfirm(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div style={{ padding: 'clamp(20px, 4vw, 32px)', paddingTop: 'clamp(24px, 5vw, 36px)' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <AlertCircle size={28} style={{ color: '#ef4444' }} />
                </div>

                <h2 style={{
                  fontSize: 'clamp(20px, 4vw, 24px)',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  Delete Query?
                </h2>

                <p style={{
                  fontSize: '15px',
                  color: '#9ca3af',
                  marginBottom: '24px',
                  lineHeight: '1.6'
                }}>
                  Are you sure you want to delete this query? This action cannot be undone.
                </p>

                <div className="modal-buttons-container">
                  <button
                    className="secondary-button"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => handleDelete(deleteConfirm)}
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Query History Detail Modal */}
        {selectedHistoryItem && (
          <div className="modal-overlay" onClick={() => setSelectedHistoryItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-button"
                onClick={() => setSelectedHistoryItem(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div style={{
                padding: 'clamp(20px, 4vw, 32px)',
                paddingTop: 'clamp(24px, 5vw, 32px)',
                borderBottom: '1px solid #1f2327'
              }}>
                <h2 style={{
                  fontSize: 'clamp(20px, 4vw, 24px)',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0
                }}>
                  Analysis Details
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '8px'
                }}>
                  {new Date(selectedHistoryItem.created_at).toLocaleString()}
                </p>
              </div>

              <div style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
                <div style={{ marginBottom: '32px' }}>
                  <div className="section-label">
                    <span>Query</span>
                  </div>
                  <div className="code-block">{selectedHistoryItem.input_query}</div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <div className="section-label">
                    <span>Analysis Result</span>
                  </div>
                  <div style={{
                    background: '#0a0c0e',
                    border: '1px solid #1f2327',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'grid',
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      {selectedHistoryItem.analysis_result.score !== undefined && (
                        <div>
                          <span style={{ color: '#9ca3af', fontWeight: '600' }}>Score: </span>
                          <span style={{ color: '#00ffa3', fontWeight: '700' }}>{selectedHistoryItem.analysis_result.score}/100</span>
                        </div>
                      )}
                      {selectedHistoryItem.analysis_result.severity && (
                        <div>
                          <span style={{ color: '#9ca3af', fontWeight: '600' }}>Severity: </span>
                          <span style={{
                            color: selectedHistoryItem.analysis_result.severity === 'critical' ? '#ef4444' :
                                  selectedHistoryItem.analysis_result.severity === 'high' ? '#fb923c' :
                                  selectedHistoryItem.analysis_result.severity === 'medium' ? '#eab308' : '#00ffa3',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {selectedHistoryItem.analysis_result.severity}
                          </span>
                        </div>
                      )}
                      {selectedHistoryItem.analysis_result.speedupEstimate && (
                        <div>
                          <span style={{ color: '#9ca3af', fontWeight: '600' }}>Speed Improvement: </span>
                          <span style={{ color: '#00ffa3', fontWeight: '700' }}>
                            +{(selectedHistoryItem.analysis_result.speedupEstimate * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedHistoryItem.analysis_result.issues && selectedHistoryItem.analysis_result.issues.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#00ffa3',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: '12px'
                        }}>
                          Issues Found
                        </div>
                        <ul style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {selectedHistoryItem.analysis_result.issues.map((issue: string, idx: number) => (
                            <li key={idx} style={{
                              color: '#e5e5e5',
                              fontSize: '14px',
                              paddingLeft: '20px',
                              position: 'relative'
                            }}>
                              <span style={{
                                position: 'absolute',
                                left: 0,
                                color: '#ef4444'
                              }}>•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedHistoryItem.analysis_result.rewrittenQuery && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#00ffa3',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: '12px'
                        }}>
                          Optimized Query
                        </div>
                        <div className="code-block" style={{ color: '#00ffa3' }}>
                          {selectedHistoryItem.analysis_result.rewrittenQuery}
                        </div>
                      </div>
                    )}

                    {selectedHistoryItem.analysis_result.suggestedIndex && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#00ffa3',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: '12px'
                        }}>
                          Suggested Index
                        </div>
                        <div className="code-block">
                          {selectedHistoryItem.analysis_result.suggestedIndex}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Modal */}
        {showWelcomeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #111418 0%, #1a1d24 100%)',
              border: '2px solid #00ffa3',
              borderRadius: '20px',
              padding: '48px 40px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 0 60px rgba(0, 255, 163, 0.4)',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out',
            }}>
              <style>{`
                @keyframes modalSlideIn {
                  from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                  }
                }
              `}</style>

              <div style={{
                fontSize: '48px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                👋
              </div>

              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: '16px',
                textShadow: '0 0 30px rgba(0, 255, 163, 0.3)',
              }}>
                Welcome to DBPowerAI
              </h2>

              <p style={{
                fontSize: '16px',
                color: '#9ca3af',
                textAlign: 'center',
                marginBottom: '32px',
                lineHeight: '1.6',
              }}>
                You are an <span style={{ color: '#00ffa3', fontWeight: '600' }}>Early Adopter</span> until December 31, 2025.
              </p>

              <div style={{
                background: '#0d0f11',
                border: '1px solid #1f2327',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
              }}>
                <p style={{
                  fontSize: '15px',
                  color: '#e5e5e5',
                  marginBottom: '16px',
                  fontWeight: '600',
                }}>
                  You now have:
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    paddingLeft: '28px',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#00ffa3',
                      fontSize: '18px',
                    }}>•</span>
                    <span style={{ color: '#00ffa3', fontWeight: '600' }}>500 analyses</span> per month
                  </li>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    paddingLeft: '28px',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#00ffa3',
                      fontSize: '18px',
                    }}>•</span>
                    <span style={{ color: '#00ffa3', fontWeight: '600' }}>500k tokens</span>
                  </li>
                  <li style={{
                    fontSize: '15px',
                    color: '#9ca3af',
                    paddingLeft: '28px',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#00ffa3',
                      fontSize: '18px',
                    }}>•</span>
                    Full access to <span style={{ color: '#00ffa3', fontWeight: '600' }}>all features</span>
                  </li>
                </ul>
              </div>

              <p style={{
                fontSize: '16px',
                color: '#e5e5e5',
                textAlign: 'center',
                marginBottom: '24px',
                fontWeight: '600',
              }}>
                Let's run your first analysis!
              </p>

              <button
                onClick={handleCloseWelcome}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#00ffa3',
                  color: '#0d0f11',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 0 30px rgba(0, 255, 163, 0.4)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 255, 163, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 163, 0.4)';
                }}
              >
                Start analyzing
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;
