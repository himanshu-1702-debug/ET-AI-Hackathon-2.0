export function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 75 ? 'var(--signal-green)' : pct >= 50 ? 'var(--signal-amber)' : 'var(--signal-red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="confidence-bar-track" style={{ width: 80 }}>
        <div className="confidence-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mono" style={{ fontSize: 12, color }}>{pct}%</span>
    </div>
  );
}

export function EscalationBadge({ escalated }) {
  if (!escalated) return <span className="pill pill-green"><span className="dot dot-green" /> AUTO-RESOLVED</span>;
  return <span className="pill pill-amber"><span className="dot dot-amber" /> ESCALATED · HUMAN REVIEW</span>;
}

export function SeverityPill({ severity }) {
  const map = {
    high: { cls: 'pill-red', dot: 'dot-red', label: 'HIGH' },
    medium: { cls: 'pill-amber', dot: 'dot-amber', label: 'MEDIUM' },
    low: { cls: 'pill-blue', dot: 'dot-amber', label: 'LOW' },
  };
  const s = map[severity] || map.low;
  return <span className={`pill ${s.cls}`}><span className={`dot ${s.dot}`} /> {s.label}</span>;
}

export function EmptyState({ eyebrow, title, description }) {
  return (
    <div className="empty-state">
      <span className="eyebrow">{eyebrow}</span>
      <h3 style={{ marginBottom: 8, fontSize: 16 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>{description}</p>
    </div>
  );
}

export function CitationList({ citations }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
      <span className="label">Sources cited</span>
      {citations.map((c, i) => (
        <div className="citation-card" key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="mono" style={{ color: 'var(--signal-blue)' }}>{c.filename || 'unknown source'}</span>
            <span className="pill pill-muted">{c.doc_type}</span>
          </div>
          <div>"{c.excerpt}"</div>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <span className="eyebrow">{eyebrow}</span>
      <h1 style={{ fontSize: 24, marginTop: 6, marginBottom: 8 }}>{title}</h1>
      {description && <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 640, margin: 0 }}>{description}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="mono pulse" style={{ fontSize: 12, color: 'var(--signal-amber)' }}>
      ▮▯▮ PROCESSING...
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  const isKeyMissing = error.status === 503;
  return (
    <div style={{
      background: 'var(--signal-red-dim)', border: '1px solid var(--signal-red)',
      borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 16, color: '#FFD7D9',
    }}>
      {isKeyMissing
        ? 'AI features unavailable — API key not configured. Add ANTHROPIC_API_KEY to backend/.env and restart the server.'
        : (error.detail || 'Something went wrong contacting the backend.')}
    </div>
  );
}
