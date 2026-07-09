# Sample Data

A corpus of plant records spanning roughly 18 months (early 2025 through
mid-2026) across four zones and six pieces of equipment, with a consistent
set of personnel and equipment IDs throughout so the knowledge graph forms
real, connected relationships rather than isolated mentions.

## Equipment and zones

| Equipment | Zone |
|---|---|
| Compressor B-12 | Zone C |
| Pump P-204 | Zone A |
| Heat Exchanger HE-33 | Zone A |
| Valve V-88 | Zone B |
| Storage Tank ST-7 | Zone B |
| Turbine T-15 | Zone D |

## Personnel

R. Sharma and P. Verma (maintenance engineers, Zone C), D. Patel
(maintenance engineer, Zone A), N. Rao (shift lead, Zone B), V. Menon
(safety officer, plant-wide), A. Nair (entry supervisor), K. Reddy (fire
watch), S. Iyer (shift supervisor).

## Recurring patterns (for testing RCA and Lessons Learned)

- **Valve V-88 seal seepage** — recurs three times (Mar 2025, Nov 2025, Apr
  2026) at the same seal interface. The second report explicitly notes it
  as a pattern; a proper RCA or pattern scan should surface this as
  systemic rather than isolated.
- **Compressor B-12 sensor fluctuation correlated with permit overlap** —
  the original pattern, recurring across three inspections.
- **Turbine T-15 startup vibration** — recurs twice (Sep 2025, Feb 2026)
  with the second entry recommending an engineering review rather than
  continued monitoring.
- **Heat Exchanger HE-33 fouling** — progresses faster than the standard
  cleaning interval, surfacing in both a maintenance log and a separate
  incident report.

## Compliance gaps (for testing Compliance Watch)

- **Zone C, Jan 2026**: hot work and confined space permits overlap with
  no documented cross-check (original example).
- **Zone B, Oct 2025**: same pattern, different zone and date — hot work
  and confined space permits overlap with no cross-check performed.
- **Zone A, May 2025**: a clean pair, cross-check performed correctly, for
  contrast.

## Upload order and doc types

| File | doc_type |
|---|---|
| `regulatory_reference_summary.txt` | regulation |
| All `hot_work_permit_*.txt`, `confined_space_permit_*.txt`, `electrical_isolation_permit_*.txt` | permit |
| All `maintenance_log_*.txt` | maintenance_log |
| All `incident_report_*.txt`, `near_miss_report_*.txt` | incident_report |
| `sample_whatsapp_thread*.txt` | use the thread mining input box, not file upload |

For a broader test, I've also added excerpts from the Factories Act, 1948
and OISD standards, both publicly available.
