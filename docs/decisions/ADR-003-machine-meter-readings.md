# ADR-003: Machine Meter Readings

Status: Accepted

Tracked machines store start/end operating-hour readings. Start is
suggested from the latest valid end reading but may be corrected by the
worker with audit history. End must not be below start.
