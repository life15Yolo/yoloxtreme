# Test results

Checkpoint 1. Recorded from commands run in this environment on 2026-11-06. No results were copied from a previous run.

Environment: Node `v22.23.4`, npm `10.9.9`. `npx tsc --version` reported `Version 5.2.2`. `npx next --version` reported `Next.js v13.5.1`. `npx vitest --version` reported `vitest/3.2.4 linux-x64 node-v22.23.4`.

These variables were unset: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `APP_URL`. No hosted Supabase or Paystack call was made.

| Command | Exit | Result |
| --- | --- | --- |
| `npm install -D vitest@3.2.4` | 0 | Installed the existing lockfile and Vitest. npm reported 542 packages audited, `9 vulnerabilities (1 moderate, 5 high, 3 critical)`, and warned that `next@13.5.1` has a security vulnerability, linking https://nextjs.org/blog/security-update-2025-12-11. The summary did not name the other packages. Not fixed in this checkpoint. |
| `npm run typecheck` (`tsc --noEmit`) | 0 | No output. Pass. |
| `npm run lint` (`next lint`) | 0 | Pass, with one existing warning. |
| `npm test` (`vitest run`) | 0 | 1 file, 5 tests, all passed. Duration 263ms. |
| `npm run build` (`next build`) | 0 | Compiled successfully. Lint skipped because `next.config.js` sets `eslint.ignoreDuringBuilds: true`. Type check during build passed. 9 static pages generated. |

### Lint warning (not introduced by the tests)

`app/dashboard/new-drop/page.tsx` line 75: `@next/next/no-img-element`. The new-drop preview uses `<img>`. Left as-is. The build does not fail on it because lint is skipped during `next build`, and `next lint` itself exits 0 for warnings.

### Vitest

File: `lib/utils.test.ts`.

| Test | Result |
| --- | --- |
| `formatNaira` converts kobo to naira using `en-NG` | Passed |
| `slugify` matches the slug the new-drop form derives | Passed |
| `timeLeft` on `2000-01-01T00:00:00.000Z` is expired | Passed |
| `timeLeft` on a deadline about three days ahead is not expired | Passed |
| `timeAgo` of the current time is `just now` | Passed |

### Build routes

| Route | Build output |
| --- | --- |
| `/` | Static |
| `/_not-found` | Static |
| `/d/[slug]` | Server |
| `/d/[slug]/room` | Server |
| `/dashboard` | Static |
| `/dashboard/drops` | Static |
| `/dashboard/new-drop` | Static |
| `/dashboard/orders` | Static |
| `/onboard` | Static |

`/` was static in this run because the Supabase env vars were unset, so the page took the empty-data branch. This does not show what a build with those variables set would do.

### Not run, and why

| Check | Why it was not run |
| --- | --- |
| Browser pass of home, drop, onboard, dashboard | No Supabase project was configured. A click-through would only show the placeholder client and demo cards. Not claimed as verified. |
| Paystack initialize, webhook signature, replay, amount tamper | No test key in the environment. Calling Paystack was out of scope. |
| RLS, cross-account access, self-approval | No database. Policies were read, not executed. |
| `increment_drop_qty` concurrency | SQL function. No database. |
| Mobile, keyboard, empty and error UI states | No browser pass. |
| Designer, admin, and customer journeys | Admin and customer journeys do not exist. Designer journey was not executed. |
| `core-pages` and `navigation-pages` | Not part of `main`. Not installed or built. |
| The two Netlify sites as deployments of this repo | They are different builds. They were fetched for the audit only. |
| `npm audit` package-by-package | The install summary was recorded. A fix was not applied. |

### Spec test list still outstanding

Cross-account access, designer ownership, self-approval, backend bypass, badge forgery, private evidence, badge revocation, publication requirements, paused or closed checkout, amount tampering, signed and invalid payment events, duplicate and out-of-order events, caps and expiry, repeated closing, refund accounting, terms snapshots, public tracking, notification auth, fulfilment isolation. All not run. The product behaviour they describe is mostly unbuilt. See RELEASE_BLOCKERS.md.
