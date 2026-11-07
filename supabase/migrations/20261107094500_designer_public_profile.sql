/*
# Public designer projection

Bank details, payout account codes, email, and phone were readable by anyone
because designers allowed public SELECT on the whole row.

This does not rewrite designer rows. Owners can still read and update their own
bank details. Everyone else uses designers_public, which has no payout or
contact columns.

Anonymous clients cannot select the designers table. Authenticated clients can
select only their own row.
*/

CREATE OR REPLACE VIEW public.designers_public
WITH (security_barrier = true, security_invoker = false) AS
SELECT id, brand_name, verified, created_at
FROM public.designers;

REVOKE ALL ON public.designers_public FROM PUBLIC;
GRANT SELECT ON public.designers_public TO anon, authenticated, service_role;

REVOKE SELECT ON public.designers FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.designers TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.verified IS TRUE
     AND COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) IS FALSE THEN
    RAISE EXCEPTION 'designers cannot self-verify';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.verified IS DISTINCT FROM OLD.verified
     AND COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) IS FALSE THEN
    RAISE EXCEPTION 'designers cannot change verification';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS designers_prevent_self_verification ON public.designers;
CREATE TRIGGER designers_prevent_self_verification
  BEFORE INSERT OR UPDATE ON public.designers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_verification();

DROP POLICY IF EXISTS "public_read_designers" ON public.designers;
DROP POLICY IF EXISTS "owner_read_own_designer" ON public.designers;
CREATE POLICY "owner_read_own_designer"
  ON public.designers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
