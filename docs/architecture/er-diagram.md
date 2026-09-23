# ER Diagram

``` mermaid
erDiagram
    USER ||--o| EMPLOYEE : authenticates
    ROLE ||--o{ USER : assigned
    ROLE }o--o{ PERMISSION : grants

    EMPLOYEE ||--o{ WORK_DAY : owns
    WORK_DAY ||--o{ WORK_ENTRY : contains
    WORK_DAY ||--o{ BREAK_ENTRY : contains

    PROJECT ||--o{ PROJECT_DAY : has
    EMPLOYEE ||--o{ PROJECT : leads
    PROJECT ||--o{ WORK_ENTRY : receives
    PROJECT_DAY ||--o{ WORK_ENTRY : contextualizes

    WORK_TYPE ||--o{ WORK_ENTRY : classifies
    WORK_ACTIVITY ||--o{ WORK_ENTRY : refines

    WORK_ENTRY ||--o{ MACHINE_USAGE : uses
    MACHINE_TYPE ||--o{ MACHINE : classifies
    MACHINE ||--o{ MACHINE_USAGE : recorded
    MACHINE_USAGE ||--o{ ATTACHMENT_USAGE : combines
    ATTACHMENT ||--o{ ATTACHMENT_USAGE : recorded
    ATTACHMENT_TYPE ||--o{ ATTACHMENT : classifies

    WORK_DAY ||--o{ VEHICLE_USAGE : includes
    VEHICLE ||--o{ VEHICLE_USAGE : used

    PROJECT_DAY ||--o{ PROJECT_FUEL_RECORD : owns
    EMPLOYEE ||--o{ PROJECT_FUEL_RECORD : records

    WORK_ENTRY ||--o{ APPROVAL : approval
    EMPLOYEE ||--o{ APPROVAL : approver

    MONTHLY_PERIOD ||--o{ WORK_DAY : governs
    USER ||--o{ AUDIT_LOG : actor
```
