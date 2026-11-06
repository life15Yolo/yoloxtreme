# Build checklist

Sequence from the spec. Status after checkpoint 1.

| Step | Status | Notes |
| --- | --- | --- |
| 1. Audit, preserve working code, project records, test harness | Done in this branch | See AUDIT.md and TEST_RESULTS.md. No application behaviour was changed. |
| 2. Campaign object and approval workflow | Proposed below. Not started | Needs founder acceptance of open decisions 13, 14, and 15 before the migration runs. |
| 3. Block public publication without approval | Not started | Depends on step 2. Today, new drops insert `status: 'live'`. |
| 4. Public preorder page and checkout handoff | Not started | A drop page and Paystack redirect already exist and do not match the spec. |
| 5. Server-side payment verification, dedup, reconciliation | Not started | Webhook signature and verify exist. Dedup, amount check, and the attempt ledger do not. |
| 6. Demand from verified paid units only | Not started | `current_qty` is one counter. |
| 7. Closing, threshold, feasibility | Not started | No scheduler. |
| 8. Buyer updates and per-order fulfilment | Not started | |
| 9. Identity and brand-authority workflow, no public badges | Not started | |
| 10. Versioned policy acceptance | Not started | Blocked on policy drafts. |
| 11. Full buyer, designer, and admin journey tests | Not started | Only `lib/utils.ts` is covered. |
| 12. Preview deploy | Not started | Also blocked on the Next.js advisory until that upgrade checkpoint lands. |

Do not reorder step 2 ahead of an explicit approval. Steps 5 and 6 should stay behind a test key confirmation (open decision 16).

## Checkpoint 1 — completed

- Audited `main` and the other branches.
- Fetched both reference sites.
- Added `docs/project/` records.
- Added Vitest and tests for existing helpers.
- Did not edit pages, SQL, or edge functions.

## Step 2 proposal — campaign object and approval

Not applied. Do not add this file under `supabase/migrations/` until the founder accepts it. It is additive. It does not drop `drops`, `preorders`, or `designers`. It does not create a second table named `campaigns`.

### Schema

```sql
-- PROPOSAL ONLY. Do not run as part of checkpoint 1.

create table public.platform_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now()
);

alter table public.platform_roles enable row level security;

create policy platform_roles_read_own
  on public.platform_roles for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.platform_roles from anon;
revoke insert, update, delete on public.platform_roles from authenticated;

alter table public.designers
  add column participation_status text not null default 'pending'
    check (participation_status in ('pending', 'approved', 'rejected'));

-- Existing rows, if any, stay pending. Do not copy designers.verified.

alter table public.drops
  add column product_id uuid,
  add column moderation_status text not null default 'draft'
    check (moderation_status in ('draft', 'submitted', 'changes_requested', 'approved', 'rejected')),
  add column ordering_status text not null default 'scheduled'
    check (ordering_status in ('scheduled', 'open', 'closed')),
  add column restriction_status text not null default 'active'
    check (restriction_status in ('active', 'paused')),
  add column threshold_status text not null default 'not_evaluated'
    check (threshold_status in ('not_evaluated', 'no_threshold', 'reached', 'not_reached')),
  add column production_status text not null default 'not_confirmed'
    check (production_status in (
      'not_confirmed', 'feasibility_review', 'confirmed', 'preparation',
      'in_production', 'quality_review', 'finished', 'delayed', 'cancelled'
    )),
  add column legacy_unreviewed boolean not null default false,
  add column min_qty integer check (min_qty is null or min_qty >= 0),
  add column opens_at timestamptz,
  add column closes_at timestamptz,
  add column delivery_area text,
  add column delivery_fee_kobo bigint check (delivery_fee_kobo is null or delivery_fee_kobo >= 0),
  add column currency text not null default 'NGN' check (currency = 'NGN'),
  add column pause_reason text;

-- Column defaults apply to existing rows as soon as this alter runs.
-- The home page and pay function still key off drops.status = 'live'.
-- Adding the new columns does not, by itself, take those rows off sale.
-- If decision 13 is accepted, run this in the same transaction:
--
--   update public.drops
--   set moderation_status = 'draft',
--       ordering_status = 'closed',
--       restriction_status = 'paused',
--       threshold_status = 'not_evaluated',
--       production_status = 'not_confirmed',
--       legacy_unreviewed = true,
--       status = 'paused_legacy';
--
-- 'paused_legacy' is not a spec state. It only stops the current
-- status = 'live' checks. Step 3 deletes that dependence.
-- If decision 13 is rejected, do not run the update.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers (id) on delete restrict,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  price_kobo bigint not null check (price_kobo >= 0),
  active boolean not null default true,
  unique (product_id, label)
);

alter table public.drops
  add constraint drops_product_id_fkey
  foreign key (product_id) references public.products (id) on delete restrict;

create unique index drops_one_open_campaign_per_product
  on public.drops (product_id)
  where product_id is not null
    and ordering_status = 'open'
    and restriction_status = 'active'
    and moderation_status = 'approved';

create table public.campaign_terms_versions (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete restrict,
  version integer not null check (version > 0),
  terms jsonb not null,
  created_at timestamptz not null default now(),
  unique (drop_id, version)
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete restrict,
  actor_id uuid references auth.users (id),
  action text not null check (action in ('submit', 'approve', 'request_changes', 'reject', 'pause')),
  reason text,
  created_at timestamptz not null default now()
);
```

