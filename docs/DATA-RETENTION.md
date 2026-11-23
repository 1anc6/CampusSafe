# Data retention notes

Retention should be configured to support active safety work without keeping
sensitive information indefinitely.

- Report photos are short-lived evidence and should follow the configured
  deletion job.
- Keep access to incident details limited to the roles handling the case.
- Use anonymised aggregates for analytics wherever possible.
- Review retention periods with the institution's privacy and legal owners
  before changing them.

Never use a database backup or production export as test data.
