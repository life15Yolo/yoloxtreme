/*
# Pending review for new drops

Additive only. This file does not edit earlier migrations and does not change existing drop rows.

## Existing campaigns
Drops that are already live, funded, producing, or shipped stay that way.
Do not mass-unpublish them. There is no UPDATE that rewrites current statuses.
New inserts default to pending_review. The previous default was live.

## Who can publish
Authenticated designers can insert and edit their own pending drops (title, price, images, and the other content columns).
They cannot insert status live, move a drop to live, or write approved_by / approved_at.
approve_drop() is the only intended publish path. It is granted to service_role, runs as its owner,
and updates a row only while status is still pending_review. A second or concurrent approval changes nothing
and raises "drop is not pending review".
The Next.js server may call it only after Supabase Auth verifies the caller and the email is on
ADMIN_EMAIL_ALLOWLIST. designer.verified is not an admin signal.
If that env var is unset, the app fails closed and does not use this function.

## Payouts
Unchanged. Buyer pays the processing fee on top. After a compliant delivery is confirmed,
the designer receives 90% and the platform 10%.
*/

ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.drops
  ALTER COLUMN status SET DEFAULT 'pending_review';

COMMENT ON COLUMN public.drops.approved_by IS
  'Supabase auth user id recorded by approve_drop. Designers cannot set this.';
COMMENT ON COLUMN public.drops.approved_at IS
  'Time approve_drop published the drop. Designers cannot set this.';

CREATE OR REPLACE FUNCTION public.drop_publish_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  publisher name;
BEGIN
  IF current_setting('yoloxtreme.allow_drop_publish', true) IS DISTINCT FROM 'on' THEN
    RETURN false;
  END IF;

  -- The approval function is owned by the migration role. While it runs,
  -- current_user is that owner. Designers and service_role are not that owner.
  IF COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) THEN
    RETURN true;
  END IF;

  SELECT pg_get_userbyid(p.proowner) INTO publisher
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'approve_drop'
    AND n.nspname = 'public'
  LIMIT 1;

  RETURN publisher IS NOT NULL AND current_user = publisher;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_drop_publication()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending_review'
       OR NEW.approved_by IS NOT NULL
       OR NEW.approved_at IS NOT NULL THEN
      IF NOT public.drop_publish_allowed() THEN
        RAISE EXCEPTION 'drops must be created as pending_review without approval metadata';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live')
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      IF NOT public.drop_publish_allowed() THEN
        RAISE EXCEPTION 'only admin approval can publish a drop or edit approval metadata';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drops_enforce_publication ON public.drops;
CREATE TRIGGER drops_enforce_publication
  BEFORE INSERT OR UPDATE ON public.drops
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_drop_publication();

DROP POLICY IF EXISTS "insert_own_drops" ON public.drops;
CREATE POLICY "insert_own_drops"
  ON public.drops FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.designers
      WHERE designers.id = drops.designer_id
        AND designers.id = auth.uid()
    )
    AND status = 'pending_review'
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

REVOKE ALL ON TABLE public.drops FROM anon, authenticated;
GRANT SELECT ON TABLE public.drops TO anon, authenticated;
GRANT INSERT (
  designer_id, slug, title, description, price, max_qty, current_qty,
  status, countdown_end, images, sizes
) ON TABLE public.drops TO authenticated;
GRANT UPDATE (
  slug, title, description, price, max_qty, countdown_end, images, sizes
) ON TABLE public.drops TO authenticated;
GRANT DELETE ON TABLE public.drops TO authenticated;
GRANT ALL ON TABLE public.drops TO service_role;

CREATE OR REPLACE FUNCTION public.approve_drop(target_drop_id uuid, approver_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  approved_by uuid,
  approved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.drops%ROWTYPE;
BEGIN
  IF approve_drop.approver_id IS NULL OR approve_drop.target_drop_id IS NULL THEN
    RAISE EXCEPTION 'drop is not pending review';
  END IF;

  PERFORM set_config('yoloxtreme.allow_drop_publish', 'on', true);

  UPDATE public.drops AS d
  SET
    status = 'live',
    approved_by = approve_drop.approver_id,
    approved_at = now()
  WHERE d.id = approve_drop.target_drop_id
    AND d.status = 'pending_review'
  RETURNING * INTO updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'drop is not pending review';
  END IF;

  RETURN QUERY
  SELECT updated.id, updated.status, updated.approved_by, updated.approved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_drop(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drop_publish_allowed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_drop_publication() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_drop_publication() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.drop_publish_allowed() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_drop(uuid, uuid) TO service_role;

-- The previous increment_drop_qty declared a variable named max_qty, which
-- PostgreSQL treats as ambiguous with drops.max_qty. The quantity rule is the
-- same: lock the row, reject an order past the cap, and move live -> funded
-- only when the cap is reached. It still cannot publish a pending drop.
CREATE OR REPLACE FUNCTION public.increment_drop_qty(target_drop_id uuid, qty int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_qty int;
  quantity_cap int;
BEGIN
  SELECT drops.current_qty + qty, drops.max_qty
  INTO updated_qty, quantity_cap
  FROM drops
  WHERE drops.id = target_drop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drop not found';
  END IF;

  IF updated_qty > quantity_cap THEN
    RAISE EXCEPTION 'Quantity exceeds max_qty';
  END IF;

  UPDATE drops
  SET current_qty = updated_qty,
      status = CASE WHEN updated_qty >= quantity_cap THEN 'funded' ELSE status END
  WHERE drops.id = target_drop_id;

  RETURN updated_qty;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_drop_qty(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_drop_qty(uuid, int) TO service_role;

CREATE INDEX IF NOT EXISTS idx_drops_pending_review
  ON public.drops (created_at)
  WHERE status = 'pending_review';
