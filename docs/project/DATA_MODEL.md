# Data model

Current tables are what the SQL files create. Nothing below was applied to a database in this checkpoint. "Target" is the spec. The step-2 shape is the proposal in BUILD_CHECKLIST.md, not a migration in `supabase/migrations/`.

## Current tables

### `designers`

| Column | Notes |
| --- | --- |
| `id` | UUID, primary key, references `auth.users`, `ON DELETE CASCADE`. |
| `brand_name` | Unique is described in the migration comment, not enforced by a constraint in the SQL. |
| `email`, `phone` | Contact fields. Publicly readable. |
| `bank_name`, `account_number`, `paystack_subaccount_code` | Payout fields. Publicly readable. Account number is stored in clear text. |
| `verified` | Boolean, default false. Owner can set it. Not a verification-check record. |
| `created_at` | `timestamptz`, default `now()`. |

There is no separate user profile. A buyer does not get a row. A person becomes a designer by inserting this row at signup.

### `drops`

This is the only product and the only campaign.

| Column | Notes |
| --- | --- |
| `id`, `designer_id` | `designer_id` references `designers` and defaults to `auth.uid()`, `ON DELETE CASCADE`. |
| `slug` | Unique. |
| `title`, `description` | Product copy. |
| `price` | `bigint`, kobo. Matches the spec's minor-unit rule. |
| `max_qty`, `current_qty` | Cap and a single counter. `current_qty` is not split into pending, paid, cancelled, or refunded. |
| `status` | Text, default `live`. Comment says `live` / `funded` / `producing` / `shipped`. No check constraint. |
| `countdown_end` | Optional deadline. Not enforced by `pay`. |
| `images`, `sizes` | Text arrays. Sizes are labels, not variants with their own price. |
| `created_at` | `timestamptz`. |

No open time, minimum, delivery fee, delivery area, terms version, or currency column. Currency is assumed NGN in the Paystack call.

### `preorders`

| Column | Notes |
| --- | --- |
| `drop_id` | References `drops`, `ON DELETE CASCADE`. |
| `buyer_email`, `buyer_name`, `buyer_phone` | No `buyer_id`. Phone added in the third migration. |
| `size`, `quantity` | Free text size. |
| `amount` | `bigint` kobo. |
| `paystack_ref` | Not unique. |
| `status` | Text, default `pending`. Comment says `pending` / `paid` / `shipped`. The webhook inserts `paid` directly. No check constraint. |
| `created_at` | `timestamptz`. |

Missing from an order snapshot: currency, delivery fee, address, campaign terms version, policy versions, variant id, product title at purchase time. The row points at the live drop, so a later title or price edit changes what the order appears to be.

### `room_posts`

`drop_id`, nullable `user_id`, `type` (`launch` / `review` / `question` / `collab`), `content`, `created_at`. Public read. This is the deferred social feature.

### Function `increment_drop_qty(uuid, int)`

Locks the drop, adds the quantity, raises if the result exceeds `max_qty`, and sets `status` to `funded` when the new quantity reaches the cap. Returns the new quantity. `SECURITY DEFINER`. Execute is granted to `service_role` and the default public grant is not revoked in the migration.

### Storage `drop-images`

Public bucket. Authenticated insert, update, and delete on the whole bucket. Public read.

### Not in the schema

User profile separate from designer, designer application, verification check, product, product variant, media records, campaign terms version, quantity hold, payment attempt, payment event, refund, unit adjustment, campaign close result, production update, fulfilment event, notification, moderation event, audit event, policy version, policy acceptance, platform role.

`core-pages` (not on `main`) adds a `feedback` table. It is not part of `main`.

## Spec entities, mapped

| Spec entity | Current representation | Duplicate risk |
| --- | --- | --- |
| User profile | `auth.users` only | Low until a profile table exists. |
| Designer profile | `designers` | High if a new profile is added and this row is also kept as the public profile with bank fields. |
| Designer application | The signup insert | The application and the approved profile are the same row. |
| Verification check | `designers.verified` boolean | Do not migrate this boolean into a check record as "verified". |
| Product | Fields on `drops` | High if a `products` table is added and `drops` still owns title, images, and price. |
| Product variant | `drops.sizes text[]` plus one `price` | A variant table must become the price source, and `drops.price` must stop being authoritative. |
| Media | `drops.images text[]` and storage objects | URLs on the drop are not owned media rows. |
| Campaign | The `drops` row | Do not add `campaigns` beside `drops`. |
| Campaign terms version | Missing. Description text can be edited in place. | — |
| Order / order item | `preorders` | One row is both the order and the line. |
| Quantity hold | Missing. `current_qty` is updated only after payment. | Do not also increment `current_qty` from a hold. |
| Payment attempt / event | Paystack reference on the preorder | The attempt and the order are collapsed. |
| Refund | Missing | — |
| Unit adjustment | Missing. Counter only moves up. | — |
| Close result, production update, fulfilment event | Collapsed into `drops.status` and `preorders.status` | A drop status of `shipped` is not per-order fulfilment. |
| Notification, moderation event, audit event | Missing | — |
| Policy version / acceptance | Missing | — |

## State columns today versus the spec

| Spec machine | Current field | Collision |
| --- | --- | --- |
| Moderation | None. Insert sets `live`. | Self-publish. |
| Ordering | `countdown_end` in the browser, plus `status = live`. | A drop stays `live` in the database after the timer. |
| Restriction | None. | No pause. |
| Threshold | `status = funded` when `current_qty >= max_qty`. | That is a cap, not a minimum. It is also written by the quantity function, so cap and "funded" share a column with production. |
| Production | `producing` on the drop. | Not a per-campaign production record, and not separated from ordering. |
| Fulfilment | `preorders.status = shipped`, `drops.status = shipped`. | One flag can be read as "the campaign shipped". |
| Payment | `preorders.status` `pending` or `paid`. | Same column as fulfilment. |
| Refund | None. | — |

## Target rules to keep when the model grows

- Money in integer kobo plus `currency` (`NGN` for the pilot).
- Timestamps in UTC.
- Orders store copies of title, variant label, unit price, delivery fee, address, terms version, and policy versions.
- Do not store card numbers.
- Do not put identity documents in a publicly readable table or bucket.
- Do not cascade-delete `preorders` or future payment rows.
- One open, active campaign per product in the MVP.
- Private evidence is a different bucket from `drop-images`, not public.
