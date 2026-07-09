const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ id: 'overview', label: 'System Overview', icon: '◈' }],
  },
  {
    label: 'Capture & Ingestion',
    items: [
      { id: 'ingestion', label: 'Document Ingestion', icon: '⬆' },
      { id: 'graph', label: 'Knowledge Graph', icon: '⬡' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'copilot', label: 'Expert Copilot', icon: '◎' },
      { id: 'onboarding', label: 'Onboarding Paths', icon: '↗' },
      { id: 'tacit', label: 'Tacit Capture', icon: '◐' },
    ],
  },
  {
    label: 'Action & Workflow',
    items: [
      { id: 'compliance', label: 'Compliance Watch', icon: '⚑' },
      { id: 'rca', label: 'RCA Agent', icon: '⌁' },
      { id: 'lessons', label: 'Lessons Learned', icon: '✦' },
      { id: 'routing', label: 'Routed Findings', icon: '⇉' },
    ],
  },
  {
    label: 'Trust & Field Access',
    items: [
      { id: 'audit', label: 'Audit Trail', icon: '▤' },
      { id: 'observability', label: 'Observability', icon: '◆' },
      { id: 'field', label: 'Field Access (Mobile)', icon: '▣' },
    ],
  },
];

export function Sidebar({ active, onNavigate }) {
  return (
    <aside style={{
      width: 232, flexShrink: 0, background: 'var(--panel)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot dot-amber pulse" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>PLANT BRAIN</span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, letterSpacing: '0.04em' }}>
          INDUSTRIAL KNOWLEDGE OS
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--text-faint)', padding: '0 8px 6px', fontWeight: 600,
            }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', borderRadius: 6, border: 'none', textAlign: 'left',
                  background: active === item.id ? 'var(--panel-raised)' : 'transparent',
                  color: active === item.id ? 'var(--signal-amber)' : 'var(--text-muted)',
                  borderLeft: active === item.id ? '2px solid var(--signal-amber)' : '2px solid transparent',
                  fontSize: 13, fontWeight: active === item.id ? 600 : 500, marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
          v1.0
        </div>
      </div>
    </aside>
  );
}
