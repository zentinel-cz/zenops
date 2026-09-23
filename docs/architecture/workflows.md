# Workflows

## Worker workflow

``` mermaid
flowchart TD
    A[Login] --> B[Home]
    B --> C[Open/Create WorkDay]
    C --> D[Choose Morning or Night]
    D --> E[Add Work Entry]
    E --> F[Select OPEN Project]
    F --> G[Enter From-To]
    G --> H[Select Work Type]
    H --> I[Dynamic Activity/Resource Form]
    I --> J[Server Validation]
    J -->|Valid| K[Save]
    J -->|Invalid| I
    K --> L{More activity?}
    L -->|Yes| E
    L -->|Break| M[Add Explicit Break]
    M --> L
    L -->|No| N[Submit]
    N --> O[Project-based Approval]
```

## Approval

``` mermaid
flowchart LR
    A[DRAFT] --> B[SUBMITTED]
    B --> C{Project Leader}
    C -->|Approve| D[APPROVED]
    C -->|Return with reason| E[RETURNED]
    E --> A
    D --> F{All WorkDay entries approved?}
    F -->|Yes| G[WorkDay fully approved]
    F -->|No| H[Wait for remaining approvals]
```

## Monthly closure

``` mermaid
flowchart TD
    A[MonthlyPeriod OPEN] --> B{Unresolved records?}
    B -->|Yes| C[Cannot close]
    B -->|No| D[Admin closes month]
    D --> E[MonthlyPeriod CLOSED]
    E --> F[Ordinary edits blocked]
    E --> G{Correction required?}
    G -->|Yes| H[Admin provides reopen reason]
    H --> A
```
