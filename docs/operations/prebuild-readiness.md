# Pre-build Readiness

Prepared on 2026-09-24 for the planned implementation start on 2026-09-25.

## Ready

- Authoritative GitHub repository and `main` branch verified.
- Full specification and all accepted ADRs reviewed.
- Legacy Obsidian/memory notes reviewed and classified as historical.
- Production DNS for `zenops.zentinel.cz` resolves to the host.
- Existing Caddy route identified; no Caddy change is required before an app
  service exists.
- Isolated PostgreSQL 16 Compose service defined with no published DB port.
- Persistent V1 volume is distinct from the preserved legacy volume.
- Database password is stored outside Git as a Docker secret source.
- Database backup and legacy data remain available outside the new repository.

## Intentionally not started

- No frontend or backend application skeleton.
- No application image build.
- No V1 database schema migrations or seed data.
- No legacy data import.
- No Caddy reload or production deployment.

## Start-of-build checks

1. Re-read `AGENTS.md`, business rules, ADRs and open questions.
2. Confirm repository is clean and pull `main` fast-forward only.
3. Confirm PostgreSQL health and take a configuration snapshot.
4. Create the workspace and migration tooling in milestone 1.
5. Implement authentication/RBAC before user-facing operational workflows.
6. Keep production unavailable until an explicitly approved milestone passes
   tests, healthchecks and security review.

