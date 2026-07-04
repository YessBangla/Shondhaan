-- Replace permissive public INSERT checks with bounded validation rules while preserving public form submissions
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.chat_conversations;
CREATE POLICY "Anyone can insert conversations"
ON public.chat_conversations
FOR INSERT
TO public
WITH CHECK (
  length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(customer_phone)) BETWEEN 6 AND 30
  AND (customer_email IS NULL OR length(btrim(customer_email)) <= 255)
  AND (service_interest IS NULL OR length(btrim(service_interest)) <= 160)
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert messages"
ON public.chat_messages
FOR INSERT
TO public
WITH CHECK (
  length(btrim(content)) BETWEEN 1 AND 4000
  AND role IN ('user', 'assistant', 'system')
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = conversation_id
      AND c.is_active = true
  )
);

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (
  length(btrim(name)) BETWEEN 2 AND 120
  AND length(btrim(email)) BETWEEN 5 AND 255
  AND position('@' in email) > 1
  AND length(btrim(message)) BETWEEN 5 AND 3000
  AND (phone IS NULL OR length(btrim(phone)) BETWEEN 6 AND 30)
);

DROP POLICY IF EXISTS "Anyone can insert job applications" ON public.job_applications;
CREATE POLICY "Anyone can insert job applications"
ON public.job_applications
FOR INSERT
TO public
WITH CHECK (
  length(btrim(full_name)) BETWEEN 2 AND 120
  AND length(btrim(phone)) BETWEEN 6 AND 30
  AND length(btrim(address)) BETWEEN 5 AND 500
  AND length(btrim(service_category)) BETWEEN 2 AND 120
  AND length(btrim(nid_front_url)) BETWEEN 8 AND 1000
  AND length(btrim(nid_back_url)) BETWEEN 8 AND 1000
  AND (email IS NULL OR length(btrim(email)) <= 255)
);

DROP POLICY IF EXISTS "Anyone can insert service requests" ON public.service_requests;
CREATE POLICY "Anyone can insert service requests"
ON public.service_requests
FOR INSERT
TO public
WITH CHECK (
  length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(customer_phone)) BETWEEN 6 AND 30
  AND length(btrim(division)) BETWEEN 2 AND 80
  AND length(btrim(district)) BETWEEN 2 AND 80
  AND (thana IS NULL OR length(btrim(thana)) <= 120)
  AND (detail_area IS NULL OR length(btrim(detail_area)) <= 300)
  AND length(btrim(service_description)) BETWEEN 5 AND 2000
);