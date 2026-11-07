-- Repeatable privacy checks. Requires 20261107094500_designer_public_profile.sql.
-- Rolls back. Do not point this at production.

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('55555555-5555-4555-8555-555555555555', 'owner-private@example.com'),
  ('66666666-6666-4666-8666-666666666666', 'other-private@example.com');

INSERT INTO public.designers (
  id, brand_name, email, phone, bank_name, account_number, paystack_subaccount_code, verified
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  'Private Brand',
  'owner-private@example.com',
  '+2348000000000',
  'GTBank',
  '0123456789',
  'ACCT_test_private',
  false
);

SELECT set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  seen text;
BEGIN
  SELECT bank_name INTO seen
  FROM public.designers
  WHERE id = '55555555-5555-4555-8555-555555555555';
  IF seen IS DISTINCT FROM 'GTBank' THEN
    RAISE EXCEPTION 'owner could not read own bank name, saw %', seen;
  END IF;

  BEGIN
    UPDATE public.designers SET verified = true WHERE id = auth.uid();
    RAISE EXCEPTION 'owner self-verified';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%owner self-verified%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%cannot change verification%' THEN
        RAISE EXCEPTION 'self-verification was not blocked: %', SQLERRM;
      END IF;
  END;

  UPDATE public.designers
  SET account_number = '1098765432'
  WHERE id = auth.uid();
  IF (SELECT account_number FROM public.designers WHERE id = auth.uid()) IS DISTINCT FROM '1098765432' THEN
    RAISE EXCEPTION 'owner could not update own account number';
  END IF;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  seen int;
BEGIN
  SELECT count(*) INTO seen
  FROM public.designers
  WHERE id = '55555555-5555-4555-8555-555555555555';
  IF seen <> 0 THEN
    RAISE EXCEPTION 'another designer read a private designer row';
  END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM bank_name FROM public.designers;
    RAISE EXCEPTION 'anon read designer bank fields';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%anon read designer bank fields%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT ILIKE '%permission denied%' THEN
        RAISE EXCEPTION 'unexpected anon designers read: %', SQLERRM;
      END IF;
  END;
END $$;

DO $$
DECLARE
  brand text;
BEGIN
  SELECT brand_name INTO brand
  FROM public.designers_public
  WHERE id = '55555555-5555-4555-8555-555555555555';
  IF brand IS DISTINCT FROM 'Private Brand' THEN
    RAISE EXCEPTION 'public projection missed the brand, saw %', brand;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'designers_public'
      AND column_name IN ('bank_name', 'account_number', 'paystack_subaccount_code', 'email', 'phone')
  ) THEN
    RAISE EXCEPTION 'public designer projection exposes a private column';
  END IF;
END $$;

RESET ROLE;
SELECT 'designer privacy sql checks passed' AS result;
ROLLBACK;
