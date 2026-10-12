# ADR-007: Worker Profiles and Issued Items

Status: Accepted

Every Worker has a profile containing their name, employee number, account
email, contact phone, upper- and lower-body workwear sizes, and shoe size.
Workers can view only their own profile and issued-item history; they cannot
edit these records.

The `ACCOUNTANT` role is a standalone, mutually exclusive role. Accountants can
view and update Worker profiles, manage an item-type catalogue, record dated
item issues and record dated partial or complete returns. Issue records store
item, quantity, optional size, date and note. Existing issue records may be
corrected only with a reason; the correction is audited. Returns are separate
dated quantity events and cannot exceed the issued quantity. Catalogue items
are deactivated rather than deleted. Admin receives the same management
permission. The Accountant cannot manage accounts/roles, workdays, projects or
approvals.

This feature does not track purchase prices or warehouse stock. Historical
issue and return records are retained.
