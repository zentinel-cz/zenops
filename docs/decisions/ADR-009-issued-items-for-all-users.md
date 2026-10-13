# ADR-009: User Profiles and Issued Items for All Roles

Status: Accepted

Every user account has one required Employee profile. Only Admin creates user
accounts and their profiles. Accountant can browse the directory of all users
and record company-issued items and returns for any role; Accountant cannot
create a user account or profile.

Accountant may correct an issue date using the existing reason-required audited
issue correction flow. Accountant may correct a return date with a mandatory
reason; the before and after values are retained in the audit log. A date
correction does not alter returned quantity, the issue relationship or the
person who recorded the return. Returns cannot be deleted.

The catalogue and existing quantity validation remain unchanged. Worker
self-service remains limited to their own profile and issued-item history.
This decision supersedes ADR-007 only where that decision limited issued items
to Workers or described profiles as Worker-only. All other ADR-007 rules remain
in force.
