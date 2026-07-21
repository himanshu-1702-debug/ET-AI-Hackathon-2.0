import { useEffect, useRef, useState, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { api } from '../lib/api';
import { PageHeader, EmptyState } from '../components/ui';

const TYPE_COLORS = {
  equipment: '#4F9CF9', regulation: '#F0A828', incident: '#E5555A',
  personnel: '#3ECF8E', procedure: '#B98CFF', location: '#5B6685', unknown: '#8B96AC',
};

const WIDTH = 900;
const HEIGHT = 620;

export default function KnowledgeGraph() {
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState('');
  const [visibleTypes, setVisibleTypes] = useState(new Set(Object.keys(TYPE_COLORS)));
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    api.getGraphSummary().then((data) => {
      setSummary(data);
      const nodes = data.nodes.map((n) => ({ ...n }));
      const links = data.edges.map((e) => ({ source: e.source, target: e.target, relation: e.relation }));
      nodesRef.current = nodes;
      linksRef.current = links;

      const sim = forceSimulation(nodes)
        .force('link', forceLink(links).id((d) => d.id).distance(70).strength(0.4))
        .force('charge', forceManyBody().strength(-160))
        .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
        .force('collide', forceCollide().radius(26))
        .on('tick', () => forceRender((n) => n + 1));

      simRef.current = sim;
    }).catch(() => {});

    return () => simRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svgEl = select(svgRef.current);
    const zoomBehavior = zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        select(gRef.current).attr('transform', event.transform);
      });
    svgEl.call(zoomBehavior);
    svgEl.call(zoomBehavior.transform, zoomIdentity);
    return () => svgEl.on('.zoom', null);
  }, [summary]);

  const dragNode = useCallback((node) => {
    return drag()
      .on('start', (event) => {
        if (!event.active) simRef.current?.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) simRef.current?.alphaTarget(0);
        node.fx = null;
        node.fy = null;
      });
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

  const nodes = nodesRef.current;
  const links = linksRef.current;
  const searchLower = search.trim().toLowerCase();

  function nodeMatchesSearch(n) {
    if (!searchLower) return true;
    return (n.label || '').toLowerCase().includes(searchLower) || n.id.toLowerCase().includes(searchLower);
  }

  function nodeVisible(n) {
    return visibleTypes.has(n.type || 'unknown') && nodeMatchesSearch(n);
  }

  function toggleType(t) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  const activeNode = selected || hovered;

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="bracket-panel" style={{ flex: 1, height: HEIGHT + 20, overflow: 'hidden', padding: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', gap: 6 }}>
            <input
              className="input"
              placeholder="Search entities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220, fontSize: 12, padding: '6px 10px' }}
            />
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, fontSize: 10.5, color: 'var(--text-faint)' }} className="mono">
            scroll to zoom · drag to pan · drag a node to reposition
          </div>
          <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: '100%', cursor: 'grab' }}>
            <g ref={gRef}>
              {links.map((l, i) => {
                const s = typeof l.source === 'object' ? l.source : nodes.find((n) => n.id === l.source);
                const t = typeof l.target === 'object' ? l.target : nodes.find((n) => n.id === l.target);
                if (!s || !t || s.x == null || t.x == null) return null;
                if (!nodeVisible(s) || !nodeVisible(t)) return null;
                const dimmed = activeNode && s.id !== activeNode.id && t.id !== activeNode.id;
                return (
                  <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="var(--line-bright)" strokeWidth={1} opacity={dimmed ? 0.08 : 0.45} />
                );
              })}
              {nodes.map((n) => {
                if (n.x == null) return null;
                if (!nodeVisible(n)) return null;
                const color = TYPE_COLORS[n.type] || TYPE_COLORS.unknown;
                const isActive = activeNode?.id === n.id;
                const dimmed = activeNode && !isActive;
                const showLabel = isActive || (!activeNode && nodes.length <= 15);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    onClick={() => setSelected(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1 }}
                    ref={(el) => { if (el) select(el).call(dragNode(n)); }}
                  >
                    <circle r={isActive ? 11 : 7} fill={color}
                      stroke={isActive ? '#fff' : 'none'} strokeWidth={1.5} />
                    {showLabel && (
                      <text x={13} y={4} fontSize={10} fill="var(--text-primary)" fontFamily="IBM Plex Mono"
                        style={{ paintOrder: 'stroke', stroke: 'var(--ink)', strokeWidth: 3 }}>
                        {(n.label || n.id).slice(0, 28)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="bracket-panel">
            <span className="eyebrow">Filter by type</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={visibleTypes.has(type)} onChange={() => toggleType(type)} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                  <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>
                    {summary.type_counts[type] || 0}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bracket-panel" style={{ flex: 1 }}>
            <span className="eyebrow">Entity Detail</span>
            {activeNode ? (
              <div style={{ marginTop: 10 }}>
                <div className="mono" style={{ fontSize: 13, color: TYPE_COLORS[activeNode.type], marginBottom: 4 }}>
                  {activeNode.type}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{activeNode.label}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{activeNode.id}</div>
                {activeNode.source_doc && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Source: {activeNode.source_doc}
                  </div>
                )}
                {selected && (
                  <button className="btn" style={{ marginTop: 12, fontSize: 11 }} onClick={() => setSelected(null)}>
                    Clear selection
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10 }}>
                Hover or click a node to inspect it. With this many entities, labels only show for the node you're focused on — use search or filters to narrow things down.
              </p>
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
