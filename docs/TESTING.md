# Testing guide

Run the full validation suite before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test
```

Tests close to `src/lib/` cover pure safety logic such as routing, contact
parsing, scheduling, and campus-distance calculations. Add a focused regression
test whenever a bug could change where help is routed, who can see a case, or
how a location is interpreted.

Use anonymised, fictional values in every test fixture.
