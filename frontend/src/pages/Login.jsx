import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import loginBg from '../assets/login-bg.jpg';

const DEMO_ACCOUNTS = [
  { username: 'maintenance.lead', role: 'Maintenance Lead' },
  { username: 'compliance.officer', role: 'Compliance Officer' },
  { username: 'safety.officer', role: 'Safety Officer' },
  { username: 'plant.manager', role: 'Plant Manager' },
];

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.detail || 'Login failed.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', inset: -40,
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px)',
          transform: 'scale(1.05)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 15, 28, 0.55)' }} />

      <div style={{
        position: 'relative', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div className="bracket-panel" style={{ width: 380, background: 'rgba(16, 25, 46, 0.9)', backdropFilter: 'blur(4px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="dot dot-amber pulse" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>PLANT BRAIN</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 24 }}>
            INDUSTRIAL KNOWLEDGE OS · SIGN IN
          </div>

          <form onSubmit={handleSubmit}>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. compliance.officer" autoFocus />
            <div style={{ height: 12 }} />
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ height: 16 }} />
            {error && (
              <div style={{ color: 'var(--signal-red)', fontSize: 12.5, marginBottom: 12 }}>{error}</div>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !username || !password}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="divider" />
          <span className="label">Demo accounts (password: demo123)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                onClick={() => { setUsername(acc.username); setPassword('demo123'); }}
                className="btn"
                style={{ justifyContent: 'space-between', fontSize: 12, padding: '6px 10px' }}
              >
                <span className="mono">{acc.username}</span>
                <span style={{ color: 'var(--text-faint)' }}>{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
