# Decisions

Routine decisions made for checkpoint 1. Consequential items that were not decided are in OPEN_DECISIONS.md. Nothing here authorises live payments, a data migration, or a deploy.

## Decided

| Decision | Choice | Why |
| --- | --- | --- |
| Source project | This repository, branch `main` as the base. | It is the repo in the run. It already has the preorder, Supabase, and Paystack code. The Netlify preorder site is a different build and its source was not in any branch. |
| Side branches | Do not merge `core-pages`, `navigation-pages`, or `v0/yoloxtreme-ux-build`. | They do not implement the spec's campaign, admin, or customer model. `preorder-platform-setup` and `preorder-platform-setup-2` match `main`. |
| Checkpoint size | Project records, plus Vitest around existing pure helpers. No product-code changes. | Spec sequence step 1. Step 2 waits for the proposal in BUILD_CHECKLIST.md. |
| Framework | Keep Next.js, React, and TypeScript. | A replacement was not justified for an audit checkpoint. The security upgrade is recorded as a blocker, not done here, because 13.5.1 → 14.2.35 can change runtime behaviour and needs its own test pass. |
| Backend | Keep Supabase Auth, Postgres, storage, and the three edge functions. | A working backend shape is already in the repo. It was not replaced. |
| Payment adapter | Keep Paystack as the only adapter. | The spec says inspect before adding another. One adapter already exists. |
| Campaign identity | The future campaign object adapts `drops`. It does not add a second `campaigns` table. | The spec forbids two representations of the same thing. `drops` is already the preorder record. |
| Fees and splits | Leave the coded 10% untouched in this checkpoint. | Changing who receives money is a financial decision. It is open, not silently "fixed". |
| Social room | Leave the route in the tree. Do not extend it. | It works as code. The spec defers social features. Deleting it is a later, explained removal. |
| Policies | Do not draft legal text. | The spec says to ask for founder drafts. |
| Secrets | No env values in git. Docs list names only. | Spec rule. |
| Tests | Vitest 3.2.4, `npm test`, tests in `lib/utils.test.ts` only. | No test runner existed. The helpers are real logic the UI already uses. |
| Deploy | None. | Not part of checkpoint 1. |

## Explicitly not decided

Legal operator, who settles funds, refunds, chargebacks, reservation and late-payment rules, threshold failure, support commitments, the fee number, policy review, which visual reference wins, whether any existing drop or designer is grandfathered, who the first admin is, and whether a hosted Supabase project already has data. See OPEN_DECISIONS.md.
