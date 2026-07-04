-- ============================================================================
-- BACKEND AUDIT FIX: Security & Functional Issues
-- ============================================================================

-- 1. DEAL_LISTINGS: Allow public browsing of active listings (currently broken).
--    Phone field will be masked client-side based on hide_phone flag.
--    Sellers who set hide_phone=true: clients should call get_public_deal_listings() RPC.
DROP POLICY IF EXISTS "Public can view active deal listings" ON public.deal_listings;
CREATE POLICY "Public can view active deal listings"
  ON public.deal_listings FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'featured'));

-- 2. SERVICE_REQUESTS: Restrict representatives to assigned requests only.
DROP POLICY IF EXISTS "Representatives can view service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Representatives can update service requests" ON public.service_requests;

-- Add assigned_rep_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='service_requests' AND column_name='assigned_rep_id'
  ) THEN
    ALTER TABLE public.service_requests ADD COLUMN assigned_rep_id UUID;
  END IF;
END $$;

CREATE POLICY "Representatives can view assigned requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'representative'::app_role)
    AND assigned_rep_id = auth.uid()
  );

CREATE POLICY "Representatives can update assigned requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'representative'::app_role)
    AND assigned_rep_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'representative'::app_role)
    AND assigned_rep_id = auth.uid()
  );

-- 3. EMPLOYER_PROFILES: Restrict contact info exposure to authenticated users.
DROP POLICY IF EXISTS "Anyone can read verified employers" ON public.employer_profiles;
CREATE POLICY "Authenticated can read verified employers"
  ON public.employer_profiles FOR SELECT
  TO authenticated
  USING (is_verified = true AND is_active = true);

-- 4. ROLE_PERMISSIONS: Allow authenticated users to read permissions
--    (needed by usePermissions hook for non-admin staff).
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can read permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- 5. JOB_APPLICATIONS: Track ownership for authenticated submissions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='job_applications' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.job_applications ADD COLUMN user_id UUID;
  END IF;
END $$;

-- ============================================================================
-- STORAGE POLICY FIXES
-- ============================================================================

-- 6. APPLICATIONS bucket: require authentication + path scoping
DROP POLICY IF EXISTS "Anyone can upload application files" ON storage.objects;
CREATE POLICY "Authenticated users can upload application files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'applications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. CHAT-ATTACHMENTS bucket: enforce path ownership on uploads
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Users can upload to own chat folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 8. DEAL-IMAGES bucket: explicit SELECT (public bucket) + UPDATE policy
DROP POLICY IF EXISTS "Public can view deal images" ON storage.objects;
CREATE POLICY "Public can view deal images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'deal-images');

DROP POLICY IF EXISTS "Users can update own deal images" ON storage.objects;
CREATE POLICY "Users can update own deal images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'deal-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'deal-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Tighten deal-images upload to enforce path ownership
DROP POLICY IF EXISTS "Authenticated users can upload deal images" ON storage.objects;
CREATE POLICY "Users can upload own deal images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deal-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );