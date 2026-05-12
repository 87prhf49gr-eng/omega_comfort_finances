## Summary

Describe the intent and impact of this PR.

## API Compatibility Checklist (required when touching API routes/contracts)

- [ ] I confirmed whether this PR changes any `/api/*` or `/v1/api/*` contract.
- [ ] If API was touched, I reviewed `comfort-ledger-beta/docs/api-compatibility-policy-v1.md`.
- [ ] I am **not** removing or renaming existing v1 endpoints.
- [ ] I am **not** removing response fields used by existing clients.
- [ ] Error response format remains compatible (`ok`, `code`, `message`, `error`, optional `requestId`, optional `details`).
- [ ] If this introduces a breaking change, I implemented versioned path strategy (`/v2/api/*`) and documented migration.
- [ ] OpenAPI docs were updated when contract changed (`comfort-ledger-beta/openapi.yaml`).
- [ ] I added/updated integration tests for changed API behavior.

## Test Plan

- [ ] `npm --prefix "comfort-ledger/comfort-ledger-beta" test`
- [ ] Additional manual verification (if needed)
