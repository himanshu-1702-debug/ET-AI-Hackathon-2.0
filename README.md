# Plant Brain

An AI-powered knowledge platform for industrial plants. It brings together
documents, permits, maintenance logs, and informal communication into a
single searchable knowledge layer, with compliance gap detection, root
cause analysis, and proactive pattern discovery on top.

## What it does

- Ingests documents, engineering drawings, and informal chat threads, and
  builds a knowledge graph automatically as it processes them.
- Answers questions across the full document set with citations and a
  confidence score, using both semantic search and graph traversal.
- Flags compliance gaps between documents and generates audit-ready
  evidence packages.
- Traces equipment failures back through related incidents and maintenance
  records to support root cause analysis.
- Scans the full document history for recurring patterns that wouldn't be
  visible from any single report.
- Routes findings to the right role automatically.
- Captures undocumented knowledge from experienced staff through a guided
  interview, with voice input as an alternative to typing.
- Supports Hindi, Marathi, and Tamil alongside English.
- Provides a mobile-friendly, WhatsApp-style access point for field staff,
  alongside the full dashboard for desk-based roles.
- Keeps every conversation saved permanently per account, so nothing is
  lost between sessions.
- Logs every AI action with its sources and confidence for auditability.

## Stack

Python and FastAPI on the backend, with a knowledge graph and vector store
running locally. React and Vite on the frontend, with a custom design
system rather than a component library. Claude powers the language
understanding.

## Structure

- `backend/` — API and processing pipeline
- `frontend/` — the web dashboard and field-access interface
- `sample_data/` — sample documents for testing
- `docs/` — API reference and operations notes

See `instructions.md` for setup steps.
