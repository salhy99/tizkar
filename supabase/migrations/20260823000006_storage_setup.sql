-- Phase 6.3-B: Storage Infrastructure Setup

-- Create the private bucket 'invitations_assets'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invitations_assets',
    'invitations_assets',
    false, -- Private bucket
    10485760, -- 10 MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg']
)
ON CONFLICT (id) DO UPDATE 
SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;



-- 1. INSERT Policy: Authenticated users only, must upload to their own user_id folder
CREATE POLICY "Owner INSERT Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'invitations_assets' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. SELECT Policy: Authenticated owners only, must read from their own user_id folder
CREATE POLICY "Owner SELECT Access" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'invitations_assets' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. DELETE Policy: Authenticated owners only, must delete from their own user_id folder
CREATE POLICY "Owner DELETE Access" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'invitations_assets' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: No UPDATE policy is created. Updates are strictly prohibited.
-- Note: Anonymous users have no access because there are no policies granting it.
