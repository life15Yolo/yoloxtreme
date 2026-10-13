/*
# Production fixes for YoloXtreme

## Changes

### 1. Add buyer_phone column to preorders
- New column `buyer_phone text` (nullable) to store buyer phone numbers.

### 2. Tighten RLS policies

**preorders:**
- Remove public INSERT policy (anon can no longer insert preorders).
- Preorders are now created exclusively by the service role via the webhook edge function.
- Keep designer-only SELECT (already correct).

**room_posts:**
- Remove anon INSERT policy. Only authenticated users can post.
- Add WITH CHECK (auth.uid() = user_id) to enforce that the poster's user_id matches their session.

**designers:**
- Remove DELETE and INSERT grants from anon role (already policy-restricted, but tighten grants too).
- Keep public SELECT for brand info, owner-only INSERT/UPDATE.

**drops:**
- Keep public SELECT (all drops are publicly viewable).
- Keep owner-only INSERT/UPDATE/DELETE via designer ownership check.

### 3. Atomic increment RPC
- Create `increment_drop_qty` SECURITY DEFINER function that atomically increments current_qty and auto-transitions status to 'funded' when max_qty is reached.
- Prevents race conditions when multiple buyers pay simultaneously.
- Returns the new quantity for logging.

### 4. Revoke excess table grants
- Revoke INSERT/UPDATE/DELETE from anon on preorders (service role bypasses RLS).

## Security
- preorders: only service role (webhook) can insert. Designers can read their own.
- room_posts: authenticated users only for INSERT, with user_id matching auth.uid().
- Atomic RPC prevents overselling beyond max_qty.
*/
-- Add buyer_phone column
ALTER TABLE preorders ADD COLUMN IF NOT EXISTS buyer_phone text;

-- ===== PREORDERS: Remove public insert, tighten to service-role only =====
DROP POLICY IF EXISTS "public_insert_preorders" ON preorders;
-- No replacement INSERT policy -- only service role (which bypasses RLS) can insert.

-- Revoke write grants from anon on preorders
REVOKE INSERT, UPDATE, DELETE ON preorders FROM anon;

-- ===== ROOM_POSTS: Remove anon insert, enforce user_id = auth.uid() =====
DROP POLICY IF EXISTS "anon_insert_room_posts" ON room_posts;
DROP POLICY IF EXISTS "auth_insert_room_posts" ON room_posts;

CREATE POLICY "auth_insert_room_posts"
  ON room_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Revoke insert from anon on room_posts
REVOKE INSERT ON room_posts FROM anon;

-- ===== DESIGNERS: Revoke excess grants from anon =====
REVOKE INSERT, UPDATE, DELETE ON designers FROM anon;

-- ===== DROPS: Revoke excess grants from anon =====
REVOKE INSERT, UPDATE, DELETE ON drops FROM anon;

-- ===== Atomic increment RPC =====
DROP FUNCTION IF EXISTS increment_drop_qty(uuid, int);
CREATE OR REPLACE FUNCTION increment_drop_qty(target_drop_id uuid, qty int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty int;
  max_qty int;
BEGIN
  SELECT drops.current_qty + qty, drops.max_qty
  INTO new_qty, max_qty
  FROM drops
  WHERE drops.id = target_drop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drop not found';
  END IF;

  IF new_qty > max_qty THEN
    RAISE EXCEPTION 'Quantity exceeds max_qty';
  END IF;

  UPDATE drops
  SET current_qty = new_qty,
      status = CASE WHEN new_qty >= max_qty THEN 'funded' ELSE status END
  WHERE drops.id = target_drop_id;

  RETURN new_qty;
END;
$$;

-- Grant execute on the RPC to service_role (used by edge functions)
GRANT EXECUTE ON FUNCTION increment_drop_qty(uuid, int) TO service_role;
