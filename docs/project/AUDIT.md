# Audit — checkpoint 1

Date: 2026-11-06. Scope: read the repository and the two public reference sites. No live service, database, or payment account was queried. No migration was applied. No deploy was made.

## Repository and confidence

| Question | Finding | Confidence |
| --- | --- | --- |
| Repository | `life15Yolo/yoloxtreme`, public, default branch `main` at `ce46b7d` ("Merge pull request #4 … Install Vercel Web Analytics"). GitHub description: "YOLOXTREME — The Preorder Factory. Multi-designer preorder platform with Paystack split payments." | High. This is the repo checked out for this run. |
| Is `main` a preorder app? | Yes. Next.js app: designer signup, drops, Paystack initialize, Paystack webhook, designer dashboard. | High. Read from source. |
| Is this repo the source of https://yoloxtreme-preorder.netlify.app/ ? | No evidence that it is. Evidence that it is not is below. The source of that site was not identified. | High that it is not this repo. The other source is unknown. |
| Is this repo the source of https://yoloxtreme-adoption-site.netlify.app/ ? | No. That site is a different single-page build. | High. |

This checkpoint's base branch is `main`. Side branches were read and were not merged.

### Why the Netlify preorder site is not this repo

Fetched 2026-11-06.

The live preorder site responds `200` from Netlify. Its document title is "YoloXtreme — Designer preorders". The homepage H1 is "Order it first. The designer makes it." A banner reads "Development preview · Listings shown are sample content · No payments are taken". Routes that return 200 include `/campaigns`, `/campaigns/adire-camp-shirt`, `/designers`, `/designers/indigo-house`, `/how-preorders-work`, `/policies`, `/sign-in`, `/studio`, `/studio/campaigns/new`, `/support`. `/account`, `/orders`, and `/admin` return 404.

The HTML loads Vite-style hashed files under `/assets/` (`index-*.js`, `index-*.css`, `fixtures-*.js`, `campaign-card-*.js`, `campaign-rules-*.js`). CSS tokens are `--yx-navy:#101c30`, `--yx-ivory:#faf8f4`, `--yx-gold:#b58b42`, `--yx-slate:#64748b`, `--yx-soft:#e5e7eb`, fonts Newsreader and Manrope.

This repo is Next.js 13 App Router. `next build` in this run emitted `/_next` chunks and the routes `/`, `/onboard`, `/dashboard`, `/dashboard/drops`, `/dashboard/new-drop`, `/dashboard/orders`, `/d/[slug]`, `/d/[slug]/room`. The homepage title in code is "YOLOXTREME — The Preorder Factory". The visual system is black with lime `hsl(73 100% 50%)`, fonts Archivo and Inter. A search of every remote branch for "Order it first", "Designer preorders", and "Development preview" found no matches.

`netlify.toml` in this repo would publish a Next.js build (`.next` plus `@netlify/plugin-nextjs`). The live preorder HTML is not that shape. No Netlify site id is stored in the repo, so this audit cannot say which Netlify site, if any, builds `main`.

### Other branches (meaningful differences)

