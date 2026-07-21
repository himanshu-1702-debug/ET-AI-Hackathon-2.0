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

- Has the rack storage system in the Storage Department had structural issues more than once?
- Was there any overlap between hot work and confined space permits in the Grinding Department in February 2026?
- Has the bird exposure issue near the Grinding Department happened more than once?
- Is there a recurring dust accumulation problem at the UPZ Line feed point?
- What is the maintenance history of Roaster Unit 2? (this one should
  come back as "no information found" rather than a fabricated answer,
  since only Roaster Unit 1 exists in the sample data)


