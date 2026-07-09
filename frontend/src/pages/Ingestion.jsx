import { useState, useRef } from 'react';
import { api, isBackendError } from '../lib/api';
import { PageHeader, Spinner, ErrorBanner } from '../components/ui';

const DOC_TYPES = [
  { value: 'maintenance_log', label: 'Maintenance Log' },
  { value: 'permit', label: 'Permit (Hot Work / Confined Space)' },
  { value: 'regulation', label: 'Regulatory Reference' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'procedure', label: 'Safety Procedure' },
  { value: 'pid_drawing', label: 'P&ID / Engineering Drawing (image)' },
  { value: 'other', label: 'Other' },
];

export default function Ingestion() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('maintenance_log');
  const [threadText, setThreadText] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState(null); // 'queued' | 'running' | 'success' | 'failed'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  function pollJob(jobId, onDone) {
    setJobStatus('queued');
    pollRef.current = setInterval(async () => {
      try {
        const job = await api.getJobStatus(jobId);
        setJobStatus(job.status);
        if (job.status === 'success') {
          clearInterval(pollRef.current);
          setLoading(false);
          onDone(job.result);
        } else if (job.status === 'failed') {
          clearInterval(pollRef.current);
          setLoading(false);
          setError({ detail: `Processing failed: ${job.error}. This job is now in the Dead Letter Queue and can be replayed from the Observability screen.` });
        }
      } catch {
        clearInterval(pollRef.current);
        setLoading(false);
      }
    }, 1500);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setError(null); setResult(null); setJobStatus(null);
    try {
      const queued = await api.uploadDocument(file, docType);
      pollJob(queued.job_id, (jobResult) => setResult({ kind: 'document', data: jobResult }));
    } catch (e) {
      isBackendError(e) ? setError(e) : setError({ detail: 'Upload failed.' });
      setLoading(false);
    }
  }

  async function handleThreadMine() {
    if (!threadText.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.ingestThread(threadText);
      setResult({ kind: 'thread', data: res });
    } catch (e) {
      isBackendError(e) ? setError(e) : setError({ detail: 'Thread mining failed.' });
    } finally { setLoading(false); }
  }

  const jobStatusLabel = {
    queued: 'Queued — waiting for a worker slot…',
    running: 'Processing — extracting entities and building relationships…',
  }[jobStatus];

  return (
    <div>
      <PageHeader
        eyebrow="Capture & Ingestion"
        title="Bring in documents, drawings & informal knowledge"
        description="Every upload is chunked, entity-extracted, and written into the shared knowledge graph automatically."
      />
      <ErrorBanner error={error} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="bracket-panel">
          <span className="eyebrow">Documents & Drawings</span>
          <h3 style={{ fontSize: 15, margin: '8px 0 14px' }}>Upload a document or drawing</h3>
          <label className="label">Document type</label>
          <select className="select" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ height: 10 }} />
          <label className="label">File (.txt, .pdf, or .png/.jpg for drawings)</label>
          <input
            type="file"
            className="input"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ padding: 8 }}
          />
          <div style={{ height: 14 }} />
          <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Processing…' : 'Ingest Document'}
          </button>
          {docType === 'pid_drawing' && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 10 }}>
              Uses vision-based reading of the drawing. Works best on clear, legible diagrams.
            </p>
          )}
        </div>

        <div className="bracket-panel">
          <span className="eyebrow">Informal Threads</span>
          <h3 style={{ fontSize: 15, margin: '8px 0 14px' }}>Mine an informal thread</h3>
          <label className="label">Paste WhatsApp / email thread text</label>
          <textarea
            className="textarea"
            value={threadText}
            onChange={(e) => setThreadText(e.target.value)}
            placeholder="R. Sharma: anyone else notice the B-12 sensor doing that flutter thing again?..."
          />
          <div style={{ height: 14 }} />
          <button className="btn btn-primary" onClick={handleThreadMine} disabled={!threadText.trim() || loading}>
            {loading ? 'Mining…' : 'Extract Knowledge'}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 20 }}>
          <Spinner />
          {jobStatusLabel && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{jobStatusLabel}</div>}
        </div>
      )}

      {result && (
        <div className="bracket-panel" style={{ marginTop: 20 }}>
          <span className="eyebrow">Extraction Result</span>
          {result.kind === 'document' ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                <Metric label="Entities found" value={result.data.entities_found} />
                <Metric label="Relationships found" value={result.data.relationships_found} />
                <Metric label="Chunks indexed" value={result.data.chunk_count} />
              </div>
              <EntityList entities={result.data.entities} />
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <Metric label="Knowledge items extracted" value={result.data.knowledge_items?.length || 0} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {(result.data.knowledge_items || []).map((k, i) => (
                  <div key={i} className="citation-card">
                    <span className="pill pill-blue" style={{ marginBottom: 6 }}>{k.type}</span>
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

function Metric({ label, value }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 20, color: 'var(--signal-amber)', fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{label}</div>
    </div>
  );
}

function EntityList({ entities }) {
  if (!entities || entities.length === 0) return null;
  return (
    <div>
      <span className="label">Extracted entities</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entities.map((e, i) => (
          <span key={i} className="pill pill-muted mono">{e.type}: {e.label}</span>
        ))}
      </div>
    </div>
  );
}