| Branch | Tip | Compared with `main` | What it actually contains |
| --- | --- | --- | --- |
| `main` | `ce46b7d` (2026-11-02) | — | Preorder Factory app, Supabase migrations, Paystack edge functions, Vercel Analytics and Speed Insights. |
| `preorder-platform-setup`, `preorder-platform-setup-2` | same commit as `main` | 0 / 0 | No difference. |
| `v0/fix-supabase-preview` | `3d2f41c` | 5 behind, 0 ahead | Already merged (PR #3). Placeholder Supabase client so previews build without env vars. |
| `v0/yoloxtreme-ux-build` | `b7e72fa` | 2 behind, 1 ahead | Homepage copy only ("WEAR WHAT'S NEXT"). Same factory theme, same drops model. |
| `navigation-pages` | `fb0d50b` (2026-11-05) | 1 commit ahead | Extra management screens (`analytics`, `item-editor`, `profile`, `project-list`) and a dashboard shell. They list and edit `drops`. Not an admin console. |
| `core-pages` | `7dd3190` (2026-11-05) | 1 commit ahead | More of the same: activity log, analytics, client invoices (a view over `preorders`), feedback portal, item editor, profile, project list, task timeline, team directory, plus a `feedback` migration. Not the spec's admin, customer, or campaign model. |
| `vercel/install-vercel-web-analytics-6m1gkd`, `vercel/install-vercel-speed-insights-n2ns7w`, `vercel/vercel-speed-insights-to-proje-7u2e6q` | merged | — | Added `@vercel/analytics` and `@vercel/speed-insights`. No Vercel project name is in the source. |

Vercel project names such as `yoloxtreme-drop-engine` do not appear in this repo. The only Vercel evidence is the two analytics packages, `.vercel` in `.gitignore`, and those merged branches. They were not opened or changed.

## Stack

| Item | Current, from the repo |
| --- | --- |
| Framework | Next.js `13.5.1`, React `18.2.0`, TypeScript `5.2.2`, App Router under `app/`. Tailwind `3.3.3`. shadcn/ui components are present; most are unused by the pages. |
| Build | `npm run build` → `next build`. `netlify.toml` uses `npx next build` and `publish = ".next"` with `@netlify/plugin-nextjs` `^5.15.1`. |
| `next.config.js` | `eslint.ignoreDuringBuilds: true`. `images.unoptimized: true`. |
| Backend | Supabase. Browser client in `lib/supabase/client.ts`. SQL migrations in `supabase/migrations/`. Edge functions in `supabase/functions/` (Deno). `supabase/config.toml` only sets `verify_jwt = false` on the three functions. No project ref. |
| Auth | Supabase Auth email and password, created in the onboard form. No OAuth, no `middleware.ts`, no customer signup. |
| Database | Postgres tables `designers`, `drops`, `preorders`, `room_posts`, plus `increment_drop_qty`. RLS is enabled. Whether any hosted database has had the migrations applied is not known. |
| Storage | Public bucket `drop-images`. |
| Server functions | `pay`, `paystack-webhook`, `create-subaccount`. No `app/api` routes. `lib/supabase/server.ts` exports `createServerClient()` with the service-role key and is not imported anywhere. It imports `cookies` and does not use them. |
| Payments | Paystack. See below. |
| Tests before this checkpoint | None. No CI workflow. |
| Package name | `package.json` name is `nextjs`, version `0.1.0`. README is empty. |

`npm install` on 2026-11-06 warned that `next@13.5.1` is affected by a published security issue and pointed at https://nextjs.org/blog/security-update-2025-12-11. That advisory says App Router apps on Next.js `>=13.3` are affected by the RSC denial-of-service CVE-2025-55184 / CVE-2025-67779, with the fix line for that range named as 14.2.35. This checkpoint does not upgrade Next.js. See RELEASE_BLOCKERS.

## Reference sites (design)

Adoption site, fetched in full on 2026-11-06. It is one page, not a multi-page app. Navigation is in-page: `#about`, `#how-it-works`, `#pathways`, `#use-cases`, `#community`, `#faq`, `#join`. Title: "Yoloxtreme — Adoption Made Simple". Fonts: Archivo and Inter. Tokens include `--lime:#c8ff1a`, `--ink:#0a0a0a`, and a light background. Copy is a community-adoption page (guides, Discord, recovery-phrase warnings, "not financial advice"). Stats and quotes are labelled placeholders in the page itself. Several calls to action use `href="#"` (guides, security checklist, Discord, pathway buttons, footer resources, social channels). It does not show products, campaigns, checkout, or the navy/ivory/gold palette.

Preorder site tokens, from its CSS: navy `#101C30`, ivory `#FAF8F4`, white `#FFFFFF`, gold `#B58B42`, slate `#64748B`, soft grey `#E5E7EB`. Those are the spec's fallback colours, used there as the real theme. Fonts are Newsreader and Manrope. Sample campaigns (Adire Camp Shirt, Indigo House, and others) are presented behind the development-preview banner. A bundle named `fixtures-*.js` is loaded.

This repo's theme (near-black, lime, Archivo, Inter, radius 1.5rem) shares font families and a similar lime with the adoption site, and shares almost nothing visual with the preorder site. The adoption site's words must not be copied into the product. Which public theme to follow is an open decision.

## Payments, as implemented

There is one adapter: Paystack, in `supabase/functions/pay` and `supabase/functions/paystack-webhook`.

- `pay` loads the drop with the service role, rejects a non-`live` drop and a drop already at `max_qty`, computes `amount = price * quantity` in kobo, and calls `https://api.paystack.co/transaction/initialize` with `currency: 'NGN'`.
- If `designers.paystack_subaccount_code` is set, it sends that subaccount and `transaction_charge = round(amount * 0.1)`. `create-subaccount` posts to Paystack `/subaccount` with `percentage_charge: 10`. The onboard page says "90% to you". The spec leaves fees and who receives funds unresolved. This 10% split is already encoded. It was not changed.
- The code uses `PAYSTACK_SECRET_KEY`. No key value is in the repo. Nothing in the code distinguishes a test key from a live key. This environment did not have the variable set.
- The webhook reads `x-paystack-signature`, computes HMAC-SHA512 over the raw body with the secret, and rejects a mismatch. It then calls Paystack `transaction/verify` and requires `status === 'success'`. That part does not trust the browser.
- The drop page sends the buyer to `authorization_url`. The callback URL is the drop page. The drop page does not read a Paystack reference or set an order to paid. Payment is not confirmed from the redirect.
- Gaps that are in the code: no `payment_attempts` row; the preorder is inserted already `paid`; `paystack_ref` is not unique, and the duplicate check is a read-then-insert; the webhook increments demand by `metadata.quantity` and does not check that Paystack's amount equals `price * quantity` or that currency is NGN; insert and `increment_drop_qty` are not one transaction, so a failed increment is skipped on Paystack's retry once the row exists; `pay` does not check `countdown_end` or `current_qty + quantity`; two buyers can pass the cap check before either webhook lands. `verify_jwt = false` on `pay` and `create-subaccount`, with `Access-Control-Allow-Origin: *`. Anyone who can reach the functions can initialize a payment or ask Paystack to create a subaccount when the secret is configured. The signature compare uses `===`.

## Environment variable names

Referenced in source. No values are recorded here. None of these were set in the checkpoint environment.

| Name | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client, onboard, drop page, server helper. |
| `SUPABASE_URL` | Fallback in the browser client. Edge functions. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client, onboard, drop page. |
| `SUPABASE_ANON_KEY` | Fallback in the browser client. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` (unused). Edge functions. |
| `PAYSTACK_SECRET_KEY` | `pay`, `paystack-webhook`, `create-subaccount`. |
| `APP_URL` | `pay` callback. If unset, the code uses `https://yoloxtreme.tech`. |

No `.env` file is committed. `.gitignore` ignores `.env` and `.env*.local`. There is no `.env.example`.

## Deployment environments

From the repo: a Netlify build file, and Vercel analytics packages. No branch-deploy contexts, no preview-versus-production split, no webhook URL, no auth redirect URL, no Supabase project id. `metadataBase` and the Paystack callback default are `https://yoloxtreme.tech`. This audit did not request that host and does not claim it serves this code.

The two Netlify URLs in the spec are public sites. They are not described by this `netlify.toml`.

## Feature classification

"Existing and verified" is used only where this run executed the behaviour. Page flows were read and compiled. They were not clicked through against Supabase or Paystack.

| Feature | Class | Evidence |
| --- | --- | --- |
| Naira formatting, slug, countdown math, relative time (`lib/utils.ts`) | Existing and verified | `npm test`: 5 tests passed. |
| App compiles: home, drop, room, onboard, dashboard, drops, new drop, orders | Existing and verified for compile only | `npm run build` exit 0. Routes listed in TEST_RESULTS. Not exercised in a browser. |
| Home feed of `status = live` drops | Existing but unverified | Server component query. With Supabase env unset, build took the demo branch. |
| Demo drops and hero figures ("100+", "∞", six live drops) | UI-only placeholder | Hard-coded in `app/page.tsx`. A banner calls the cards demos. The hero figures do not. |
| Drop page, size, quantity, buyer email, redirect to Paystack | Existing but unverified | `app/d/[slug]/page.tsx`. No end-to-end run. |
| Paystack initialize and webhook signature check | Existing but unverified | Code reviewed. Functions were not invoked. Secret was unset, so this environment cannot be live or sandbox. |
| 10% subaccount split | Blocked by an unresolved decision | Implemented anyway in `pay` and `create-subaccount`. |
| Designer email/password signup | Existing but unverified | `app/onboard/page.tsx`. Creates a `designers` row immediately. No admin approval. |
| Designer dashboard, drop list, order list | Existing but unverified | Reads `drops` and `preorders` for the signed-in designer. |
| Drop publish straight to `live` | Existing but unverified | `app/dashboard/new-drop/page.tsx` inserts `status: 'live'`. |
| Image upload to `drop-images` | Existing but unverified | Client upload. Bucket policies are public-read and any authenticated user can write or delete any object in the bucket. |
| Drop room (posts, reviews, collab) | Existing but unverified | Working route. Spec defers social features. |
| "Verified Designer" badge | UI-only placeholder | Renders `designers.verified`. The owner update policy does not stop the owner setting `verified` true. There is no verification check record. |
| Customer account, order history, sign-in checkout | Not present | Buyers are an email string on `preorders`. |
| Admin, moderation, pause, audit | Not present | No role table. |
| Campaign builder stages, terms versions, separate state machines | Not present | One `drops.status`. |
| Refunds, demand ledger, closing job, fulfilment events, notifications, policies, public tracking | Not present | — |
| Email | Unconfigured integration | No provider and no templates. |
| Supabase, in this environment | Unconfigured integration | Env vars unset. Client substitutes a placeholder URL so import does not throw. |
| Paystack, in this environment | Unconfigured integration | `PAYSTACK_SECRET_KEY` unset. `pay` returns "Payment system not configured" in that case. |
| Side-branch workspace pages (invoices, team directory, timeline, analytics, feedback) | Existing but unverified, and out of the core loop | Present only on `core-pages` and `navigation-pages`. Not on `main`. |
| Vercel Analytics / Speed Insights | Existing but unverified | Mounted in `app/layout.tsx`. No project linkage in source. |

## Preserve / adapt / build new / migrate

### Preserve

- Next.js App Router, TypeScript, Tailwind, and the current route files. Do not replace the app with the Netlify preorder bundle, and do not restart on a new repository.
- Supabase Auth and Postgres as the backend already in the repo. Do not introduce a second database.
- Paystack as the only payment adapter. Do not add another provider.
- Integer kobo amounts, `formatNaira`, `slugify`, and `timeLeft`.
- Webhook HMAC check plus Paystack verify. The drop page's refusal to mark an order paid from the redirect.
- Designer dashboard shell (overview, list, orders) as the start of Designer Studio, after approval exists.
- The `drops` row as the single campaign record. Do not add a parallel `campaigns` table.

### Adapt

- `drops.status` (`live` / `funded` / `producing` / `shipped`) into the spec's separate states. Keep the old column until callers are moved, then stop writing it from the browser.
- `designers.verified` so it is not a public badge and not self-serve. Participation approval becomes its own field. Identity and brand-authority checks come later and start with no public badge.
- Onboard: account creation can stay; creating a sellable designer and a Paystack subaccount in the same submit cannot. Application first, admin approval, payout details only after the settlement decision.
- New-drop form: save a draft. Publishing becomes submit-for-review. Required fields grow to the spec's list.
- Checkout: require a signed-in customer, server-calculated total, delivery area, snapshots. Cap checks move into the server function that creates the payment, not the button.
- Public `designers` read: a view with brand name and public profile only. Bank account, phone, email, and subaccount code come off the public policy.
- Storage policies: owner prefix, size and type already partly checked in the form (5MB, three images). Policies do not enforce that.
- Copy that says the platform runs a factory, handles production, or has 100+ designers. That copy contradicts the spec. Rewriting it is a product change for a later checkpoint, not this one.
- Visual design, after the founder picks the reference. See OPEN_DECISIONS.

### Build new

- Admin membership and the review functions (approve, request changes, reject, pause), all server-side.
- Customer profile and customer order access.
- Product and variant rows, terms versions, moderation events.
- Payment attempt, payment event, refund, and a demand ledger fed only by verified events.
- Scheduled close, threshold result, feasibility review, production updates, per-order fulfilment.
- Policy pages marked DRAFT, versioned, with acceptance stored at checkout. No legal text will be invented.
- In-app notifications. Email stays unconfigured until a provider is chosen.
- Verification workflow with no public badges until the check procedure is approved.

### Migrate, later, and only with approval

No data was read from a hosted database. If rows exist, the mapping to use is:

| Current | Target | Do not |
| --- | --- | --- |
| `designers` row | User profile + designer profile + a participation application | Copy `verified = true` into a verification badge. Do not copy bank fields into a public table. |
| `drops` row | One product, variants from `sizes` at the drop price, and one campaign on that product | Create a second campaign table and leave `drops` alive beside it. |
| `drops.status = live` | Legacy, unreviewed, not orderable, until an admin approves | Treat self-publish as admin approval. |
| `drops.status = funded` | Cap may have been hit (`current_qty >= max_qty`). Threshold stays `not_evaluated` | Treat "funded" as "produce". |
| `drops.status = producing` or `shipped` | Leave production `not_confirmed` and fulfilment `unfulfilled` for a person to review | Mark every order delivered because the drop says shipped. |
| `preorders` | Order + order items (snapshots) + one succeeded payment attempt | Cascade-delete them with the designer. |
| `room_posts` | Leave in place, unused by the core loop | Migrate into notifications or reviews. |
| `designers.paystack_subaccount_code` | Hold. Do not create new ones | Assume the 10% split is an approved fee. |

`ON DELETE CASCADE` from `designers` to `drops` to `preorders` deletes financial history. A later migration should stop cascading from profiles onto orders. That is a destructive-risk change and is not in this checkpoint.

## Security gaps (code review, not a live test)

1. A designer can update their own `designers` row, including `verified` and `paystack_subaccount_code`. There is no column guard.
2. `public_read_designers` is `USING (true)` and clients select `designers(*)`, so email, phone, bank name, account number, and subaccount code are in the public read.
3. The drop owner can update `price`, `status`, `current_qty`, and `max_qty` after orders exist.
4. There is no admin role, so there is also nothing that stops a future "is_admin" column from being self-assigned unless it is never put on a user-writable table.
5. `increment_drop_qty` is `SECURITY DEFINER`. The migration grants it to `service_role` and does not revoke the default `PUBLIC` execute grant. On stock PostgreSQL that leaves it callable by `anon` and `authenticated`. This was not checked on a hosted database.
6. Storage policies let any signed-in user upload, update, or delete any object in the public `drop-images` bucket.
7. Preorder insert is service-role only after the third migration (good). There is no unique constraint on `paystack_ref`. Amount and currency are not re-checked. Demand uses client-supplied metadata quantity.
8. Guest checkout. The spec requires sign-in.
9. Countdown end is enforced in the browser only. `pay` ignores `countdown_end`.
10. Service-role helper exists in the Next.js tree and is unused. It must not be wired to user-controlled requests.
11. Next.js 13.5.1 is in the affected range of the December 2025 RSC denial-of-service advisory. Not patched here.
12. Demo commercial activity is hard-coded on the empty home page.

## What this checkpoint did not do

Did not start sequence step 2. Did not edit application behaviour, payment functions, or migrations. Did not push to `main`, merge, deploy, or call a live Supabase or Paystack API.
