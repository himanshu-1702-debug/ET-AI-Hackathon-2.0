import { useState, useEffect } from 'react';
import { api, isBackendError } from '../lib/api';
import { useSpeechToText } from '../lib/useSpeechToText';
import { PageHeader, Spinner, ErrorBanner, MicButton } from '../components/ui';

export default function TacitCapture() {
  const [area, setArea] = useState('');
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState([]);
  const [reply, setReply] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [finalized, setFinalized] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { listening, supported, start, stop } = useSpeechToText((transcript) => {
    setReply((prev) => (prev ? prev + ' ' + transcript : transcript));
  });

  useEffect(() => {
    api.getConversation('tacit_capture').then((res) => {
      const saved = res.messages || [];
      if (saved.length > 0) {
        setStarted(true);
        setHistory(saved.map((m) => ({ role: m.role, content: m.content })));
        const last = saved[saved.length - 1];
        setIsFinal(!!last.data?.is_final);
        if (saved[0]?.data?.expertise_area) setArea(saved[0].data.expertise_area);
      }
    }).catch(() => {});
  }, []);

  async function persist(role, content, data = null) {
    try { await api.appendConversationMessage('tacit_capture', { role, content, data }); } catch { /* best effort */ }
  }

  async function handleStart() {
    if (!area.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await api.tacitNextQuestion(area, []);
      setHistory([{ role: 'assistant', content: res.message }]);
      setIsFinal(res.is_final);
      setStarted(true);
      persist('assistant', res.message, { expertise_area: area, is_final: res.is_final });
    } catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Could not start interview.' }); }
    finally { setLoading(false); }
  }

  async function handleReply() {
    if (!reply.trim()) return;
    const newHistory = [...history, { role: 'user', content: reply }];
    setHistory(newHistory);
    persist('user', reply);
    setReply('');
    setLoading(true); setError(null);
    try {
      const res = await api.tacitNextQuestion(area, newHistory);
      setHistory([...newHistory, { role: 'assistant', content: res.message }]);
      setIsFinal(res.is_final);
      persist('assistant', res.message, { expertise_area: area, is_final: res.is_final });
    } catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Could not continue interview.' }); }
    finally { setLoading(false); }
  }

  async function handleFinalize() {
    setLoading(true); setError(null);
    try { setFinalized(await api.tacitFinalize(area, history)); }
    catch (e) { isBackendError(e) ? setError(e) : setError({ detail: 'Could not finalize.' }); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Tacit Knowledge Capture"
        title="Interview a Retiring Expert"
        description="A guided conversation that surfaces undocumented knowledge — common mistakes, early warning signs, workarounds — and structures it into the knowledge graph."
      />
      <ErrorBanner error={error} />

      {!started ? (
        <div className="bracket-panel">
          <label className="label">Area of expertise</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Grinding department operations, Storage handling" />
            <button className="btn btn-primary" onClick={handleStart} disabled={loading || !area.trim()}>
              {loading ? 'Starting…' : 'Start Interview'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bracket-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {history.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  background: m.role === 'user' ? 'var(--panel-raised)' : 'var(--ink)',
                  border: m.role === 'assistant' ? '1px solid var(--line)' : 'none',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          {loading && <Spinner />}

          {!isFinal && !loading && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="Type or speak the expert's answer..." onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
              <MicButton listening={listening} supported={supported} onStart={start} onStop={stop} />
              <button className="btn btn-primary" onClick={handleReply} disabled={!reply.trim()}>Send</button>
            </div>
          )}

          {isFinal && !finalized && !loading && (
            <button className="btn btn-primary" onClick={handleFinalize}>Structure & Save Knowledge</button>
          )}

          {finalized && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <span className="eyebrow">Captured & structured into knowledge graph</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {finalized.captured_knowledge.map((k, i) => (
                  <div key={i} className="citation-card">
                    <span className="pill pill-green" style={{ marginBottom: 6 }}>{k.category}</span>
                    <div style={{ marginTop: 6 }}>{k.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
