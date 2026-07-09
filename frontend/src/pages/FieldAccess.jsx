import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui';

export default function FieldAccess() {
  const [messages, setMessages] = useState([
    { role: 'them', content: "Hi! I'm the Plant Brain assistant. Ask me anything about equipment, permits, or procedures.", time: '09:00' },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.whatsappStatus().then((r) => setTwilioConfigured(r.configured)).catch(() => setTwilioConfigured(false));
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { role: 'me', content: text, time: now }]);
    const q = text;
    setText('');
    setLoading(true);
    try {
      const res = await api.askCopilot(q, 'en');
      setMessages((m) => [...m, { role: 'them', content: res.answer, time: now, confidence: res.confidence }]);
    } catch {
      setMessages((m) => [...m, { role: 'them', content: "Sorry, I couldn't reach the knowledge base right now.", time: now }]);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Field Access · Mobile-First Delivery Channel"
        title="WhatsApp-Style Interface for Floor Workers"
        description="Field technicians are phone-only, not desk-based. This interface is wired to the exact same live backend as the desk dashboard — same intelligence, zero-install access."
      />

      {twilioConfigured !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <span className={`pill ${twilioConfigured ? 'pill-green' : 'pill-blue'}`}>
            <span className={`dot ${twilioConfigured ? 'dot-green' : 'dot-amber'}`} />
            {twilioConfigured ? 'REAL WHATSAPP CONNECTED VIA TWILIO' : 'SIMULATED MODE'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 380, height: 680, background: '#0B141A', borderRadius: 24, border: '8px solid #1a1a1a',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ background: '#1F2C34', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--signal-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏭</div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Plant Brain Assistant</div>
              <div style={{ color: '#8FA3AA', fontSize: 11 }}>{loading ? 'typing…' : 'online'}</div>
            </div>
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            backgroundImage: 'radial-gradient(circle, #1a2329 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundColor: '#0B141A',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '78%', padding: '7px 10px', borderRadius: 8, fontSize: 13, lineHeight: 1.4,
                  background: m.role === 'me' ? '#005C4B' : '#1F2C34', color: '#E9EDF1',
                  borderTopRightRadius: m.role === 'me' ? 2 : 8, borderTopLeftRadius: m.role === 'them' ? 2 : 8,
                }}>
                  {m.content}
                  <div style={{ fontSize: 10, color: '#8FA3AA', textAlign: 'right', marginTop: 4 }}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div style={{ background: '#1F2C34', padding: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message"
              style={{ flex: 1, background: '#2A3942', border: 'none', borderRadius: 20, padding: '10px 14px', color: '#fff', fontSize: 13 }}
            />
            <button onClick={handleSend} disabled={loading} style={{
              width: 38, height: 38, borderRadius: '50%', background: '#00A884', border: 'none',
              color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>➤</button>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 16, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        {twilioConfigured
          ? 'This screen is a UI preview. Real WhatsApp messages sent to your Twilio number are answered by the same backend independently of this screen — try messaging it directly from a phone.'
          : 'This is a WhatsApp-style preview connected to the same Copilot backend as the dashboard.'}
      </p>
    </div>
  );
}
