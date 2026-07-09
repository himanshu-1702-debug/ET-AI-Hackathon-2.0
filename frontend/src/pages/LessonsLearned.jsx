import { useState } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, SeverityPill, Spinner, ErrorBanner, EmptyState } from '../components/ui';

export default function LessonsLearned() {
  const [focusArea, setFocusArea] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleScan() {
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api.scanPatterns(focusArea)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Scan failed.' }); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Failure Intelligence"
        title="Discovered Patterns"
        description="Proactive, organisation-wide scan — finds systemic patterns across incidents, near-misses, and audits that no single reviewer would connect, since the reports were filed separately."
      />
      <ErrorBanner error={error} />

      <div className="bracket-panel" style={{ marginBottom: 16 }}>
        <label className="label">Focus area (optional — leave blank for a broad scan)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={focusArea} onChange={(e) => setFocusArea(e.target.value)}
            placeholder="e.g. Zone C permits" onKeyDown={(e) => e.key === 'Enter' && handleScan()} />
          <button className="btn btn-primary" onClick={handleScan} disabled={loading}>
            {loading ? 'Scanning…' : 'Scan for Patterns'}
          </button>
        </div>
      </div>

      {loading && <Spinner />}

      {result && !loading && (
        result.patterns_found.length === 0 ? (
          <EmptyState eyebrow="No patterns found" title="Nothing systemic detected" description="Try ingesting more incident/near-miss records, or broaden the focus area." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result.patterns_found.map((p, i) => (
              <div key={i} className="bracket-panel" style={{ borderColor: p.risk_level === 'high' ? 'var(--signal-red)' : 'var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SeverityPill severity={p.risk_level} />
                  <span className="pill pill-muted mono">{p.occurrence_count}× OCCURRENCES</span>
                </div>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>{p.pattern_description}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Affected area: <span className="mono" style={{ color: 'var(--signal-blue)' }}>{p.affected_area_or_equipment}</span>
                </div>
                <div className="citation-card" style={{ borderLeftColor: 'var(--signal-green)' }}>
                  <strong style={{ color: 'var(--signal-green)' }}>Recommended action: </strong>{p.recommended_action}
                </div>
                {p.supporting_evidence?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <span className="label">Supporting evidence</span>
                    <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 11.5, color: 'var(--text-faint)' }}>
                      {p.supporting_evidence.map((ev, j) => <li key={j}>{ev}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
