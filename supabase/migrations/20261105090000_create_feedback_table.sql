/*
# Feedback portal

## New table

`feedback` - Feature requests and bug reports submitted by designers.

- `id` (uuid PK)
- `designer_id` (uuid FK -> designers, cascades on delete)
- `type` (text: feature/bug)
- `subject` (text)
- `message` (text)
- `status` (text: open/acknowledged/resolved, default open)
- `created_at` (timestamp)

## Security (RLS)

- Authenticated designers can insert feedback for their own profile.
- Designers can read their own submissions.
- Updates/resolution are handled server-side (service role), not by the client.
*/

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'feature' CHECK (type IN ('feature', 'bug')),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_feedback" ON feedback;
CREATE POLICY "insert_own_feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (designer_id = auth.uid());

DROP POLICY IF EXISTS "read_own_feedback" ON feedback;
CREATE POLICY "read_own_feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (designer_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON feedback FROM anon;
REVOKE UPDATE, DELETE ON feedback FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_feedback_designer ON feedback(designer_id);
