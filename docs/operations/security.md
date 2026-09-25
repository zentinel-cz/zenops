# Production security baseline

- PostgreSQL is reachable only on the internal Compose network.
- The web listener is bound to host loopback; Caddy is the only public entry.
- Login is rate-limited and state-changing requests require the configured
  trusted Origin.
- Sessions use random opaque tokens, store only SHA-256 token hashes and use
  `Secure`, `HttpOnly`, `SameSite=Strict` cookies.
- Passwords use Argon2id and are never written to source, documentation or
  application logs.
- A self-service password change requires the current password, is rate-limited
  and revokes every session belonging to the account after success.
- Static responses set CSP, HSTS, clickjacking, MIME-sniffing, referrer and
  browser-feature restrictions.
- Long-running containers use `no-new-privileges`; API and web root
  filesystems are read-only with bounded temporary filesystems.
- Docker JSON logs are size-limited and rotated.
- Database secrets are supplied through a root-owned Docker secret file.
- Health and readiness checks are enabled for every application service.

After deployment, verify HTTPS response headers, container health, the
loopback-only published port, the absence of a PostgreSQL host port and a
successful backup/restore drill.
