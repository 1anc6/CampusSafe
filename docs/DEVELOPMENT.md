# Local development

## First run

```bash
npm ci
npm run dev:local
```

Open `http://localhost:8080`. The local command loads the sample configuration
when it is available; do not put production secrets in `.env.local.example`.

## Checks before a pull request

```bash
npm run typecheck
npm run lint
npm test
```

For UI or accessibility work, also start the app and run `npm run a11y` in a
second terminal. Check the student flow on a narrow viewport: report filing,
SOS activation, and cancellation must remain clear and keyboard-operable.

## Database changes

Add migrations in numeric order under `migrations/`. Migrations must be safe
to apply to an existing deployment; never edit a migration that may already
have run in production.
