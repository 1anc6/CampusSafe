# Data-handling guide

CampusSafe handles reports, contact details, and location information that may
be sensitive. Treat every record as confidential.

## Product rules

- Collect the minimum information needed to route and resolve a case.
- Display a location's precision and whether it is approximate; never present a
  fallback campus location as a student's exact position.
- Keep real contact numbers and names in deployment configuration, not source
  control.
- Use anonymous-report data only for the stated safety purpose.
- Do not copy production records into screenshots, issues, tests, or demo data.

## Operational checklist

Before sharing a screen or exporting data, remove names, contact details,
photos, tracking codes, and precise coordinates. Escalate a suspected data
exposure through the private process in `SECURITY.md`.
