# Spore — Build Rules

## 1) Overarching philosophy

1. Ship small, ship safe. Small PRs, behind feature flags, well-tested.
2. Contracts first. API (OpenAPI / protobuf) is the single source of truth — clients must use generated clients.
3. Code is reviewed, measurable, and revertable. If something can’t be reverted quickly, it doesn’t go to prod.

---

## 2) Repo & branching

* Main branches: `main` (production), `staging` (pre-prod), feature branches `feat/<ticket>-short-desc`.
* PRs only into `staging`; `staging` → `main` is via gated release job and approvals.
* PR naming: `feat/1234-add-post-composer`. Commit messages must include ticket ID: `SP-1234: Fix X`.
* No force pushes to `main` or `staging`. Squash merges allowed; keep history readable.

---

## 3) PR rules & size

* Max 400 lines changed per PR unless pre-approved. Smaller is better.
* Every PR must include:

  * Short description of change, risk level, rollout plan.
  * Acceptance tests and how QA can validate (exact commands).
  * Linked issue/ticket.
* Approvals: at least one backend and one frontend reviewer for cross-cutting changes.
* Urgent hotfixes require a post-merge retrospective and revert plan.

---

## 4) CI / pipeline (mandatory steps for every repo)

Pipeline stages (fail fast):

1. **Lint & format**

   * Go: `gofmt`, `golangci-lint` (config strict: govet, staticcheck on).
   * Rust: `cargo fmt`, `cargo clippy` (deny warnings).
   * JS/TS: `prettier`, `eslint` (strict rules).
2. **Unit tests** — coverage thresholds: backend 70% minimum, critical modules 90%.
3. **Integration tests** — run containerized services (Postgres, vector stub).
4. **Contract tests** — use generated client to test OpenAPI/proto.
5. **Security scan** — dependency scan (Dependabot + `snyk`/`trivy`) and container image scan.
6. **WASM validation** (Pieces): run `wasm-validate` / Wasmtime smoke run to ensure no banned syscalls and size < 5MB (configurable).
7. **Build artifacts** — produce reproducible artifacts (binaries, WASM blobs) with checksums.
8. **Staging deploy** — automated deploy to staging environment. Smoke tests run.
9. **Canary / gating** — for main deploys, a canary rollout with health checks before full promotion.

CI must be green end-to-end to merge to `staging`.

---

## 5) Testing rules

* Unit tests run in < 10s ideally. Integration tests allowed to be slower but must be stable.
* Use contract tests: auto-generate client stubs from OpenAPI/protos. CI must run contract tests against local staging.
* End-to-end smoke tests for core path: signup → post → follow → comment → run-mcp (remote).
* Add deterministic fixtures and seed data for tests. No brittle sleeps/timeouts.
* Chaos test periodic (nightly): simulate failed vector DB / Pieces unavailability and assert graceful degradation.

---

## 6) Quality & static analysis

* No linter warnings allowed; CI failing on linter/formatter violations.
* Run `go vet`, `staticcheck`. Run `cargo clippy -- -D warnings`.
* Add fuzz tests for memory ingestion routines and WASM host surface area.
* Scan for secrets in PRs (git-secrets or truffleHog).

---

## 7) Security / secret handling

* No secrets in repos. Use secret manager (GitHub Actions Secrets, Vault).
* Rotate tokens quarterly; all long-lived tokens must be justified in a ticket.
* Enforce least-privilege IAM for cloud resources.
* All connectors (GitHub, Stripe, Pinecone) must use scoped keys and be encrypted at rest.
* Dependencies policy: no packages with critical unresolved CVEs older than 30 days — escalate.

---

## 8) WASM / MCP safety rules

* Max WASM size: 5 MB default. Reject larger with justification.
* Validate WASM: static validation + run under Wasmtime in sandbox smoke-run.
* No outbound network in MCPs by default. Any network permission must be explicit in manifest & admin-reviewed.
* Resource limits: default CPU 500ms, memory 64MB, max run time 2s (tunable per MCP and with approval).
* MCP publish process: author publishes → CI runs static checks → sandbox test run → manual QA approval for public listing. Initial MCPs require manual approval.

---

## 9) API & data migration rules

* OpenAPI/proto first. Changes that are breaking must be versioned (v1 → v2) and have migration path.
* DB migrations: use a single migration tool (`go-migrate` or similar). Migrations run in CI and are applied in staging in a migration job.
* Data migrations must be idempotent and reversible where possible. Document manual rollback steps.
* Backups: automated daily DB snapshot retention 30 days (configurable) and tested restores monthly.

---

## 10) Observability & SLOs

* Instrument all services with Prometheus metrics + distributed traces (OpenTelemetry).
* Log format: structured JSON, include request ids and user ids (obfuscate PII).
* Define SLOs for core APIs: 99% requests < 300ms for read endpoints, 99% < 1s for write endpoints. Alert on error rate > 1% or saturation > 80%.
* Pager rules: critical incidents page on-call; runbooks for common incidents (wasm OOM, vector DB down, GitHub webhook storm).

---

## 11) Release & rollback

* Releases are tagged semver. Use automated release notes from PR titles (conventional commits preferred).
* Canary rollout: 5% → 25% → 100% with automated health checks and rollback on failure.
* Reverts: feature flags to turn off new features quickly. If not possible, revert commit + hotfix pipeline.
* Post-release: QA checklist and 24-hour monitoring window before marking release stable.

---

## 12) Performance & cost guardrails

* CPU/memory budgets per service; enforce via k8s resource limits or Pulumi/Terraform constraints.
* Load test core flows (signup, feed, mcp run) with realistic concurrency before major launches.
* Cost monitoring: set alert if monthly infra > budget threshold.

---

## 13) Documentation & onboarding

* Every repo must have: README, CONTRIBUTING.md, architecture diagram, local dev quickstart (docker-compose), and API contract link.
* Onboard dev checklist: 1) clone + run dev environment, 2) run test suite, 3) make a tiny PR that passes CI. Must be doable in < 1 hour.

---

## 14) PR / Release checklists (copy-paste)

PR checklist (must be ticked):

* [ ] Linked issue/ticket
* [ ] Description + rollout plan in PR body
* [ ] Unit tests added/updated
* [ ] Integration / contract tests updated if applicable
* [ ] Linter/formatter clean
* [ ] Security scan passed
* [ ] Size < 400 LOC (or approved)
* [ ] At least one backend + one frontend reviewer (if cross-cutting)

Release checklist:

* [ ] Tag created (semver)
* [ ] Changelog auto-generated and sanity-checked
* [ ] Migration plan & rollback steps included
* [ ] Canary plan defined
* [ ] Post-release monitoring dashboard ready
* [ ] QA sign-off on staging

---

## 15) Minimal tooling & config to include in repos

* `Makefile` or `justfile` with standard commands: `make lint`, `make test`, `make build`, `make fmt`, `make ci-smoke`.
* CI templates with the pipeline stages above as reusable workflows.
* `CODEOWNERS` for critical directories (api, mcp, wasm-host).
* `SECURITY.md` with contact & incident reporting.
* `CONTRIBUTING.md` with these rules.
