import { useState } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, Spinner, ErrorBanner } from '../components/ui';

export default function Onboarding() {
  const [role, setRole] = useState('');
  const [area, setArea] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!role.trim() || !area.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api.generateOnboardingPath(role, area)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Generation failed.' }); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding Paths"
        title="Personalized Ramp-Up Paths"
        description="Generates a structured knowledge path for a new hire based on role and assigned area, drawing only from what's actually in the knowledge base."
      />
      <ErrorBanner error={error} />

      <div className="bracket-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="label">Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Maintenance Technician" />
          </div>
          <div>
            <label className="label">Assigned area / equipment</label>
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Zone C Compressors" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !role.trim() || !area.trim()}>
          {loading ? 'Generating…' : 'Generate Learning Path'}
        </button>
      </div>

      {loading && <Spinner />}

      {result && !loading && (
        <div className="bracket-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="eyebrow">{result.role} · {result.area}</span>
            <span className="pill pill-blue">EST. {result.estimated_ramp_up_days} DAYS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(result.learning_path || []).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="mono" style={{
                    width: 26, height: 26, borderRadius: '50%', background: 'var(--signal-amber-dim)',
                    color: 'var(--signal-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>{step.step}</div>
                  {i < result.learning_path.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 4 }}>{step.topic}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 8 }}>{step.why_it_matters}</p>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5 }}>
                    {(step.key_points || []).map((kp, j) => <li key={j}>{kp}</li>)}
                  </ul>
                  {step.source_documents?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {step.source_documents.map((d, j) => <span key={j} className="pill pill-muted mono">{d}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
