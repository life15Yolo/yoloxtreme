-- Repeatable checks for drop moderation. Requires the additive migration
-- 20261106234800_drop_pending_review.sql and a Supabase-compatible auth.uid().
-- Safe to run more than once: the whole script rolls back.
-- Point this at a scratch database, not production.

BEGIN;

-- Hosted Supabase already grants these. The scratch database does not,
-- and the drop ownership policy has to read the designer's row.
GRANT SELECT ON public.designers TO anon, authenticated, service_role;
GRANT SELECT ON public.preorders TO authenticated;

INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-4111-8111-111111111111', 'owner@example.com');

INSERT INTO public.designers (id, brand_name, email, verified)
VALUES ('11111111-1111-4111-8111-111111111111', 'Owner Brand', 'owner@example.com', false);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.drops (designer_id, slug, title, description, price, max_qty)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'moderation-default',
  'Default Status',
  'Created without an explicit status',
  2500000,
  10
);

DO $$
DECLARE
  created_status text;
  column_default text;
BEGIN
  SELECT status INTO created_status FROM public.drops WHERE slug = 'moderation-default';
  IF created_status IS DISTINCT FROM 'pending_review' THEN
    RAISE EXCEPTION 'default insert status was %, expected pending_review', created_status;
  END IF;

  SELECT c.column_default INTO column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'drops' AND c.column_name = 'status';
  IF column_default NOT ILIKE '%pending_review%' THEN
    RAISE EXCEPTION 'drops.status default is %', column_default;
  END IF;
END $$;

INSERT INTO public.drops (
  designer_id, slug, title, price, max_qty, status
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'moderation-explicit',
  'Explicit Pending',
  1800000,
  5,
  'pending_review'
);

DO $$
BEGIN
  UPDATE public.drops
  SET title = 'Edited while pending', description = 'Owner edit still works'
  WHERE slug = 'moderation-default';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'owner could not edit a pending drop';
  END IF;

  IF (SELECT status FROM public.drops WHERE slug = 'moderation-default') IS DISTINCT FROM 'pending_review' THEN
    RAISE EXCEPTION 'owner edit changed status';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.drops (designer_id, slug, title, price, status)
    VALUES ('11111111-1111-4111-8111-111111111111', 'moderation-live-insert', 'Illegal Live', 1000, 'live');
    RAISE EXCEPTION 'owner inserted a live drop';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner inserted a live drop%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%pending_review%' OR SQLERRM ILIKE '%row-level security%' OR SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected live insert error: %', SQLERRM;
      END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE public.drops SET status = 'live' WHERE slug = 'moderation-default';
    RAISE EXCEPTION 'owner published a drop';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner published a drop%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%only admin approval%' OR SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected publish error: %', SQLERRM;
      END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE public.drops
    SET approved_by = '22222222-2222-4222-8222-222222222222',
        approved_at = now()
    WHERE slug = 'moderation-default';
    RAISE EXCEPTION 'owner edited approval metadata';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner edited approval metadata%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%approval metadata%' OR SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected audit error: %', SQLERRM;
      END IF;
  END;
END $$;

RESET ROLE;

-- Column grants are the first gate. Also prove the trigger still blocks a publish
-- if those columns are granted back to the designer role.
GRANT UPDATE (status, approved_by, approved_at) ON public.drops TO authenticated;
GRANT INSERT (approved_by, approved_at) ON public.drops TO authenticated;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    UPDATE public.drops SET status = 'live' WHERE slug = 'moderation-default';
    RAISE EXCEPTION 'owner published after column grant';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner published after column grant%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%only admin approval%' THEN
        RAISE EXCEPTION 'trigger did not block publish: %', SQLERRM;
      END IF;
  END;

  BEGIN
    UPDATE public.drops
    SET approved_at = now()
    WHERE slug = 'moderation-default';
    RAISE EXCEPTION 'owner wrote approved_at after column grant';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner wrote approved_at after column grant%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%approval metadata%' THEN
        RAISE EXCEPTION 'trigger did not block audit edit: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM set_config('yoloxtreme.allow_drop_publish', 'on', true);
    UPDATE public.drops SET status = 'live' WHERE slug = 'moderation-default';
    RAISE EXCEPTION 'owner published by setting the publish flag';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner published by setting the publish flag%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%only admin approval%' THEN
        RAISE EXCEPTION 'publish flag bypassed the trigger: %', SQLERRM;
      END IF;
  END;
END $$;

RESET ROLE;

