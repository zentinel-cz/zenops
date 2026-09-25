# ZenOps backup and restore

## Scope

The backup contains the complete PostgreSQL database in PostgreSQL custom
format. Application source is versioned in Git and deployment secrets are not
copied into the backup directory.

## Automatic backup

- `ops/backup.sh` creates a UTC-timestamped directory under
  `/opt/zenops/backups/automatic`.
- Files and directories are owner-only (`0600`/`0700`).
- A non-blocking `flock` prevents overlapping runs.
- `pg_restore --list` validates the dump before its temporary suffix is
  removed.
- `SHA256SUMS` records the completed dump checksum.
- `zenops-backup.timer` runs daily at 02:20 Europe/Prague with up to ten
  minutes of randomized delay.
- Backups are not deleted automatically. Retention must be introduced only
  with an explicitly approved policy and a second off-host copy.

Useful checks:

```sh
systemctl status zenops-backup.timer
systemctl list-timers zenops-backup.timer
journalctl -u zenops-backup.service
```

## Restore verification drill

`ops/verify-restore.sh /absolute/path/database.dump` starts a temporary,
network-isolated PostgreSQL 16 container, restores the dump with
`--exit-on-error`, verifies the public-table and migration counts and then
removes that temporary container. It never connects to or writes into the
production database.

Run a drill after a schema change and periodically against a recent automatic
backup:

```sh
sudo /opt/zenops/app/ops/verify-restore.sh \
  /opt/zenops/backups/automatic/TIMESTAMP/database.dump
```

## Production recovery

Do not restore over the live database in place. Stop application traffic,
preserve the current volume, restore the selected verified dump into a new
PostgreSQL volume, run application readiness checks and switch only after an
operator validates record counts and authentication. Keep the old volume
until the recovery is explicitly accepted.
