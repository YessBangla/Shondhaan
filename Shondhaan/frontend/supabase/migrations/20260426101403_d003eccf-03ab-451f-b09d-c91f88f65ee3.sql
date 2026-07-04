DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read active deal listings" ON public.deal_listings;

CREATE OR REPLACE FUNCTION public.get_public_deal_listings()
RETURNS TABLE (
  id uuid,
  category_id uuid,
  condition text,
  created_at timestamp with time zone,
  description text,
  hide_phone boolean,
  images jsonb,
  inquiries_count integer,
  is_featured boolean,
  is_negotiable boolean,
  location_area text,
  location_district text,
  location_division text,
  phone text,
  price numeric,
  status text,
  title text,
  title_en text,
  updated_at timestamp with time zone,
  user_id uuid,
  views_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.category_id, d.condition, d.created_at, d.description, d.hide_phone,
         d.images, d.inquiries_count, d.is_featured, d.is_negotiable,
         d.location_area, d.location_district, d.location_division,
         CASE WHEN COALESCE(d.hide_phone, false) THEN NULL ELSE d.phone END,
         d.price, d.status, d.title, d.title_en, d.updated_at, d.user_id, d.views_count
  FROM public.deal_listings d
  WHERE d.status IN ('active', 'featured');
$$;
REVOKE ALL ON FUNCTION public.get_public_deal_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_deal_listings() TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view by tracking token" ON public.service_requests;

CREATE OR REPLACE FUNCTION public.get_service_request_status(_tracking_token text)
RETURNS TABLE (
  tracking_token text,
  status text,
  payment_status text,
  division text,
  district text,
  thana text,
  created_at timestamp with time zone,
  first_response_at timestamp with time zone,
  service_completed_at timestamp with time zone,
  resolved_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.tracking_token, s.status, s.payment_status, s.division, s.district, s.thana,
         s.created_at, s.first_response_at, s.service_completed_at, s.resolved_at
  FROM public.service_requests s
  WHERE s.tracking_token = btrim(_tracking_token)
    AND length(btrim(_tracking_token)) BETWEEN 8 AND 128
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_service_request_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_request_status(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view available profiles" ON public.job_seeker_profiles;
DROP POLICY IF EXISTS "Employers and admins can view available profiles" ON public.job_seeker_profiles;
CREATE POLICY "Employers and admins can view available profiles"
ON public.job_seeker_profiles
FOR SELECT
TO authenticated
USING (
  is_available = true
  AND (
    public.has_role(auth.uid(), 'employer')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Anyone can read permissions" ON public.role_permissions;

DROP POLICY IF EXISTS "Job posters can view applicant CVs" ON storage.objects;
DROP POLICY IF EXISTS "Owners employers and admins can view CVs" ON storage.objects;
CREATE POLICY "Owners employers and admins can view CVs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-cvs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.job_portal_applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.user_id::text = (storage.foldername(name))[1]
        AND j.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Vendors can view orders with their products" ON public.mart_orders;
CREATE POLICY "Vendors can view orders with their products"
ON public.mart_orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'mart_vendor')
  AND EXISTS (
    SELECT 1
    FROM public.mart_order_items i
    WHERE i.order_id = mart_orders.id
      AND i.vendor_id = auth.uid()
  )
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['area_representatives','booking_messages','bookings','deal_messages','internal_messages','mart_messages','mart_orders','notifications','rep_earnings','service_requests','withdrawal_requests']
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;