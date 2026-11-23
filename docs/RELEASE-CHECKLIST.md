# Release checklist

Use this checklist before deploying CampusSafe.

- [ ] `npm run typecheck`, `npm run lint`, and `npm test` pass.
- [ ] Database migrations have been reviewed and are ready to run once.
- [ ] Production environment variables are present; no placeholder contact is
      being presented as a real emergency line.
- [ ] SOS, report, anonymous-report, and responder flows were checked on a
      narrow viewport.
- [ ] Keyboard navigation and reduced-motion behaviour were checked for changed UI.
- [ ] Error messages give a safe next step and do not reveal sensitive details.
- [ ] A rollback owner and on-call contact are known for the release window.

After deployment, confirm a regular student can sign in, a responder sees only
their permitted work, and the public anonymous-report route remains available.
