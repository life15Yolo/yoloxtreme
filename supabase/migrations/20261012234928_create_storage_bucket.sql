/*
# Create storage bucket for drop images

1. Creates a public storage bucket `drop-images` for designers to upload product photos.
2. Adds storage policies allowing authenticated users to upload, and public read access.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('drop-images', 'drop-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_drop_images" ON storage.objects;
CREATE POLICY "auth_upload_drop_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drop-images');

DROP POLICY IF EXISTS "public_read_drop_images" ON storage.objects;
CREATE POLICY "public_read_drop_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'drop-images');

DROP POLICY IF EXISTS "auth_update_drop_images" ON storage.objects;
CREATE POLICY "auth_update_drop_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'drop-images');

DROP POLICY IF EXISTS "auth_delete_drop_images" ON storage.objects;
CREATE POLICY "auth_delete_drop_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'drop-images');
