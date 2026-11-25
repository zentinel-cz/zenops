# ADR-020: Morning and night shifts only

Status: Accepted — explicit user correction 2026-11-25

Supersedes the AFTERNOON selection and three-preset parts of ADR-019.
Only MORNING and NIGHT may be created, selected for restoration or configured
by Admin. Settings reads return exactly these two presets and writes validate
exactly one of each. Worker selection and Admin settings show only these two.
Existing MORNING/NIGHT settings keep their values.

Any historical AFTERNOON days, audit references and stored preset are retained
without rewriting or deletion, but are not available for new selection. The
legacy display label remains for historical reports. The existing database
constraint remains permissive to preserve historical rows; backend input
validation rejects AFTERNOON for creation, restoration and settings writes.
No new migration is necessary and applied migration 0026 is unchanged.
