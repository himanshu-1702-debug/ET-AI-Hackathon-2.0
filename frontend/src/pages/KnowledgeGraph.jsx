import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { PageHeader, EmptyState } from '../components/ui';

const TYPE_COLORS = {
  equipment: '#4F9CF9', regulation: '#F0A828', incident: '#E5555A',
  personnel: '#3ECF8E', procedure: '#B98CFF', location: '#5B6685', unknown: '#8B96AC',
};

export default function KnowledgeGraph() {
  const [summary, setSummary] = useState(null);
  const [positions, setPositions] = useState({});
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    api.getGraphSummary().then((data) => {
      setSummary(data);
      setPositions(layoutNodes(data.nodes, data.edges));
    }).catch(() => {});
  }, []);

  if (!summary) return <PageContainer><EmptyState eyebrow="Loading" title="Fetching graph…" description="" /></PageContainer>;

  if (summary.node_count === 0) {
    return (
      <PageContainer>
        <EmptyState
          eyebrow="Knowledge Graph Empty"
          title="No entities yet"
          description="Upload documents on the Ingestion page first — entities and relationships will populate here automatically."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="bracket-panel" style={{ flex: 1, height: 560, overflow: 'hidden', padding: 0 }}>
          <svg ref={svgRef} viewBox="0 0 800 560" style={{ width: '100%', height: '100%' }}>
            {summary.edges.map((e, i) => {
              const a = positions[e.source]; const b = positions[e.target];
              if (!a || !b) return null;
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="var(--line-bright)" strokeWidth={1} opacity={0.5} />
              );
            })}
            {summary.nodes.map((n) => {
              const p = positions[n.id];
              if (!p) return null;
              const color = TYPE_COLORS[n.type] || TYPE_COLORS.unknown;
              const isSelected = selected?.id === n.id;
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={() => setSelected(n)} style={{ cursor: 'pointer' }}>
                  <circle r={isSelected ? 10 : 7} fill={color} opacity={isSelected ? 1 : 0.85}
                    stroke={isSelected ? '#fff' : 'none'} strokeWidth={1.5} />
                  <text x={11} y={4} fontSize={9} fill="var(--text-muted)" fontFamily="IBM Plex Mono">
                    {n.label?.slice(0, 22)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="bracket-panel">
            <span className="eyebrow">Legend</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                  <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>
                    {summary.type_counts[type] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bracket-panel" style={{ flex: 1 }}>
            <span className="eyebrow">Entity Detail</span>
            {selected ? (
              <div style={{ marginTop: 10 }}>
                <div className="mono" style={{ fontSize: 13, color: TYPE_COLORS[selected.type], marginBottom: 4 }}>
                  {selected.type}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{selected.label}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{selected.id}</div>
                {selected.source_doc && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Source: {selected.source_doc}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10 }}>Click a node to inspect it.</p>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function PageContainer({ children }) {
  return (
    <div>
      <PageHeader
        eyebrow="Knowledge Graph"
        title="Knowledge Graph Explorer"
        description="Every entity extracted from every document, linked by relationship. This is what makes multi-hop reasoning possible."
      />
      {children}
    </div>
  );
}

// I lay nodes out in a simple circle with slight jitter per id.
function layoutNodes(nodes, edges) {
  const positions = {};
  const cx = 400, cy = 280, radius = 200;
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
    const jitter = (n.id.charCodeAt(0) % 40) - 20;
    positions[n.id] = {
      x: cx + Math.cos(angle) * (radius + jitter),
      y: cy + Math.sin(angle) * (radius + jitter),
    };
  });
  return positions;
}
