# API Reference

Base URL (local): `http://localhost:8000/api`

All endpoints return JSON unless noted otherwise. POST endpoints expect
`Content-Type: application/json` except file upload, which uses
multipart/form-data. Interactive docs are also available at
`http://localhost:8000/docs` once the server is running.

## Auth

`POST /auth/login` — body `{ username, password }`, returns a bearer token.
`GET /auth/me` — returns the current user from the token.

Most endpoints below require `Authorization: Bearer <token>`.

## System

`GET /status` — whether the AI engine is connected, plus knowledge graph and
vector store size.

`GET /system/observability` — job queue health, SLA breach rate, dead letter
queue. Restricted to the plant manager role.

`POST /system/reset` — clears the knowledge graph, vector store, routed
findings, and audit log. Restricted to the plant manager role.

## Documents

`POST /documents/upload` — multipart form with `file` and `doc_type`. Returns
a `job_id` immediately; poll `GET /jobs/{job_id}` for status and result.

`POST /documents/ingest-thread` — body `{ text, source_label }`, extracts
knowledge from an informal chat/email thread.

## Jobs

`GET /jobs/{job_id}` — status of a background job.
`GET /jobs` — list recent jobs, optional `?status=` filter.
`GET /jobs/dlq/all` — failed jobs and SLA summary.
`POST /jobs/{job_id}/replay` — re-run a failed job with its original input.

## Copilot

`POST /copilot/query` — body `{ question, language, max_hops }`. Returns an
answer with citations, a confidence score, and whether it was escalated for
review.

## Onboarding

`POST /onboarding/generate-path` — body `{ role, area }`.

## Compliance

`POST /compliance/check` — body `{ scope_query }`.
`POST /compliance/evidence-package` — body `{ scope }`.

## Root Cause Analysis

`POST /rca/analyze` — body `{ equipment_query }`.

## Pattern Mining

`POST /lessons-learned/scan` — body `{ focus_area }` (empty string scans
broadly).

## Findings Routing

`GET /routing/inbox/{role}` — findings routed to a role.
`GET /routing/all` — all routed findings.
`POST /routing/acknowledge` — body `{ finding_id }`.

## Tacit Knowledge Capture

`POST /tacit-capture/next-question` — body `{ expertise_area, conversation_history }`.
`POST /tacit-capture/finalize` — same body shape, once the interview is done.

## Audit Trail

`GET /audit/recent` — optional `?limit=` and `?feature=` filters.

## WhatsApp

`GET /whatsapp/status` — whether a real WhatsApp connection is configured.
`POST /whatsapp/webhook` — receives inbound WhatsApp messages, replies with TwiML.

## Knowledge Graph

`GET /graph/summary` — all nodes, edges, and type counts.
`GET /graph/entity/{entity_id}` — one entity and its neighborhood.
`GET /graph/search` — `?q=` search by label.
