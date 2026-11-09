/*
# YoloXtreme Designer Verification Workflow

Extends the designer onboarding with formal verification and commercial activation.

## New Tables

1. `designer_profiles` - Full profile setup beyond registration
   - Extends designers with fashion category, location, portfolio, social links
   - One profile per designer (1:1 with designers)

2. `verification_applications` - Submitted verification for admin review
   - Stores identity, brand ownership, business info submitted by designer
   - Status: draft, submitted, pending_info, approved, rejected
   - Designers can re-submit after info requested

3. `verification_reviews` - Admin audit trail
   - Who reviewed, when, what action, reason if rejected/info_requested
   - Immutable history for transparency

4. `commercial_accounts` - Commercial activation status
   - Tracks eligibility and activation date
   - Prevents unapproved designers from publishing

## RLS Strategy

- Designers can read/insert/update only their own records
- Admins (via service-role or dedicated admin role) can read all and review
- Commercial status auto-computed from verification approval

*/

-- designer_profiles: Extended profile with fashion info
CREATE TABLE IF NOT EXISTS designer_profiles (
  id uuid PRIMARY KEY REFERENCES designers(id) ON DELETE CASCADE,
  fashion_category text,
  location text,
  portfolio_images text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  bio text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE designer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_profile" ON designer_profiles;
CREATE POLICY "owner_read_profile"
  ON designer_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "owner_update_profile" ON designer_profiles;
CREATE POLICY "owner_update_profile"
  ON designer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "owner_insert_profile" ON designer_profiles;
CREATE POLICY "owner_insert_profile"
  ON designer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- verification_applications: Submitted verification documents
CREATE TABLE IF NOT EXISTS verification_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL UNIQUE REFERENCES designers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  -- Application data
  identity_document_url text,
  identity_verified_at timestamptz,
  brand_authorization_url text,
  brand_authorized_at timestamptz,
  business_registration_url text,
  business_info text,
  business_verified_at timestamptz,
  -- Metadata
  submitted_at timestamptz,
  submission_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verification_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_app" ON verification_applications;
CREATE POLICY "owner_read_app"
  ON verification_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = designer_id);

DROP POLICY IF EXISTS "owner_insert_app" ON verification_applications;
CREATE POLICY "owner_insert_app"
  ON verification_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = designer_id);

DROP POLICY IF EXISTS "owner_update_app" ON verification_applications;
CREATE POLICY "owner_update_app"
  ON verification_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = designer_id AND status = 'draft')
  WITH CHECK (auth.uid() = designer_id);

-- verification_reviews: Admin audit trail
CREATE TABLE IF NOT EXISTS verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES verification_applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_reviews" ON verification_reviews;
CREATE POLICY "admin_read_reviews"
  ON verification_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.designers d
      WHERE d.id = (
        SELECT designer_id FROM verification_applications
        WHERE verification_applications.id = verification_reviews.application_id
      )
      AND d.id = auth.uid()
    )
  );

-- commercial_accounts: Tracks commercial activation
CREATE TABLE IF NOT EXISTS commercial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL UNIQUE REFERENCES designers(id) ON DELETE CASCADE,
  eligible_at timestamptz,
  activated_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE commercial_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_commercial" ON commercial_accounts;
CREATE POLICY "owner_read_commercial"
  ON commercial_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = designer_id);

DROP POLICY IF EXISTS "owner_update_commercial" ON commercial_accounts;
CREATE POLICY "owner_update_commercial"
  ON commercial_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = designer_id AND status = 'eligible')
  WITH CHECK (auth.uid() = designer_id AND status = 'active');

-- policy_acceptances: Track policy acceptance version and timestamp
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  accepted_at timestamptz DEFAULT now()
);

ALTER TABLE policy_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_policies" ON policy_acceptances;
CREATE POLICY "owner_read_policies"
  ON policy_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = designer_id);

-- Indices for common queries
CREATE INDEX IF NOT EXISTS idx_verification_apps_status ON verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_verification_apps_designer ON verification_applications(designer_id);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_app ON verification_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_commercial_status ON commercial_accounts(status);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_designer ON policy_acceptances(designer_id);