RLS for the new tables, in the same migration when it is approved:

- `products` and `product_variants`: owner reads and edits drafts; public read only through an approved open campaign, via a view that does not expose other drafts.
- `campaign_terms_versions`: public read of versions already referenced by an approved campaign; inserts only from the submit function.
- `moderation_events`: designer reads events for their drops; inserts only from functions.
- No policy lets a designer change `participation_status` or any of the new state columns.

Also in that migration, not written out line by line here:

- Revoke `EXECUTE` on `increment_drop_qty` from `PUBLIC`, `anon`, and `authenticated`. Grant it only to `service_role`.
- A `before update` trigger on `drops` and `designers` that rejects changes to state columns, `verified`, `current_qty`, `price`, and `paystack_subaccount_code` when the session is `anon` or `authenticated`.
- Replace `public_read_designers` with a view: `id`, `brand_name`, `participation_status`. Stop selecting bank columns from the client.

### Functions

| Function | Who | What it checks | What it writes |
| --- | --- | --- | --- |
| `submit_campaign(drop_id)` | `auth.uid()` owns the drop, `participation_status = 'approved'`, caller is not an admin acting as themselves to skip review | Required fields listed in the spec's campaign section. At least one active variant. `currency = NGN`. Open time before close time. | Moderation `submitted`. A terms version. A moderation event. |
| `review_campaign(drop_id, decision, reason)` | Caller has `platform_roles.role = 'admin'` and does not own the designer row | Decision is approve, request_changes, or reject. Reason required except for approve. | Moderation column. On approve, ordering `scheduled` if `opens_at` is in the future, otherwise `open`. Does not set production to `confirmed`. Event row. |
| `pause_campaign(drop_id, reason)` | Admin | Reason required. | `restriction_status = paused`, `pause_reason`, event. |

`save` of an incomplete draft stays a normal owner insert or update of non-state columns, only while moderation is `draft` or `changes_requested`.

### Application changes that belong to step 2, still not in this PR

- New-drop screen writes `moderation_status: 'draft'` and stops sending `status: 'live'`.
- Dashboard labels the new columns. It does not offer an Approve button to the designer.
- Home and drop page keep the `status = 'live'` query until step 3. New drafts must not set `live`. Existing rows leave sale only if the decision-13 update sets `status` to `paused_legacy`. Without that update, adding columns does not unpublish them.
- No Paystack change in step 2.

### What step 2 does not include

Customer accounts, webhook dedup, demand ledger, closing job, badges, policy text, deletion of `room_posts`, merging `core-pages`, or the Next.js upgrade.

## Later checkpoints (short)

3. Public queries and `pay` require approved, open, and active. Draft URLs 404 for everyone except the owner.
4. Campaign page uses the same data as the studio preview. Checkout still hands off to the existing `pay` function until step 5 replaces the body of that function.
5. `payment_attempts` and `payment_events`, unique provider reference, amount and currency check, transactional demand update. Sandbox key only.
6. Replace `current_qty` as the source of demand.
7. Scheduled close.
8. Updates and per-order fulfilment.
9. Verification records, no badges issued.
10. Policy acceptance. Checkout refuses without the required versions.
11. Journey tests listed in the spec.
12. Preview deploy, after the Next.js patch and after you name the target site.
