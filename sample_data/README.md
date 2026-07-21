# Sample Data

A corpus of plant records spanning roughly a year (April 2025 through July
2026) across the four core departments of a spice processing and packaging
plant, with a consistent set of personnel and equipment names throughout so
the knowledge graph forms real, connected relationships rather than
isolated mentions.

## Departments and equipment

| Department | Equipment / Areas |
|---|---|
| Storage | Rack Storage System, Unloading Bay 2, Hing storage silo |
| Processing | Roaster Unit 1, Ghan Preparation Station |
| Grinding | Salt Grinding Line, CW Grinding Line, New/Old Lithotech Grinders, UPZ Line, shared Goods Lift |
| Packaging | Sprinkler Packing Line 4 |

## Personnel

S. Krishnan (Storage Shift Supervisor), M. Reddy (Grinding Section
Engineer), P. Joshi (Packaging Line Supervisor), V. Nair (Quality Control
Manager), K. Verma (Maintenance Engineer), A. Deshmukh (Plant Safety
Officer), R. Pillai (Storage Operator), T. Menon (Grinding Operator).

## Recurring patterns (for testing RCA and Lessons Learned)

- **Rack beam deformation, Storage Department** — recurs across April 2025
  and December 2025 inspections at the same racking section, with an
  informal floor-stacking workaround masking rather than resolving it.
- **Bird/pigeon exposure, Grinding Department** — recurs in May 2025 and
  January 2026, with the second occurrence involving direct material
  contact rather than just proximity.
- **Combustible dust accumulation, UPZ Line feed point** — recurs in June
  2025 and March 2026, with the second occurrence noting a nearby ignition
  source. A third occurrence (July 2026) is included as a live demo upload
  file rather than seeded here — see `demo_uploads/README.md`.

## Compliance gaps (for testing Compliance Watch)

- **Storage Department, September 2025**: a clean permit pair — hot work
  and confined space entry with a properly performed cross-check, included
  for contrast.
- **Grinding Department, February 2026**: only the hot work permit is
  seeded here. Its overlapping confined space permit is a live demo upload
  file, so the compliance gap is only discoverable once both are ingested
  — see `demo_uploads/README.md`.

## Upload order and doc types

| File | doc_type |
|---|---|
| `regulatory_reference_summary.txt` | regulation |
| All `hot_work_permit_*.txt`, `confined_space_permit_*.txt`, `electrical_isolation_permit_*.txt` | permit |
| All `maintenance_log_*.txt` | maintenance_log |
| All `near_miss_*.txt`, `incident_*.txt` | incident_report |
| `sample_whatsapp_thread_*.txt` | use the thread mining input box, not file upload |

These are composite, fictional records written for testing and demonstration purposes.
