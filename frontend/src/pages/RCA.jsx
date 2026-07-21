import { useState } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, ConfidenceBar, Spinner, ErrorBanner } from '../components/ui';

export default function RCA() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api.analyzeRCA(query)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'RCA failed.' }); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance Intelligence"
        title="Root Cause Analysis"
        description="Reactive, single-incident-scoped — traces a failure back through the full evidence chain: related incidents, maintenance actions, and procedures."
      />
      <ErrorBanner error={error} />

      <div className="bracket-panel" style={{ marginBottom: 16 }}>
        <label className="label">Equipment or failure description</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. rack storage system deformation" onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} />
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !query.trim()}>
            {loading ? 'Analyzing…' : 'Run RCA'}
          </button>
        </div>
      </div>

      {loading && <Spinner />}

      {result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="bracket-panel">
            <span className="eyebrow">Probable Root Causes</span>
            <ol style={{ margin: '10px 0 16px', paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7 }}>
              {(result.probable_root_causes || []).map((c, i) => <li key={i}>{c}</li>)}
            </ol>

            {result.contributing_factors?.length > 0 && (
              <>
                <span className="label">Contributing factors</span>
                <ul style={{ margin: '6px 0 16px', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {result.contributing_factors.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}

            <span className="label">Recommended actions</span>
            <ul style={{ margin: '6px 0', paddingLeft: 18, fontSize: 12.5 }}>
              {(result.recommended_actions || []).map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="bracket-panel">
              <span className="label">Confidence</span>
              <ConfidenceBar value={result.confidence} />
            </div>

            {result.systemic_pattern_detected && (
              <div className="bracket-panel" style={{ borderColor: 'var(--signal-amber)' }}>
                <span className="pill pill-amber" style={{ marginBottom: 10 }}>⚠ SYSTEMIC PATTERN DETECTED</span>
                <p style={{ fontSize: 12.5, color: 'var(--text-primary)', margin: 0 }}>
                  {result.systemic_pattern_description}
                </p>
              </div>
            )}

            {result.related_past_incidents?.length > 0 && (
              <div className="bracket-panel">
                <span className="label">Related past incidents</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {result.related_past_incidents.map((inc, i) => (
                    <div key={i} className="citation-card" style={{ fontSize: 11.5 }}>{inc}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
