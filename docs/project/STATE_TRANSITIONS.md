# State transitions

Current transitions are what the code does. Target transitions are the spec. The server functions named here are the step-2 proposal. They are not implemented.

## Current

### Drop `status`

| From | To | Who causes it | Where |
| --- | --- | --- | --- |
| (new row) | `live` | The designer, in the browser insert | `app/dashboard/new-drop/page.tsx` |
| `live` | `funded` | `increment_drop_qty` when `current_qty` reaches `max_qty` | SQL function, called by the webhook |
| anything | any text | The designer, by updating their drop | RLS allows the owner to set `status` |
| `live` | still `live` after `countdown_end` | Nobody closes it | The button hides in the browser. `pay` still accepts `live` |

There is no server path for `producing` or `shipped`. The UI knows the words. Nothing in `main` writes them.

### Preorder `status`

| From | To | Who |
| --- | --- | --- |
| (no row while the buyer is on Paystack) | `paid` | Webhook, on `charge.success` after signature and verify |
| — | `pending` | Default on the column. The webhook does not insert `pending`. |
| — | `shipped` | No writer in `main`. |

A failed or abandoned Paystack session creates no row. There is no `failed` payment state. There is no refund state.

### Designer `verified`

Set false at insert. The owner's update policy can set it true. Nothing reviews it.

## Target machines (kept separate)

Moderation: `draft` → `submitted` → `approved`, or `submitted` → `changes_requested` → `submitted`, or `submitted` → `rejected`.

Ordering: `scheduled` → `open` → `closed`. Close is a scheduled server job, not a page view.

Restriction: `active` ↔ `paused`. Pause stores a reason.

Threshold: `not_evaluated` or `no_threshold`, then `reached` or `not_reached`. Reaching a threshold does not confirm production.

Production: `not_confirmed` → `feasibility_review` → `confirmed` → `preparation` → `in_production` → `quality_review` → `finished`, or `delayed` / `cancelled`.

Fulfilment, per order: `unfulfilled` → `processing` → `dispatched` → `delivered`.

Payment attempt: `pending` → `succeeded` or `failed`.

Refund: `requested` → `processing` → `succeeded` or `failed`.

## Mapping, when a later migration is approved

| Current `drops.status` | Proposed moderation | Proposed ordering | Proposed restriction | Proposed threshold | Proposed production | Also set `status` |
| --- | --- | --- | --- | --- | --- | --- |
| `live` | `draft`, `legacy_unreviewed = true` | `closed` | `paused` | `not_evaluated` | `not_confirmed` | `paused_legacy` |
| `funded` | `draft`, legacy | `closed` | `paused` | `not_evaluated`. Record separately if `current_qty >= max_qty` | `not_confirmed` | `paused_legacy` |
| `producing` | `draft`, legacy | `closed` | `paused` | `not_evaluated` | `not_confirmed` until a person reviews | `paused_legacy` |
| `shipped` | `draft`, legacy | `closed` | `paused` | `not_evaluated` | `not_confirmed`. Do not mark orders delivered | `paused_legacy` |
| any other text | `draft`, legacy | `closed` | `paused` | `not_evaluated` | `not_confirmed` | `paused_legacy` |

`paused_legacy` is not a target state. The current home page and `pay` function only treat `live` as orderable, so this value takes existing rows off sale without pretending they were admin-approved. That write is open decision 13. It is not applied. Adding the new columns without this update leaves `status = 'live'` rows on sale.

| Current `preorders.status` | Payment | Fulfilment |
| --- | --- | --- |
| `paid` | attempt `succeeded`, only if `paystack_ref` is kept | `unfulfilled` |
| `pending` | `pending` | `unfulfilled` |
| `shipped` | leave payment as stored | do not assume `delivered`; queue for review |

## Proposed server transitions (step 2, not built)

All of these run as database functions. The client cannot set the columns.

| Function | Caller | Effect |
| --- | --- | --- |
| `save_campaign_draft` | Owning designer with participation `approved` | Writes product, variants, and a `draft` campaign. Incomplete drafts are allowed. |
| `submit_campaign` | That designer | Requires title, description, images, sizing, at least one active variant, NGN price, open and close times, delivery area and fee, cancellation terms, update commitment. Sets moderation `submitted`. Writes a moderation event. |
| `review_campaign(decision, reason)` | `platform_roles.role = admin`, and the admin is not approving their own designer row | `approve` sets moderation `approved` and ordering `scheduled` or `open` from the times. `request_changes` and `reject` store the reason. Never sets production `confirmed`. |
| `pause_campaign(reason)` | Admin | Restriction `paused`. Checkout reads this and refuses. |
| Open and close | Clock job, not a page | `scheduled` → `open` at `opens_at`. `open` → `closed` at `closes_at`, writes a close-result row. Retry-safe. |

Direct `UPDATE` of moderation, ordering, restriction, threshold, production, `current_qty`, and `price` from `anon` or `authenticated` is rejected by a trigger. After any preorder exists, price, variant, and terms changes go through a new terms version, not an in-place edit. Silence is not acceptance. That versioning is step 2's terms table; enforcing it on live orders waits until orders point at a version.

Checkout in a later step calls one function that refuses unless moderation is `approved`, ordering is `open`, restriction is `active`, and the close time is still in the future.
