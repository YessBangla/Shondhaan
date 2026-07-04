
-- Fix 1: Recreate payment_summary_daily without SECURITY DEFINER
DROP VIEW IF EXISTS public.payment_summary_daily;

CREATE VIEW public.payment_summary_daily
WITH (security_invoker = true)
AS
SELECT
  date_trunc('day', created_at)::date AS day,
  type,
  status,
  COUNT(*) AS count,
  SUM(amount) AS total_amount
FROM public.payment_ledger
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- Fix 2: Tighten audit_logs INSERT policy
-- Only allow inserts from SECURITY DEFINER trigger (revoke direct INSERT from authenticated users)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- No direct INSERT policy = only SECURITY DEFINER functions/triggers can write
-- (the audit_trigger_fn runs as definer and bypasses RLS)

-- Restrict EXECUTE on create_notification helper to staff only
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated;
