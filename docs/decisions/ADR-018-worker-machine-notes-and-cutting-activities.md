# ADR-018: Worker machine notes and cutting activity selection

Status: Accepted — explicit user request 2026-11-25

The Worker machine-use form presents attachment selection beside the physical
machine (stacked on mobile). Creation remains Worker-only; stored usage remains
visible in existing scoped operational reads and reports. Machine/attachment
conflict constraints and per-usage time semantics from ADR-013 are unchanged.

Each MachineUsage has an optional trimmed note (UI: Poznámka/Porucha), maximum
2000 characters. It is part of the usage and its creation audit, not a shared
mutable catalogue note or a service/availability workflow. Existing meter and
administrative corrections preserve it. Reports escape the value as text.

TREE_CUTTING offers SAWYER/Pilař, TRACTOR_DRIVER/Strojník,
POLE_SAW/Tyčová pila and CLEANUP/Úklid. HANDLING and OTHER are deactivated,
never deleted. Existing entries may retain their inactive activity during
correction; new selections must be active. The separate OTHER work type remains.
Stored TRACTOR_DRIVER code and all foreign-key identities are retained.

Migration 0025 adds the note and updates the activity catalogue and shared
machine summary function without rewriting operational rows or decisions.

Worker totals and per-employee daily/PDF totals sum WorkEntry durations once,
regardless of attached machine count. Trips are not added and breaks are not
subtracted again. This preserves current working-time policy (ADR-011).

Admin-managed shift presets, AFTERNOON and removal of the new-break form
are defined by ADR-019 following the user clarification.
