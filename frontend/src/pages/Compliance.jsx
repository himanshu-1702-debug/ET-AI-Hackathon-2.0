import { useState } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, SeverityPill, Spinner, ErrorBanner, EmptyState } from '../components/ui';

const STATUS_MAP = {
  compliant: { color: 'var(--signal-green)', label: 'COMPLIANT' },
  minor_gaps: { color: 'var(--signal-amber)', label: 'MINOR GAPS' },
  major_gaps: { color: 'var(--signal-red)', label: 'MAJOR GAPS' },
  unknown: { color: 'var(--text-faint)', label: 'UNKNOWN' },
};

export default function Compliance() {
  const [scope, setScope] = useState('');
  const [result, setResult] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function handleCheck() {
    if (!scope.trim()) return;
    setLoading('check'); setError(null); setResult(null); setEvidence(null);
    try { setResult(await api.checkCompliance(scope)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Check failed.' }); }
    finally { setLoading(null); }
  }

  async function handleEvidence() {
    if (!scope.trim()) return;
    setLoading('evidence'); setError(null);
    try { setEvidence(await api.generateEvidencePackage(scope)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Evidence generation failed.' }); }
    finally { setLoading(null); }
  }

  const statusInfo = STATUS_MAP[result?.overall_compliance_status] || STATUS_MAP.unknown;

  return (
    <div>
      <PageHeader
        eyebrow="Compliance Watch"
        title="Compliance Watch"
        description="Cross-checks documents for contradictions and regulatory gaps, and generates audit-ready evidence packages on demand."
      />
      <ErrorBanner error={error} />

      <div className="bracket-panel" style={{ marginBottom: 16 }}>
        <label className="label">Scope (equipment, zone, or permit reference)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={scope} onChange={(e) => setScope(e.target.value)}
            placeholder="e.g. Compressor B-12" onKeyDown={(e) => e.key === 'Enter' && handleCheck()} />
          <button className="btn btn-primary" onClick={handleCheck} disabled={loading || !scope.trim()}>
            {loading === 'check' ? 'Checking…' : 'Check Compliance'}
          </button>
          <button className="btn" onClick={handleEvidence} disabled={loading || !scope.trim()}>
            {loading === 'evidence' ? 'Generating…' : 'Generate Evidence Package'}
          </button>
        </div>
      </div>

      {loading && <Spinner />}

      {result && !loading && (
        <div className="bracket-panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="eyebrow">Compliance Status — {result.scope}</span>
            <span className="pill" style={{ background: 'transparent', border: `1px solid ${statusInfo.color}`, color: statusInfo.color }}>
              <span className="dot" style={{ background: statusInfo.color }} /> {statusInfo.label}
            </span>
          </div>

          {result.gaps_found.length === 0 ? (
            <EmptyState eyebrow="No gaps found" title="Clean scope" description="No contradictions detected in the reviewed documents for this scope." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.gaps_found.map((gap, i) => (
                <div key={i} className="citation-card" style={{ borderLeftColor: 'var(--signal-red)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <SeverityPill severity={gap.severity} />
                    {gap.regulatory_reference && <span className="pill pill-muted mono">{gap.regulatory_reference}</span>}
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 13 }}>{gap.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
                    <div><span className="mono" style={{ color: 'var(--signal-blue)' }}>{gap.document_a}</span><br />{gap.statement_a}</div>
                    <div><span className="mono" style={{ color: 'var(--signal-blue)' }}>{gap.document_b}</span><br />{gap.statement_b}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {evidence && !loading && (
        <div className="bracket-panel">
          <span className="eyebrow">Evidence Package · {evidence.package_id}</span>
          <h3 style={{ fontSize: 16, margin: '10px 0' }}>{evidence.scope}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{evidence.summary}</p>
          {evidence.applicable_regulations?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span className="label">Applicable regulations</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {evidence.applicable_regulations.map((r, i) => <span key={i} className="pill pill-blue">{r}</span>)}
              </div>
            </div>
          )}
          {evidence.open_items?.length > 0 && (
            <div>
              <span className="label" style={{ color: 'var(--signal-amber)' }}>Open items before audit</span>
              <ul style={{ margin: '6px 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
                {evidence.open_items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
