/*
# YoloXtreme - Multi-Designer Preorder Platform Schema

## Overview
Creates the full database schema for a platform where multiple designers launch preorder drops.
Buyers pre-order products, and when a drop reaches its goal, the factory produces and ships.

## New Tables

1. `designers` - Stores designer/brand profiles
   - `id` (uuid PK, linked to auth.users)
   - `brand_name` (text, unique brand name)
   - `email` (text, contact email)
   - `phone` (text, contact phone)
   - `bank_name` (text, payout bank)
   - `account_number` (text, payout account)
   - `paystack_subaccount_code` (text, Paystack subaccount code for split payments)
   - `verified` (boolean, default false)
   - `created_at` (timestamp)

2. `drops` - Individual product drops launched by designers
   - `id` (uuid PK)
   - `designer_id` (uuid FK -> designers)
   - `slug` (text, unique URL slug)
   - `title` (text, product title)
   - `description` (text, product details)
   - `price` (bigint, price in kobo)
   - `max_qty` (int, max preorders to fulfill)
   - `current_qty` (int, current preorder count, default 0)
   - `status` (text: live/funded/producing/shipped, default 'live')
   - `countdown_end` (timestamptz, preorder deadline)
   - `images` (text[], image URLs)
   - `sizes` (text[], available sizes)
   - `created_at` (timestamp)

3. `preorders` - Buyer preorder records
   - `id` (uuid PK)
   - `drop_id` (uuid FK -> drops)
   - `buyer_email` (text)
   - `buyer_name` (text)
   - `size` (text, selected size)
   - `quantity` (int, default 1)
   - `amount` (bigint, amount paid in kobo)
   - `paystack_ref` (text, Paystack transaction reference)
   - `status` (text: pending/paid/shipped, default 'pending')
   - `created_at` (timestamp)

4. `room_posts` - Social discussion posts for each drop
   - `id` (uuid PK)
   - `drop_id` (uuid FK -> drops)
   - `user_id` (uuid, poster - nullable for anonymous)
   - `type` (text: launch/review/question/collab)
   - `content` (text, post body)
   - `created_at` (timestamp)

## Security (RLS)
- `designers`: Public can read (for feed/drop pages). Only owner can update. Authenticated can insert (onboarding).
- `drops`: Public can read (feed/drop pages). Only the designer who owns the drop can insert/update/delete.
- `preorders`: Public can insert (checkout). Designers can read preorders for their own drops. No public read.
- `room_posts`: Public can read and insert (social layer). No update/delete for now.

## Notes
1. All tables have RLS enabled.
2. `drops.designer_id` defaults to auth.uid() so onboarding inserts work seamlessly.
3. Designer-scoped access on drops uses EXISTS subquery against designers table.
4. Preorder access uses EXISTS to verify the requester owns the associated drop's designer.
*/
CREATE TABLE IF NOT EXISTS designers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  email text NOT NULL,
  phone text,
  bank_name text,
  account_number text,
  paystack_subaccount_code text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE designers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_designers" ON designers;
CREATE POLICY "public_read_designers"
  ON designers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_designer" ON designers;
CREATE POLICY "insert_own_designer"
  ON designers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_designer" ON designers;
CREATE POLICY "update_own_designer"
  ON designers FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES designers(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price bigint NOT NULL,
  max_qty int NOT NULL DEFAULT 100,
  current_qty int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live',
  countdown_end timestamptz,
  images text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_drops" ON drops;
CREATE POLICY "public_read_drops"
  ON drops FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_drops" ON drops;
CREATE POLICY "insert_own_drops"
  ON drops FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM designers WHERE designers.id = drops.designer_id AND designers.id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_drops" ON drops;
CREATE POLICY "update_own_drops"
  ON drops FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM designers WHERE designers.id = drops.designer_id AND designers.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM designers WHERE designers.id = drops.designer_id AND designers.id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_drops" ON drops;
CREATE POLICY "delete_own_drops"
  ON drops FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM designers WHERE designers.id = drops.designer_id AND designers.id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  buyer_name text,
  size text,
  quantity int NOT NULL DEFAULT 1,
  amount bigint NOT NULL,
  paystack_ref text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_preorders" ON preorders;
CREATE POLICY "public_insert_preorders"
  ON preorders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "designer_read_own_preorders" ON preorders;
CREATE POLICY "designer_read_own_preorders"
  ON preorders FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM drops
      JOIN designers ON designers.id = drops.designer_id
      WHERE drops.id = preorders.drop_id AND designers.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS room_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'question',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_room_posts" ON room_posts;
CREATE POLICY "public_read_room_posts"
  ON room_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_room_posts" ON room_posts;
CREATE POLICY "auth_insert_room_posts"
  ON room_posts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_room_posts" ON room_posts;
CREATE POLICY "anon_insert_room_posts"
  ON room_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_designer ON drops(designer_id);
CREATE INDEX IF NOT EXISTS idx_preorders_drop ON preorders(drop_id);
CREATE INDEX IF NOT EXISTS idx_room_posts_drop ON room_posts(drop_id);
CREATE INDEX IF NOT EXISTS idx_room_posts_created ON room_posts(drop_id, created_at DESC);
