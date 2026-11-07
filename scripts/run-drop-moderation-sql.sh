#!/usr/bin/env bash
# Runs the drop-moderation SQL checks against a scratch local database.
# This does not connect to hosted Supabase and does not use payments.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${DROP_MODERATION_TEST_DB:-yolo_drop_moderation_test}"
if [[ ! "$DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Refusing database name: ${DB_NAME}"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed. Apply supabase/migrations/20261106234800_drop_pending_review.sql on a scratch database, then run supabase/tests/drop_moderation_integration.sql."
  exit 1
fi

sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};" >/dev/null
sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};" >/dev/null

PSQL=(sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$ROOT/supabase/tests/prepare_roles.sql" >/dev/null
"${PSQL[@]}" -f "$ROOT/supabase/tests/auth_stub.sql" >/dev/null
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261012234448_create_yoloxtreme_schema.sql" >/dev/null
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261012234928_create_storage_bucket.sql" >/dev/null
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261013001218_production_security_fixes.sql" >/dev/null

# Fixture inserted before the new migration. The migration must leave it live.
"${PSQL[@]}" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'existing@example.com');
INSERT INTO public.designers (id, brand_name, email, verified)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Existing Brand', 'existing@example.com', false);
INSERT INTO public.drops (
  designer_id, slug, title, price, max_qty, status
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'already-live-before-moderation',
  'Existing Live Campaign',
  2500000,
  20,
  'live'
);
SQL

"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261106234800_drop_pending_review.sql" >/dev/null
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261107094500_designer_public_profile.sql" >/dev/null

PRESERVED="$("${PSQL[@]}" -tA -c "SELECT status FROM public.drops WHERE slug = 'already-live-before-moderation';")"
if [[ "$PRESERVED" != "live" ]]; then
  echo "Existing live drop was rewritten to ${PRESERVED}"
  exit 1
fi
echo "existing live drop preserved: ${PRESERVED}"

"${PSQL[@]}" -f "$ROOT/supabase/tests/drop_moderation_integration.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/designer_privacy.sql"

# Committed row for two real sessions. The integration file above rolls back.
"${PSQL[@]}" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'race-owner@example.com');
INSERT INTO public.designers (id, brand_name, email, verified)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Race Brand', 'race-owner@example.com', false);
INSERT INTO public.drops (designer_id, slug, title, price, max_qty, status)
VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'moderation-race',
  'Race',
  1000,
  4,
  'pending_review'
);
SQL

RACE_ID="$("${PSQL[@]}" -tA -c "SELECT id FROM public.drops WHERE slug = 'moderation-race';")"
APPROVER="cccccccc-cccc-4ccc-8ccc-cccccccccccc"

"${PSQL[@]}" -c "SELECT status FROM public.approve_drop('${RACE_ID}'::uuid, '${APPROVER}'::uuid);" >/tmp/drop-approve-a.out 2>/tmp/drop-approve-a.err &
pid_a=$!
"${PSQL[@]}" -c "SELECT status FROM public.approve_drop('${RACE_ID}'::uuid, '${APPROVER}'::uuid);" >/tmp/drop-approve-b.out 2>/tmp/drop-approve-b.err &
pid_b=$!
set +e
wait "$pid_a"
code_a=$?
wait "$pid_b"
code_b=$?
set -e

if [[ "$code_a" -eq 0 && "$code_b" -eq 0 ]]; then
  echo "Concurrent approval both succeeded"
  cat /tmp/drop-approve-a.err /tmp/drop-approve-b.err
  exit 1
fi
if [[ "$code_a" -ne 0 && "$code_b" -ne 0 ]]; then
  echo "Concurrent approval both failed"
  cat /tmp/drop-approve-a.err /tmp/drop-approve-b.err
  exit 1
fi

RACE_STATUS="$("${PSQL[@]}" -tA -c "SELECT status || ':' || approved_by::text FROM public.drops WHERE id = '${RACE_ID}';")"
if [[ "$RACE_STATUS" != "live:${APPROVER}" ]]; then
  echo "Concurrent approval ended as ${RACE_STATUS}"
  exit 1
fi
echo "concurrent approval: one publish, one rejection, approver recorded"

echo "scratch database ${DB_NAME} retains the race fixture only; integration assertions were rolled back"
