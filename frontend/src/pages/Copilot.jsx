import { useState, useRef, useEffect } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, ConfidenceBar, EscalationBadge, CitationList, Spinner, ErrorBanner, EmptyState } from '../components/ui';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
];

export default function Copilot() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleAsk() {
    if (!question.trim()) return;
    const q = question;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true); setError(null);
    try {
      const res = await api.askCopilot(q, language);
      setMessages((m) => [...m, { role: 'assistant', data: res }]);
    } catch (e) {
      if (isBackendError(e)) setError(e);
      setMessages((m) => [...m, { role: 'error', content: 'Could not get a response.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 46px - 48px)' }}>
      <PageHeader
        eyebrow="Expert Knowledge Copilot"
        title="Ask anything across the plant's knowledge base"
        description="Hybrid retrieval — vector search over documents combined with knowledge-graph traversal — so multi-hop questions get real answers, not just keyword matches."
      />
      <ErrorBanner error={error} />

      <div className="bracket-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {messages.length === 0 && (
            <EmptyState
              eyebrow="No queries yet"
              title="Try a benchmark question"
              description='e.g. "Was there any overlap between hot work and confined space permits near Compressor B-12 in January?"'
            />
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}
          <div ref={scrollRef} />
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 14, display: 'flex', gap: 8 }}>
          <select className="select" style={{ width: 140, flexShrink: 0 }} value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <input
            className="input"
            placeholder="Ask a question about the plant's documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button className="btn btn-primary" onClick={handleAsk} disabled={loading || !question.trim()}>Ask</button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <div style={{ background: 'var(--panel-raised)', borderRadius: '10px 10px 2px 10px', padding: '10px 14px', maxWidth: '75%', fontSize: 13 }}>
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === 'error') {
    return <div style={{ color: 'var(--signal-red)', fontSize: 13, marginBottom: 14 }}>{message.content}</div>;
  }
  const d = message.data;
  return (
    <div style={{ marginBottom: 20, maxWidth: '90%' }}>
      <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '10px 10px 10px 2px', padding: '14px 16px' }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 12 }}>{d.answer}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <ConfidenceBar value={d.confidence} />
          <EscalationBadge escalated={d.escalated_for_review} />
          {d.reasoning_hops > 0 && (
            <span className="pill pill-blue">{d.reasoning_hops} REASONING HOP{d.reasoning_hops > 1 ? 'S' : ''}</span>
          )}
        </div>
        <CitationList citations={d.citations} />
      </div>
    </div>
  );
}
