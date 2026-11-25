# Attachment names in operational views

User request 2026-11-25: Leader must see the specific tractor attachment,
not only its inventory code. Migration 0028 extends the existing shared
machine-usage projection with attachmentDetails (ID, code, catalogue name).
Existing attachment codes/IDs and historical associations remain unchanged;
inactive attachments remain readable. No role/access/state changes.

The common formatter displays `Name (code)` in project activity, daily machine
rosters, work history, approval details, daily reports and PDF. Search text
includes names and codes. Older payloads without details still render codes.
PDF escapes the complete label using the existing HTML escaping function.

Validation: contracts compilation, API/web TypeScript, API/Vite production
builds passed. Isolated PostgreSQL 16 project `zenops-attachment-check`: all
72 tests passed, none skipped. The project activity regression now checks
attachment identities/names on multiple usages, matching daily/project rosters
and name/code labels in generated PDF HTML, alongside existing role scoping.

Deploy through existing GitHub automation with migration 0028 and matching
API/contracts/web images; verify runtime hashes, migration and health. No
catalogue data changes, no Caddy changes and no test production work records.
