
-- ============================================
-- 1. APPROVAL QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS public.approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'service' | 'deal' | 'job' | 'vendor_shop' | 'refund'
  entity_id UUID NOT NULL,
  submitted_by UUID,
  submitter_name TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  priority TEXT NOT NULL DEFAULT 'normal', -- low|normal|high|urgent
  reviewed_by UUID,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval queue" ON public.approval_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'moderator'));

CREATE POLICY "Submitters view own items" ON public.approval_queue
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());

CREATE POLICY "Authenticated submit items" ON public.approval_queue
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE TRIGGER trg_approval_queue_updated_at
  BEFORE UPDATE ON public.approval_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_approval_queue_status ON public.approval_queue(status, created_at DESC);
CREATE INDEX idx_approval_queue_entity ON public.approval_queue(entity_type, entity_id);

-- ============================================
-- 2. DISPUTES & REFUND WORKFLOW
-- ============================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT UNIQUE NOT NULL DEFAULT ('DSP-' || to_char(now(),'YYMMDD') || '-' || lpad((floor(random()*9999))::text, 4, '0')),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_phone TEXT,
  category TEXT NOT NULL, -- complaint|refund|service_issue|delivery|payment|other
  subject TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT, -- booking|mart_order|deal|job
  related_entity_id UUID,
  refund_amount NUMERIC,
  refund_status TEXT, -- requested|approved|rejected|paid
  status TEXT NOT NULL DEFAULT 'open', -- open|in_progress|escalated|resolved|closed
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  sla_due_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own disputes" ON public.disputes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff manage disputes" ON public.disputes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'call_center') OR has_role(auth.uid(),'finance') OR has_role(auth.uid(),'supervisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'call_center') OR has_role(auth.uid(),'finance') OR has_role(auth.uid(),'supervisor'));

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_disputes_user ON public.disputes(user_id, created_at DESC);
CREATE INDEX idx_disputes_status ON public.disputes(status, sla_due_at);

-- Dispute messages
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view dispute msgs" ON public.dispute_messages
  FOR SELECT TO authenticated
  USING (
    (NOT is_internal AND EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND d.user_id = auth.uid()))
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
    OR has_role(auth.uid(),'call_center') OR has_role(auth.uid(),'finance') OR has_role(auth.uid(),'supervisor')
  );

CREATE POLICY "Users send dispute msgs" ON public.dispute_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND d.user_id = auth.uid())
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
      OR has_role(auth.uid(),'call_center') OR has_role(auth.uid(),'finance') OR has_role(auth.uid(),'supervisor')
    )
  );

-- Notify customer when dispute status changes
CREATE OR REPLACE FUNCTION public.notify_dispute_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'অভিযোগ গৃহীত হয়েছে — ' || NEW.ticket_no,
      'আপনার অভিযোগ "' || NEW.subject || '" গৃহীত হয়েছে। শীঘ্রই যোগাযোগ করা হবে।',
      'dispute', '/disputes/' || NEW.id::text, 'high'
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'অভিযোগ আপডেট — ' || NEW.ticket_no,
      'স্ট্যাটাস: ' || NEW.status,
      'dispute', '/disputes/' || NEW.id::text, 'high'
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dispute_notify
  AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_change();

-- ============================================
-- 3. DAILY STATS SNAPSHOT (for dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_stats_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_bookings INT DEFAULT 0,
  new_bookings INT DEFAULT 0,
  completed_bookings INT DEFAULT 0,
  cancelled_bookings INT DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  new_users INT DEFAULT 0,
  new_deals INT DEFAULT 0,
  new_jobs INT DEFAULT 0,
  open_disputes INT DEFAULT 0,
  pending_approvals INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_stats_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view stats" ON public.daily_stats_snapshot
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'supervisor') OR has_role(auth.uid(),'finance'));

-- Snapshot generator
CREATE OR REPLACE FUNCTION public.generate_daily_snapshot()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.daily_stats_snapshot (
    snapshot_date, total_bookings, new_bookings, completed_bookings, cancelled_bookings,
    total_revenue, new_users, new_deals, new_jobs, open_disputes, pending_approvals
  )
  VALUES (
    _today,
    (SELECT COUNT(*) FROM public.bookings),
    (SELECT COUNT(*) FROM public.bookings WHERE created_at::date = _today),
    (SELECT COUNT(*) FROM public.bookings WHERE status='completed' AND updated_at::date = _today),
    (SELECT COUNT(*) FROM public.bookings WHERE status='cancelled' AND updated_at::date = _today),
    (SELECT COALESCE(SUM(package_price),0) FROM public.bookings WHERE status='completed' AND updated_at::date = _today),
    (SELECT COUNT(*) FROM public.profiles WHERE created_at::date = _today),
    (SELECT COUNT(*) FROM public.deal_listings WHERE created_at::date = _today),
    0,
    (SELECT COUNT(*) FROM public.disputes WHERE status IN ('open','in_progress','escalated')),
    (SELECT COUNT(*) FROM public.approval_queue WHERE status='pending')
  )
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_bookings = EXCLUDED.total_bookings,
    new_bookings = EXCLUDED.new_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    total_revenue = EXCLUDED.total_revenue,
    new_users = EXCLUDED.new_users,
    new_deals = EXCLUDED.new_deals,
    open_disputes = EXCLUDED.open_disputes,
    pending_approvals = EXCLUDED.pending_approvals;
END; $$;

-- ============================================
-- 4. CRON AUTOMATION
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Auto-deactivate expired offers/coupons
CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cms_special_offers SET is_active=false
    WHERE is_active=true AND expires_at IS NOT NULL AND expires_at < now();
  UPDATE public.coupons SET is_active=false
    WHERE is_active=true AND expires_at IS NOT NULL AND expires_at < now();
END; $$;

-- Auto-cancel stale pending bookings (>48h)
CREATE OR REPLACE FUNCTION public.auto_cancel_stale_bookings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bookings
  SET status='cancelled', updated_at=now()
  WHERE status='pending' AND created_at < now() - INTERVAL '48 hours';
END; $$;

-- Schedule daily 1am
SELECT cron.schedule('cleanup-expired-daily', '0 1 * * *', $$SELECT public.cleanup_expired_records();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-expired-daily');

SELECT cron.schedule('auto-cancel-stale-bookings', '30 1 * * *', $$SELECT public.auto_cancel_stale_bookings();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='auto-cancel-stale-bookings');

SELECT cron.schedule('generate-daily-snapshot', '5 0 * * *', $$SELECT public.generate_daily_snapshot();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='generate-daily-snapshot');
