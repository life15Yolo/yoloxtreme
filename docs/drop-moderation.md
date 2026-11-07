# Drop review

New drops are created as `pending_review`. A direct call to the pay function still refuses every status except `live`, and then refuses the payment itself unless checkout is explicitly in test mode with a test secret. The public drop page does not start a payment.

## Existing campaigns

Migration `supabase/migrations/20261106234800_drop_pending_review.sql` does not update existing rows. A drop that is already `live`, `funded`, `producing`, or `shipped` stays that way. Do not run a manual update that moves existing campaigns back to `pending_review`.

Until this migration is applied, the database still defaults new rows to `live` and a designer can still write that status. Apply the migration before treating review as enforced. After it is applied, the previous app build cannot create a drop because it still sends `status: 'live'`, and the new rules reject that insert. Deploy this app immediately after the migration.

## Admin allowlist

Set this on the Next.js server only:

```bash
ADMIN_EMAIL_ALLOWLIST="founder@example.com,ops@example.com"
```

The value is a comma-separated list of Supabase Auth emails. Comparison is case-insensitive. If the variable is missing or empty, `/api/admin/drops` and `/api/admin/drops/[id]/approve` return 503 and do not read or publish drops.

The server reads the bearer access token, calls Supabase Auth `getUser`, and uses that user id and email. It does not trust an admin flag in the request, and it does not treat `designers.verified` as admin. The verified badge remains a designer profile field. Onboarding still inserts `verified: false`.

Sign in at `/admin` with the auth user's email and password. Create that auth user in Supabase Auth first. Do not put a guessed founder address in the repo or in `NEXT_PUBLIC_*`.

`SUPABASE_SERVICE_ROLE_KEY` stays server-only. The browser never receives it. After the allowlist check, the server uses it to read the pending queue and to call `approve_drop`. A raw service-role update to `live` is still rejected by the database trigger. `approve_drop` is the publish path: it sets `live`, stores the approver's auth user id and the approval time, and updates a row only while it is still `pending_review`. A repeated or overlapping approval does not overwrite the first approver.

Designers can still read their pending drops in the dashboard and update the content columns (title, description, price, quantity limit, countdown, images, sizes, and slug). They cannot update `status`, `current_qty`, `approved_by`, or `approved_at`.

The same migration replaces `increment_drop_qty`. The previous function declared a variable named `max_qty`, and PostgreSQL rejected the update because that name is also a column. The replacement keeps the original rule: lock the row, refuse a quantity past the cap, and move a drop to `funded` only when the cap is reached. It does not publish a pending drop. Execute permission is limited to `service_role`, which is the webhook's existing caller.

## Payouts and checkout

Real checkout is closed. `PAYMENTS_MODE` is unset by default. The pay function returns 403 before it contacts Paystack when the mode is missing, when it is `live` or `production`, or when the secret starts with `sk_live_`, even if that secret is present. The only server path that can reach Paystack is `PAYMENTS_MODE=test` together with an `sk_test_` secret. Do not set that for a public preview until you intend to exercise test checkout. This work did not call Paystack.

There is no automatic Paystack subaccount split. The business target remains 90% to the designer and 10% to the platform after the buyer confirms compliant delivery, with the processing fee paid by the buyer on top. That release is not implemented. Do not treat a Paystack charge as a completed payout.

## Designer privacy

Migration `supabase/migrations/20261107094500_designer_public_profile.sql` removes anonymous access to the `designers` table and limits authenticated reads to the signed-in designer's own row. Public brand name and verification flag come from `designers_public`. Bank name, account number, payout code, email, and phone are not in that view. Owners can still save and read their own bank details. Apply this migration after the pending-review migration. Do not run it against production from this pull request.

## Checks

`npm test` covers creation status, allowlist denial, checkout refusal, and the pay function source. It does not open a payment.

`scripts/run-drop-moderation-sql.sh` creates a scratch local database, applies the migrations, and runs `supabase/tests/drop_moderation_integration.sql`. That script checks the pending default, owner and anon denial, trigger enforcement, admin approval, replay, stock increment on a live drop, and preservation of a pre-migration live row. It does not call Paystack. Do not point it at production.

## Founder actions

1. Apply `supabase/migrations/20261106234800_drop_pending_review.sql` to the hosted database. Do not edit the older migration files and do not rewrite existing drop statuses.
2. Set `ADMIN_EMAIL_ALLOWLIST` in the Next.js server environment to the real admin auth emails.
3. Deploy this Next.js app.
4. Redeploy the `pay` Supabase Edge Function from `supabase/functions/pay` so direct checkout uses the pending-review guard.
5. Sign in at `/admin` and approve a real pending drop only when you want it to become orderable.
