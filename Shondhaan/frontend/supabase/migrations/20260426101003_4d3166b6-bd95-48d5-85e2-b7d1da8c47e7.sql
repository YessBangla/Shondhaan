-- Secure phone-to-email lookup by preventing direct client execution
REVOKE ALL ON FUNCTION public.get_email_by_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_email_by_phone(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_email_by_phone(text) FROM authenticated;

-- Safe helper for clients to retrieve their own server-verified roles without reading role rows broadly
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role ORDER BY role), ARRAY[]::public.app_role[])
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- Replace unsafe public lab report table access with a narrow exact-token status lookup
DROP POLICY IF EXISTS "Anyone can search by tracking id" ON public.lab_test_reports;

CREATE OR REPLACE FUNCTION public.get_lab_report_status(_tracking_id text)
RETURNS TABLE (
  tracking_id text,
  test_name text,
  test_name_en text,
  sample_date date,
  expected_date date,
  status text,
  report_ready boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.tracking_id,
    l.test_name,
    l.test_name_en,
    l.sample_date,
    l.expected_date,
    l.status,
    l.report_ready
  FROM public.lab_test_reports l
  WHERE l.tracking_id = btrim(_tracking_id)
    AND length(btrim(_tracking_id)) BETWEEN 6 AND 64
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_lab_report_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lab_report_status(text) TO anon, authenticated;

-- Lock down public call signaling tables and remove unauthenticated realtime exposure
DROP POLICY IF EXISTS "Anyone can create calls" ON public.calls;
DROP POLICY IF EXISTS "Anyone can update calls" ON public.calls;
DROP POLICY IF EXISTS "Anyone can view own calls" ON public.calls;

CREATE POLICY "Staff can create calls"
ON public.calls
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
);

CREATE POLICY "Staff can view calls"
ON public.calls
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
  OR call_center_user_id = auth.uid()
);

CREATE POLICY "Staff can update calls"
ON public.calls
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
  OR call_center_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
  OR call_center_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Anyone can insert ICE candidates" ON public.call_ice_candidates;
DROP POLICY IF EXISTS "Anyone can view ICE candidates" ON public.call_ice_candidates;

CREATE POLICY "Staff can insert ICE candidates"
ON public.call_ice_candidates
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
);

CREATE POLICY "Staff can view ICE candidates"
ON public.call_ice_candidates
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.calls;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'call_ice_candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.call_ice_candidates;
  END IF;
END $$;

-- Prevent anonymous users from overwriting customer conversation records
DROP POLICY IF EXISTS "Anyone can update own conversations" ON public.chat_conversations;

CREATE POLICY "Owners and staff can update conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'call_center')
);

-- Prevent representatives from creating earnings for other representatives
DROP POLICY IF EXISTS "Reps can insert own earnings" ON public.rep_earnings;

CREATE POLICY "Reps can insert own earnings"
ON public.rep_earnings
FOR INSERT
TO authenticated
WITH CHECK (
  rep_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Make sensitive video CVs and chat attachments private, then add scoped read access
UPDATE storage.buckets
SET public = false
WHERE id IN ('video-cvs', 'chat-attachments');

DROP POLICY IF EXISTS "Anyone can view video cvs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

CREATE POLICY "Owners employers and admins can view video cvs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-cvs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.job_portal_applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.user_id::text = (storage.foldername(name))[1]
        AND j.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'call_center')
  )
);

-- Public image buckets should remain directly usable, but should not be listable through broad object SELECT policies
DROP POLICY IF EXISTS "Anyone can read cms images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view deal images" ON storage.objects;