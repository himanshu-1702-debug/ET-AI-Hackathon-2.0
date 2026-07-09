import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui';

const FEATURE_TILES = [
  { id: 'ingestion', title: 'Capture & Ingestion', desc: 'Documents, drawings, and informal threads become structured knowledge.' },
  { id: 'copilot', title: 'Expert Copilot', desc: 'Hybrid RAG + multi-hop reasoning across the full corpus, with citations.' },
  { id: 'onboarding', title: 'Onboarding Paths', desc: 'Personalized ramp-up knowledge for new hires by role and area.' },
  { id: 'compliance', title: 'Compliance Watch', desc: 'Contradiction detection and one-click audit evidence packages.' },
  { id: 'rca', title: 'RCA Agent', desc: 'Trace a single failure back through its full evidence chain.' },
  { id: 'lessons', title: 'Lessons Learned', desc: 'Org-wide pattern mining across incidents no one person would connect.' },
];

export default function Overview({ onNavigate }) {
  const [graphSummary, setGraphSummary] = useState(null);
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    api.getGraphSummary().then(setGraphSummary).catch(() => {});
    api.getEscalations(5).then((r) => setEscalations(r.escalations || [])).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="System Overview"
        title="Plant Brain Control Panel"
        description="A single knowledge layer connecting document intelligence, compliance monitoring, and field-ready access, built on a shared knowledge graph and hybrid retrieval engine."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Knowledge Graph Nodes" value={graphSummary?.node_count ?? '—'} accent="amber" />
        <StatCard label="Graph Relationships" value={graphSummary?.edge_count ?? '—'} accent="blue" />
        <StatCard label="Linkage Completeness" value={graphSummary ? `${graphSummary.linkage_completeness_pct}%` : '—'} accent="green" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {FEATURE_TILES.map((f) => (
          <button
            key={f.id}
            onClick={() => onNavigate(f.id)}
            className="bracket-panel"
            style={{ textAlign: 'left', border: 'none', cursor: 'pointer' }}
          >
            <h3 style={{ fontSize: 15, marginBottom: 6, marginTop: 4 }}>{f.title}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>{f.desc}</p>
          </button>
        ))}
      </div>

      <div className="bracket-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="eyebrow">Human Review</span>
          <button className="btn" onClick={() => onNavigate('routing')}>View all findings →</button>
        </div>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Recent items escalated for human review</h3>
        {escalations.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No escalations yet — run a Copilot query, Compliance check, or RCA to populate this.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {escalations.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--ink)', borderRadius: 6, border: '1px solid var(--line)' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--signal-amber)' }}>{e.feature}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const colorMap = { amber: 'var(--signal-amber)', blue: 'var(--signal-blue)', green: 'var(--signal-green)' };
  return (
    <div className="bracket-panel">
      <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: colorMap[accent] }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
