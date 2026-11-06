# Open decisions

Each item is unresolved on purpose. One option is recommended. None of these were implemented in checkpoint 1.

## 1. Which public site is the product?

The Netlify preorder site is a different application from this repo. Its source was not found here.

- Option A. Keep building in this repo. Treat the Netlify preorder site as an external prototype. Do not deploy this repo over it until you say they are the same product.
- Option B. Pause product work until the prototype's repository is identified and named as the source.

Recommendation: A. This repo is the only source in the run, and it already contains the payment and data path the prototype does not appear to run ("No payments are taken"). Confirm before any deploy.

## 2. Visual reference

- Option A. Adoption site: light page, ink `#0A0A0A`, lime `#C8FF1A`, Archivo and Inter. Its content is a community page, not a shop.
- Option B. Live preorder site: ivory `#FAF8F4`, navy `#101C30`, gold `#B58B42`, slate `#64748B`, soft grey `#E5E7EB`, Newsreader and Manrope. This matches the spec's fallback palette and the preorder wording.
- Option C. Keep this repo's black and lime "factory" theme.

Recommendation: B for the public marketplace, when a design checkpoint starts. Do not copy adoption-site sentences, stats, or channel links. Fonts can wait; the factory copy ("we handle production") should not survive into that pass.

## 3. Legal operator

No operator name, address, or registration is in the repo.

Recommendation: live checkout stays blocked until you supply the operator details. Any policy page added before a lawyer reviews it is labelled DRAFT.

## 4. Who receives and settles the money?

The code creates a Paystack subaccount and keeps 10% (`percentage_charge: 10` and `transaction_charge` of 10% of the amount) whenever a designer has a subaccount code. The UI says the designer gets 90%.

- Option A. Leave that split as the pilot rule.
- Option B. Stop creating subaccounts. Take sandbox payments into one platform Paystack account. Record settlement as not yet decided. Move money only after a written rule.

Recommendation: B. The spec lists this as unresolved and forbids assuming a platform fee. Checkpoint 1 does not change the function. The change needs your approval because it changes financial responsibility.

## 5. Refunds: who funds them, and who may start one?

No refund table or Paystack refund call exists.

Recommendation: no refund action in the product until you choose the funding source. When it is built, only an admin function may create it, and a designer cannot mark an order refunded. Goodwill refunds must not automatically remove units.

## 6. Chargebacks

Recommendation: record a dispute on the order and do not assign the loss in code. Responsibility stays a live-launch blocker.

## 7. Reservations and holds

The code does not reserve stock. It checks `current_qty` at initialize time and increments after the webhook.

Recommendation: do not add holds in the MVP. Count a unit only after a verified payment. Enforce the cap in that same server step. If two payments can still oversell, block the extra payment rather than promise the unit.

## 8. Payment that succeeds after close or after the cap

Recommendation: store the verified payment, do not add the units to eligible demand, and queue a refund once refund funding exists. Do not fulfil that order.

## 9. Minimum threshold not reached

`funded` in the current schema means the max quantity was filled, not that a minimum was met. There is no minimum field.

Recommendation: on close, if a minimum was set and paid units are below it, set threshold `not_reached`, do not start production, and notify buyers. Do not auto-refund until decision 5 is made. Say that plainly on the campaign before it opens.

## 10. Support

Recommendation: an in-app support route with no promised reply time. Do not publish an SLA, a phone number, or a delivery guarantee.

## 11. Fee amount

The deferred list says not to assume a platform fee. The code already assumed 10%.

Recommendation: treat 10% as unapproved. New campaigns should not gain a subaccount until you set the number, including the possibility of zero. Do not edit the live function until you accept decision 4.

## 12. Policy text

No Platform Terms, Customer Policy, Designer Policy, Trust policy, or Privacy Notice is in the repo.

Recommendation: you send the drafts. The build records version ids and acceptance. It does not write the legal wording. Checkout stays off while required terms are missing.

## 13. Existing drops, if any exist in a hosted database

This audit did not query a database. The repo cannot show whether `drops` rows exist.

Recommendation: if rows exist, mark `status = live` as legacy and unreviewed, pause them, and take them off public checkout until an admin approves them. Do not treat "the designer pressed launch" as approval.

## 14. Existing designer rows

Signup currently inserts a designer with `verified: false` and can sell immediately, because selling checks the row, not `verified`.

Recommendation: add a participation status and leave existing and new designers `pending` until an admin approves them. Do not auto-approve people who already signed up.

## 15. First admin

There is no admin concept.

Recommendation: a `platform_roles` row created by a SQL change you run for one account you name. No screen may grant admin. The app may only read the caller's own role.

## 16. Hosted Supabase and the Paystack key mode

No project ref is in the repo. No key was present in this environment. The code accepts whatever `PAYSTACK_SECRET_KEY` is.

Recommendation: before the payment checkpoint, confirm the Supabase project, whether it has rows, and that the Paystack key is a test key. Do not paste the key into chat or into git.

## 17. Domain and callback

`metadataBase` and the Paystack callback default are `https://yoloxtreme.tech`. This audit did not prove that host runs this repo.

Recommendation: confirm the domain before any callback or auth redirect change. Until then, do not point a new webhook at a guessed URL.

## 18. Next.js 13.5.1 security upgrade

The 11 December 2025 Next.js advisory says App Router versions `>=13.3` are affected by RSC denial-of-service CVE-2025-55184 / CVE-2025-67779, and names 14.2.35 as the fix line for that range.

Recommendation: a separate checkpoint upgrades Next.js to 14.2.35 (or a later patched 14.2 release), then re-runs typecheck, lint, test, and build. Not this PR. Do not put a public preview of this repo ahead of that upgrade.

## 19. Side-branch workspace pages

`core-pages` and `navigation-pages` add analytics, invoices, a team directory, a task timeline, and a feedback table on top of drops.

Recommendation: leave them unmerged. Analytics and extra workspaces are deferred until the preorder loop works.

## 20. Drop room

Recommendation: keep the files so nothing working is deleted blindly. Do not add features to the room. Remove it from the main journey in a later cleanup once the campaign page exists.
