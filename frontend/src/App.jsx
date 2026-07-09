import { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Ingestion from './pages/Ingestion';
import Copilot from './pages/Copilot';
import KnowledgeGraph from './pages/KnowledgeGraph';
import Compliance from './pages/Compliance';
import RCA from './pages/RCA';
import LessonsLearned from './pages/LessonsLearned';
import Routing from './pages/Routing';
import Onboarding from './pages/Onboarding';
import TacitCapture from './pages/TacitCapture';
import AuditTrail from './pages/AuditTrail';
import Observability from './pages/Observability';
import FieldAccess from './pages/FieldAccess';

const PAGES = {
  overview: Overview,
  ingestion: Ingestion,
  copilot: Copilot,
  graph: KnowledgeGraph,
  compliance: Compliance,
  rca: RCA,
  lessons: LessonsLearned,
  routing: Routing,
  onboarding: Onboarding,
  tacit: TacitCapture,
  audit: AuditTrail,
  observability: Observability,
  field: FieldAccess,
};

export default function App() {
  const { user } = useAuth();
  const [active, setActive] = useState('overview');
  const ActivePage = PAGES[active] || Overview;

  if (!user) return <Login />;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active={active} onNavigate={setActive} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <StatusBar />
        <main style={{ padding: '28px 32px', flex: 1 }}>
          <ActivePage onNavigate={setActive} />
        </main>
      </div>
    </div>
  );
}
