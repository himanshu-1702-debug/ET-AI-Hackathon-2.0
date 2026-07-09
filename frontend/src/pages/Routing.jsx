import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { PageHeader, SeverityPill, EmptyState } from '../components/ui';

const CAN_ACKNOWLEDGE_ROLES = ['compliance_officer', 'safety_officer', 'plant_manager'];

const ROLES = [
  { value: 'maintenance_lead', label: 'Maintenance Lead' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'plant_manager', label: 'Plant Manager' },
];

export default function Routing() {
  const { user } = useAuth();
  const canAcknowledge = CAN_ACKNOWLEDGE_ROLES.includes(user?.role);
  const [role, setRole] = useState('compliance_officer');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  function load(r) {
    setLoading(true);
    api.getInbox(r).then((res) => setFindings(res.findings || [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(role); }, [role]);

  async function handleAck(id) {
    await api.acknowledgeFinding(id);
    load(role);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Findings Inbox"
        title="Routed Findings Inbox"
        description="Findings from Compliance, RCA, and Lessons Learned are automatically classified and routed to the role that needs to see them."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ROLES.map((r) => (
          <button key={r.value} className="btn" onClick={() => setRole(r.value)}
            style={{ borderColor: role === r.value ? 'var(--signal-amber)' : 'var(--line-bright)', color: role === r.value ? 'var(--signal-amber)' : 'var(--text-muted)' }}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? null : findings.length === 0 ? (
        <EmptyState eyebrow={`Inbox: ${role}`} title="Nothing routed here yet" description="Run a Compliance check, RCA analysis, or Lessons Learned scan that produces a high-severity finding to see it appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {findings.map((f) => (
            <div key={f.id} className="bracket-panel" style={{ opacity: f.acknowledged ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <SeverityPill severity={f.priority} />
                  <span className="pill pill-muted mono">{f.source_feature}</span>
                </div>
                {!f.acknowledged && canAcknowledge && <button className="btn" onClick={() => handleAck(f.id)}>Acknowledge</button>}
                {!f.acknowledged && !canAcknowledge && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Your role can't acknowledge findings</span>}
                {f.acknowledged && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>✓ Acknowledged</span>}
              </div>
              <p style={{ fontSize: 13, marginBottom: 6 }}>{f.finding}</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: 0 }}>{f.routing_reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
