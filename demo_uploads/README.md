# Demo Upload Files

Three files I keep separate from the main sample set, specifically for live
demonstration once the app is already running with the seeded data loaded.

## 1. `confined_space_permit_zoneD_sep2025.pdf`
Upload as doc_type `permit`. This overlaps with an already-seeded Zone D hot
work permit with no cross-check performed. Running a Compliance check on
"Zone D" right after uploading this surfaces the gap live.

## 2. `maintenance_log_valve_v88_jul2026.pdf`
Upload as doc_type `maintenance_log`. This is a fourth occurrence of the
recurring Valve V-88 seal seepage pattern already present in the seeded
data. Running RCA on "Valve V-88" right after uploading this shows the
systemic pattern spanning all four entries, including the one just added.

## 3. `pid_zone_c_compressor_train.png`
Upload with doc_type set to `pid_drawing`. This is an original piping
schematic I put together for Zone C, read directly by the vision-based
ingestion path rather than the text pipeline.

## Suggested order

Upload 3 first (shows the vision path distinctly from text/PDF parsing),
then 1, then run a Compliance check on Zone D immediately after. Then
upload 2 and run RCA on Valve V-88 immediately after.
