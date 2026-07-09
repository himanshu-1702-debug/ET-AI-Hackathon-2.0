import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export function StatusBar() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!confirm('This clears all ingested documents, the knowledge graph, and audit log. Continue?')) return;
    setResetting(true);
    try {
      await api.resetSystem();
      window.location.reload();
    } catch (e) {
      alert(e.detail || 'Reset failed - you may need the Plant Manager role.');
    } finally { setResetting(false); }
  }

  useEffect(() => {
    const fetchStatus = () => {
      api.status().then(setStatus).catch(() => setError(true));
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const llmOk = status?.llm_configured;
  const nodeCount = status?.graph_summary?.node_count ?? 0;
  const edgeCount = status?.graph_summary?.edge_count ?? 0;
  const chunkCount = status?.vector_store_chunk_count ?? 0;

  return (
    <div style={{
      height: 46, borderBottom: '1px solid var(--line)', background: 'var(--panel)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24, flexShrink: 0,
    }}>
      <StatusItem
        dotClass={error ? 'dot-red' : llmOk ? 'dot-green' : 'dot-red'}
        label={error ? 'BACKEND UNREACHABLE' : llmOk ? 'AI ENGINE ONLINE' : 'API KEY NOT SET'}
      />
      <div style={{ width: 1, height: 18, background: 'var(--line)' }} />
      <MetricItem label="Entities" value={nodeCount} />
      <MetricItem label="Relationships" value={edgeCount} />
      <MetricItem label="Indexed Chunks" value={chunkCount} />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        {user?.role === 'plant_manager' && (
          <button onClick={handleReset} disabled={resetting} className="btn" style={{ fontSize: 11, padding: '5px 10px' }}>
            {resetting ? 'Resetting…' : 'Reset demo data'}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="mono" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{user?.role}</div>
          </div>
          <button onClick={logout} className="btn" style={{ fontSize: 11, padding: '5px 10px' }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ dotClass, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span className={`dot ${dotClass}`} />
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{label}</span>
    </div>
  );
}

function MetricItem({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span className="mono" style={{ fontSize: 13, color: 'var(--signal-amber)', fontWeight: 600 }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{label}</span>
    </div>
  );
}
