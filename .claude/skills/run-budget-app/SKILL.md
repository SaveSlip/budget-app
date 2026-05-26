---
name: run-budget-app
description: Build, run, and drive budget-app (Budgify). Use when asked to start the app, run it, take a screenshot, test a UI change, or interact with the running Budgify budget tracker.
---

Budgify is a Next.js 16 + SST v4 + DynamoDB budget-tracking web app. An agent drives it by starting the dev server (which requires AWS SSO), then running `.claude/skills/run-budget-app/driver.mjs` against `http://localhost:3000` via Playwright.

## Prerequisites

Node v24 and pnpm are required. Playwright's Chromium must be installed once:

```bash
npx playwright install chromium
```

AWS SSO must be authenticated for the `amanbrar-dev` profile:

```bash
aws sso login --profile amanbrar-dev
```

## Setup

```bash
pnpm install
```

Environment variables live in `.env` (not `.env.local` — SST won't detect secrets from `.env.local`):

```
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"
```

## Run (agent path)

**1. Check if the dev server is already running (common case):**

```bash
curl -sf http://localhost:3000 >/dev/null && echo "server up"
```

**2. Start the dev server if needed:**

The full startup command is `pnpm sst dev`. It spawns the SST IaC runner (which injects `Resource.BudgifyTable.name`) **and** `next dev` together. Running `pnpm dev` alone crashes because `Resource.BudgifyTable.name` is undefined without the SST process.

```bash
# Requires AWS SSO already active (amanbrar-dev profile)
AWS_PROFILE=amanbrar-dev pnpm sst dev &>/tmp/budgify-dev.log &
echo $! > /tmp/budgify-dev.pid
# Wait for Next.js to be ready (15–30s on first run)
until curl -sf http://localhost:3000 >/dev/null 2>&1; do sleep 2; done
echo "ready"
```

Stop with: `kill $(cat /tmp/budgify-dev.pid)`

**3. Drive the app:**

```bash
# Smoke flow: screenshot signin + signup, verify form elements
node .claude/skills/run-budget-app/driver.mjs flow

# Single screenshot of root (redirects to /signin)
node .claude/skills/run-budget-app/driver.mjs

# Navigate to any route and screenshot
node .claude/skills/run-budget-app/driver.mjs nav /signin
node .claude/skills/run-budget-app/driver.mjs nav /signup

# Sign in (requires live DynamoDB via SST dev + existing user record)
node .claude/skills/run-budget-app/driver.mjs signin user@example.com password123
```

Screenshots land in `/tmp/budgify-screenshots/` as `shot-001.png`, `shot-002.png`, etc.

Override base URL or screenshot dir:

```bash
BUDGIFY_URL=http://localhost:3001 SCREENSHOT_DIR=/tmp/shots node .claude/skills/run-budget-app/driver.mjs flow
```

## Run (human path)

```bash
AWS_PROFILE=amanbrar-dev pnpm sst dev   # → Next.js at http://localhost:3000. Ctrl-C to stop.
```

## Lint / Type-check

```bash
pnpm exec tsc --noEmit
# 1 pre-existing error in src/components/MonthlyChart.tsx (Recharts Formatter type mismatch) — expected, ignore
# pnpm lint is broken: eslint-plugin-react@7.x incompatible with eslint@10 (contextOrFilename.getFilename error)
```

---

## Fractional CTO — Working Principles

When working on this project, act as a senior technical mentor and CTO. Apply these principles to every task.

### Communication
- Explain the **business logic** and **architectural reasoning** (the "why") before writing code (the "how").
- Avoid jargon. Keep explanations simple and direct — the developer is newer and values learning from each interaction.
- When fixing a bug, diagnose the root cause and explain *why* the error occurred before presenting the fix.

### Tech Stack & Standards
- **Framework:** Next.js App Router (latest stable), TypeScript strict mode
- **Styling:** Tailwind CSS v4, Shadcn UI (never modify `components/ui/` — those are shadcn-generated; create custom components in `src/components/`)
- **Package manager:** pnpm
- **Infrastructure:** SST v4 on AWS (serverless). All environment config via `.env`, never `.env.local`
- **Database:** DynamoDB single-table design via `@aws-sdk/lib-dynamodb` and SST Resource bindings — never hardcode table names

### Code Quality
- Maintain strict consistency in naming conventions, component structure, and design patterns across the codebase.
- Enforce conventional commits (`feat:`, `fix:`, `chore:`, etc.) and feature branches — direct commits to `main` are prohibited.
- Push back on temporary, messy, or brittle code. Prefer boring, readable solutions over clever ones.
- Point out hidden edge cases proactively.

### Security & Production Readiness
- Enforce Zero Trust: all data access via server actions or API routes only. No credentials or secrets on the client.
- Architect for graceful scaling and live traffic. Think about DynamoDB access patterns before writing queries.
- Optimize for cost-efficiency on AWS — PITR disabled in dev, Point-in-Time Recovery enabled only in production.

---

## Gotchas

- **`pnpm dev` alone crashes.** The app imports `Resource.BudgifyTable.name` from `sst` at module load time. Without the SST dev server providing that binding, Next.js crashes at startup. Always use `pnpm sst dev`.

- **Port 3000 collision.** `pnpm sst dev` detects an existing Next.js server on port 3000 and refuses to start a second one (prints the PID). Kill the existing process before relaunching.

- **Playwright not in project deps.** The project has no `playwright` dependency. `driver.mjs` falls back to the npx cache at `/Users/amanbrar/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. If that path is missing, run `npx playwright@1.60.0 install chromium` and update the fallback path.

- **Dashboard requires auth + live DynamoDB.** `/dashboard` server-renders with `auth()` which calls DynamoDB. Without a valid session, it redirects to `/signin`. The `signin` driver command does a real credential sign-in — it only works when SST dev is running with AWS SSO active and the user exists in the table.

- **AWS credential warning in server logs.** Next.js dev logs show a warning about both `AWS_PROFILE` and `AWS_ACCESS_KEY_ID` being set simultaneously. This is benign — SST injects both and the SDK correctly prefers `AWS_PROFILE`.

## Troubleshooting

- **`Cannot find package 'playwright'`**: Driver falls back to the npx cache path automatically. If the cache is gone, run `npx playwright install chromium` once.

- **`Error: connect ECONNREFUSED localhost:3000`**: Dev server not running. Start with `AWS_PROFILE=amanbrar-dev pnpm sst dev`.

- **`ERR_MODULE_NOT_FOUND` for `sst`**: You ran `pnpm dev` instead of `pnpm sst dev`. The `sst` module only provides resource bindings when the SST dev process is the parent.

- **Screenshot is blank or all-black**: A server-side route crashed (likely a DynamoDB call with no credentials). Check `/tmp/budgify-dev.log` for `UnauthorizedException` or `ResourceNotFoundException`.
