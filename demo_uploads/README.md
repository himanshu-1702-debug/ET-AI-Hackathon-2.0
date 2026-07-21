# Demo Upload Files

Three files I keep separate from the main sample set, specifically for live
demonstration once the app is already running with the seeded data loaded.

## 1. `confined_space_permit_grinding_hopper_feb2026.pdf`
Upload as doc_type `permit`. This overlaps with the already-seeded Grinding
Department hot work permit (HWP-2026-0027), with no cross-check performed.
Running a Compliance check on "Grinding Department" right after uploading
this surfaces the gap live.

## 2. `near_miss_combustible_dust_grinding_jul2026.pdf`
Upload as doc_type `incident_report`. This is a third occurrence of the
recurring combustible dust accumulation pattern already present in the
seeded data. Running RCA or a Lessons Learned scan on "UPZ Line" or
"Grinding Department" right after uploading this shows the systemic pattern
spanning all three occurrences, including the one just added.

## 3. `grinding_department_layout.png`
Upload with doc_type set to `pid_drawing`. This is an original shopfloor
layout diagram covering the Grinding Department, read directly by the
vision-based ingestion path rather than the text pipeline.

## Suggested order

Upload 3 first (shows the vision path distinctly from text/PDF parsing),
then 1, then run a Compliance check on the Grinding Department immediately
after. Then upload 2 and run RCA or a Lessons Learned scan immediately
after.