REVOKE UPDATE (status, approved_by, approved_at) ON public.drops FROM authenticated;
REVOKE INSERT (approved_by, approved_at) ON public.drops FROM authenticated;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.approve_drop(
      (SELECT id FROM public.drops WHERE slug = 'moderation-default'),
      '22222222-2222-4222-8222-222222222222'
    );
    RAISE EXCEPTION 'authenticated user executed approve_drop';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%authenticated user executed approve_drop%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected approve_drop denial: %', SQLERRM;
      END IF;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.drops (designer_id, slug, title, price, status)
    VALUES ('11111111-1111-4111-8111-111111111111', 'anon-live', 'Anon', 1000, 'live');
    RAISE EXCEPTION 'anon inserted a drop';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%anon inserted a drop%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected anon insert error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    INSERT INTO public.preorders (drop_id, buyer_email, amount)
    VALUES (
      (SELECT id FROM public.drops WHERE slug = 'moderation-default'),
      'buyer@example.com',
      2500000
    );
    RAISE EXCEPTION 'anon inserted a preorder';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%anon inserted a preorder%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%permission denied%' OR SQLERRM ILIKE '%row-level security%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected preorder insert error: %', SQLERRM;
      END IF;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.increment_drop_qty(
      (SELECT id FROM public.drops WHERE slug = 'moderation-default'),
      1
    );
    RAISE EXCEPTION 'owner incremented stock directly';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner incremented stock directly%' THEN
        RAISE;
      END IF;
      IF SQLERRM ILIKE '%permission denied%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'unexpected stock denial: %', SQLERRM;
      END IF;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE service_role;

DO $$
DECLARE
  approved_status text;
  approved_user uuid;
  approved_time timestamptz;
  direct_error text;
BEGIN
  BEGIN
    PERFORM set_config('yoloxtreme.allow_drop_publish', 'on', true);
    UPDATE public.drops SET status = 'live' WHERE slug = 'moderation-explicit';
    RAISE EXCEPTION 'service role raw update published a drop';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%service role raw update published a drop%' THEN
        RAISE;
      END IF;
      direct_error := SQLERRM;
      IF direct_error NOT ILIKE '%only admin approval%' THEN
        RAISE EXCEPTION 'service role raw publish was not trigger-blocked: %', direct_error;
      END IF;
  END;

  SELECT result.status, result.approved_by, result.approved_at
  INTO approved_status, approved_user, approved_time
  FROM public.approve_drop(
    (SELECT id FROM public.drops WHERE slug = 'moderation-explicit'),
    '33333333-3333-4333-8333-333333333333'
  ) AS result;

  IF approved_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'approval status was %', approved_status;
  END IF;
  IF approved_user IS DISTINCT FROM '33333333-3333-4333-8333-333333333333'::uuid THEN
    RAISE EXCEPTION 'approver was not recorded';
  END IF;
  IF approved_time IS NULL THEN
    RAISE EXCEPTION 'approval timestamp was not recorded';
  END IF;

  BEGIN
    PERFORM public.approve_drop(
      (SELECT id FROM public.drops WHERE slug = 'moderation-explicit'),
      '44444444-4444-4444-8444-444444444444'
    );
    RAISE EXCEPTION 'replayed approval succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%replayed approval succeeded%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%not pending review%' THEN
        RAISE EXCEPTION 'unexpected replay error: %', SQLERRM;
      END IF;
  END;

  IF (
    SELECT approved_by FROM public.drops WHERE slug = 'moderation-explicit'
  ) IS DISTINCT FROM '33333333-3333-4333-8333-333333333333'::uuid THEN
    RAISE EXCEPTION 'replay changed the recorded approver';
  END IF;
END $$;

-- Live stock behavior stays on the existing increment function.
DO $$
DECLARE
  live_id uuid;
  qty int;
  next_status text;
BEGIN
  SELECT id INTO live_id FROM public.drops WHERE slug = 'moderation-explicit';
  SELECT public.increment_drop_qty(live_id, 1) INTO qty;
  SELECT status INTO next_status FROM public.drops WHERE id = live_id;
  IF qty IS DISTINCT FROM 1 OR next_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'live stock increment changed unexpectedly: qty %, status %', qty, next_status;
  END IF;
END $$;

RESET ROLE;

-- The seeded campaign from before this migration must still be live if present.
DO $$
DECLARE
  preserved text;
BEGIN
  SELECT status INTO preserved FROM public.drops WHERE slug = 'already-live-before-moderation';
  IF preserved IS NULL THEN
    RAISE EXCEPTION 'expected pre-migration live fixture already-live-before-moderation';
  END IF;
  IF preserved IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'existing live drop was rewritten to %', preserved;
  END IF;
END $$;

SELECT 'drop moderation sql checks passed' AS result;

ROLLBACK;
