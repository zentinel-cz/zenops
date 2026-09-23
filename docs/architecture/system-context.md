# System Context

``` mermaid
flowchart LR
    W[Worker Mobile Browser] --> Z[ZenOps Web Application]
    L[Leader Browser/Mobile] --> Z
    A[Admin Browser] --> Z

    Z --> API[ZenOps Backend/API]
    API --> DB[(PostgreSQL)]
    API --> R[Reporting / PDF generation]
    API --> AUD[Audit subsystem]

    C[Caddy - existing host reverse proxy] --> Z
    INTERNET[zenops.zentinel.cz] --> C
```

Deployment target: isolated ZenOps Docker Compose stack behind the
existing Caddy instance.
