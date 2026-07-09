import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PageHeader, EmptyState } from '../components/ui';

export default function AuditTrail() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditRecent(150).then((r) => setEvents(r.events || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Audit Trail"
        title="Every AI Action, Logged"
        description="Full traceability: every query, extraction, compliance check, and escalation is recorded with its source and confidence — essential for regulatory trust."
      />

      {loading ? null : events.length === 0 ? (
        <EmptyState eyebrow="No activity yet" title="Log is empty" description="Interact with any feature — the Copilot, Compliance, RCA — and it will appear here." />
      ) : (
        <div className="bracket-panel" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Time', 'Feature', 'Action', 'Confidence', 'Escalated'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-faint)' }} className="mono">
                    {new Date(e.timestamp * 1000).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}><span className="pill pill-blue mono">{e.feature}</span></td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{e.action}</td>
                  <td style={{ padding: '10px 14px' }} className="mono">
                    {e.confidence != null ? `${Math.round(e.confidence * 100)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {e.escalated ? <span className="pill pill-amber">YES</span> : <span className="pill pill-muted">NO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
