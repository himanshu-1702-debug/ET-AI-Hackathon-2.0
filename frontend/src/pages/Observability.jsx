import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { PageHeader, EmptyState } from '../components/ui';

export default function Observability() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [replaying, setReplaying] = useState(null);

  function load() {
    api.getObservability().then(setData).catch((e) => setError(e));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleReplay(jobId) {
    setReplaying(jobId);
    try {
      await api.replayJob(jobId);
      load();
    } catch (e) {
      alert(e.detail || 'Replay failed.');
    } finally { setReplaying(null); }
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Observability" title="System Health & SLA Tracking" description="" />
        <EmptyState
          eyebrow="Access restricted"
          title={error.status === 403 ? "Your role doesn't have observability access" : "Couldn't load observability data"}
          description={error.detail || 'Sign in as Compliance Officer or Plant Manager to view this screen.'}
        />
      </div>
    );
  }

  if (!data) return null;

  const { sla_summary, recent_failed_jobs, recent_running_jobs } = data;

  return (
    <div>
      <PageHeader
        eyebrow="Operational Maturity · SLA Tracking + Dead Letter Queue"
        title="System Health & Observability"
        description="Background job performance across all async processing — document ingestion, drawing digitisation, thread mining, and pattern scans."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Jobs" value={sla_summary.total_jobs} />
        <StatCard label="SLA Breach Rate" value={`${sla_summary.sla_breach_rate_pct}%`}
          accent={sla_summary.sla_breach_rate_pct > 20 ? 'red' : 'green'} />
        <StatCard label="Dead Letter Queue" value={sla_summary.dead_letter_queue_size} accent={sla_summary.dead_letter_queue_size > 0 ? 'amber' : 'green'} />
        <StatCard label="Currently Running" value={sla_summary.currently_running} accent="blue" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="bracket-panel">
          <span className="eyebrow">Dead Letter Queue</span>
          <h3 style={{ fontSize: 15, margin: '8px 0 14px' }}>Failed jobs awaiting replay</h3>
          {recent_failed_jobs.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No failed jobs. Clean run.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent_failed_jobs.map((job) => (
                <div key={job.id} className="citation-card" style={{ borderLeftColor: 'var(--signal-red)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="pill pill-red mono">{job.type}</span>
                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => handleReplay(job.id)} disabled={replaying === job.id}>
                      {replaying === job.id ? 'Replaying…' : 'Replay'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5 }}>{job.error}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bracket-panel">
          <span className="eyebrow">Currently Running</span>
          <h3 style={{ fontSize: 15, margin: '8px 0 14px' }}>In-flight background jobs</h3>
          {recent_running_jobs.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Nothing running right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent_running_jobs.map((job) => (
                <div key={job.id} className="citation-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="pill pill-blue mono">{job.type}</span>
                    <span className="pill pill-muted mono">SLA: {job.sla_seconds}s</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = 'amber' }) {
  const colorMap = { amber: 'var(--signal-amber)', blue: 'var(--signal-blue)', green: 'var(--signal-green)', red: 'var(--signal-red)' };
  return (
    <div className="bracket-panel">
      <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: colorMap[accent] }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
