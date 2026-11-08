# Release blockers

This build is a functional development codebase with an incomplete preorder path. It is not a sandbox pilot candidate and not a live-launch candidate.

## Blocks any public preview of this repo

| Blocker | Why |
| --- | --- |
| Next.js 13.5.1 is in the affected range of the December 2025 RSC denial-of-service advisory (CVE-2025-55184 / CVE-2025-67779). The advisory names 14.2.35 as the fix for the `>=13.3` line. | `npm install` warned. The advisory was read. Upgrade is a separate checkpoint. |
| No environment split is documented in the repo, and no target site is tied to `netlify.toml`. | Deploying `main` could be pointed at the wrong Netlify site, including the existing preorder prototype, which is not this codebase. |
| Demo home page presents invented designer counts and demo products. | The spec forbids showing demo activity as genuine. The banner only covers the cards. |

## Blocks calling this a sandbox pilot

| Blocker | Why |
| --- | --- |
| Designers publish `live` with no admin approval. | Core loop step is missing. |
| No admin role. | Nobody can approve. |
| Buyers are not accounts. Checkout is not signed in. | Spec requirement. |
| One `status` column covers sale, cap, production, and shipping. | State machines are collapsed. |
| Demand is `current_qty`, incremented from webhook metadata, with no unique payment reference. | Repeat or raced events can mis-count. A failed increment is not repaired on retry. |
| Cap is checked before payment and not held. | Two payments can pass. |
| Countdown is not enforced in `pay`. | Late payment still initializes. |
| `designers.verified` is owner-writable, and bank details are publicly readable. | Access model is not the spec. |
| `increment_drop_qty` may still be executable by `PUBLIC`. | Migration does not revoke it. Not confirmed on a host. |
| Storage policies allow any signed-in user to overwrite any drop image. | |
| 10% split is hard-coded while fees are an open decision. | Do not run onboarding against a real Paystack account until decision 4 is made. |
| No automated tests beyond `lib/utils.ts`. | Spec's security and payment tests are not run. |
| Supabase and Paystack were unset here. | The integrations are unconfigured in this environment and unverified against a project. |

## Blocks live launch (spec section 25)

All of the above, plus:

- Legal operator and seller relationship are not settled.
- Payment-provider mode (test versus live) is not visible in the repo.
- Settlement, refund funding, and chargeback responsibility are open.
- Reservation and late-payment rules are open. Recommended rule is "no holds; quarantine late payments" and it is not built.
- Threshold-failure policy is open and not built.
- No founder-approved policy texts, so acceptance cannot be recorded.
- Support ownership is open.
- Backup and restore are not documented against a real project and were not checked.
- No explicit founder authorization to take live payments.
- Verification badges must not be shown. The current badge is a boolean.

## Not a blocker for checkpoint 2's proposal review

The absence of a browser pass in this environment. The next code checkpoint can still be the campaign schema, after the open decisions it depends on are answered. It should not be deployed.
