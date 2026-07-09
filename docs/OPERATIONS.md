# Operations Notes

## Health check

`GET /api/status` shows whether the AI engine is connected and how large the
knowledge graph and vector store are. `GET /api/system/observability`
(plant manager login) shows job queue health and any failed jobs.

## Common issues

**AI engine offline** — usually a missing or invalid API key in
`backend/.env`, or exhausted billing credit. Restart the backend after any
`.env` change.

**Upload stuck on queued or processing** — check `GET /api/jobs/{job_id}`.
Large files take longer; if a job stays running far past its expected time,
check the backend terminal output.

**A job shows failed** — check `GET /api/jobs/dlq/all` for the error, then
retry it with `POST /api/jobs/{job_id}/replay` rather than re-uploading.

**403 errors in the UI** — the signed-in role doesn't have permission for
that action. This is expected; sign in with a role that has it.

**Copilot answers "I don't know"** — expected behavior when the knowledge
base doesn't contain relevant information, rather than guessing.

## Resetting for a clean run

`POST /api/system/reset` (plant manager login), or the reset button in the
top status bar. Clears the knowledge graph, vector store, routed findings,
and audit log. Re-upload documents afterward.

## Sample test queries

I use these to sanity-check the copilot after loading the sample documents:

- What was the LEL reading at the time of entry for the confined space permit in Zone C?
- Was there any overlap between hot work and confined space permits near Compressor B-12 in January?
- Has the gas pressure sensor issue on Compressor B-12 happened more than once?
- What is the maintenance history of Turbine A-45? (this one should come back
  as "no information found" rather than a fabricated answer)
