# ADR-008: Record Issue Location

Status: Accepted

Every new issued-item record includes the place where the item was handed to
the Worker. This place is stored with the issue so the history can show what,
when, where and how many items were issued. Existing records retain a null
location and are displayed as "Neuvedeno"; the system does not infer historical
locations. Correcting a location uses the existing reason-required audited
issue correction flow.
