
-- ============================================================
-- 1. AUDIT LOG SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,            -- INSERT / UPDATE / DELETE / CUSTOM
  entity_type TEXT NOT NULL,       -- table name or custom event
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and super admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email TEXT;
  _entity_id TEXT;
BEGIN
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();

  IF (TG_OP = 'DELETE') THEN
    _entity_id := COALESCE(OLD.id::text, '');
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_value)
    VALUES (auth.uid(), _user_email, 'DELETE', TG_TABLE_NAME, _entity_id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    _entity_id := COALESCE(NEW.id::text, '');
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), _user_email, 'UPDATE', TG_TABLE_NAME, _entity_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    _entity_id := COALESCE(NEW.id::text, '');
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, new_value)
    VALUES (auth.uid(), _user_email, 'INSERT', TG_TABLE_NAME, _entity_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach to important tables
DROP TRIGGER IF EXISTS audit_bookings ON public.bookings;
CREATE TRIGGER audit_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_cms_services ON public.cms_services;
CREATE TRIGGER audit_cms_services
AFTER INSERT OR UPDATE OR DELETE ON public.cms_services
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_deal_listings ON public.deal_listings;
CREATE TRIGGER audit_deal_listings
AFTER UPDATE OR DELETE ON public.deal_listings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================
-- 2. AUTO BOOKING ASSIGNMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  provider_id UUID,
  representative_id UUID,
  assignment_type TEXT NOT NULL DEFAULT 'auto',  -- auto / manual / reassigned
  score NUMERIC,
  reason TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON public.booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_provider ON public.booking_assignments(provider_id);

ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
ON public.booking_assignments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Call center can view and create assignments"
ON public.booking_assignments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'call_center'::app_role))
WITH CHECK (has_role(auth.uid(), 'call_center'::app_role));

CREATE POLICY "Providers view own assignments"
ON public.booking_assignments FOR SELECT TO authenticated
USING (provider_id = auth.uid() OR representative_id = auth.uid());

-- Auto-assign function: pick best provider matching service & area
CREATE OR REPLACE FUNCTION public.auto_assign_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _provider_id UUID;
  _rep_id UUID;
  _customer_area TEXT;
BEGIN
  -- Only auto-assign if provider not already set
  IF NEW.provider_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find a provider with the role (round-robin style: least-loaded)
  SELECT ur.user_id INTO _provider_id
  FROM public.user_roles ur
  LEFT JOIN public.bookings b
    ON b.provider_id = ur.user_id AND b.status IN ('pending', 'confirmed', 'in_progress')
  WHERE ur.role = 'provider'
  GROUP BY ur.user_id
  ORDER BY COUNT(b.id) ASC
  LIMIT 1;

  IF _provider_id IS NOT NULL THEN
    NEW.provider_id := _provider_id;
  END IF;

  -- Try to find an area representative for this booking
  _customer_area := COALESCE(NEW.customer_address, '');
  SELECT user_id INTO _rep_id
  FROM public.area_representatives
  WHERE is_active = true
    AND (_customer_area ILIKE '%' || COALESCE(thana, '') || '%'
      OR _customer_area ILIKE '%' || COALESCE(district, '') || '%'
      OR _customer_area ILIKE '%' || COALESCE(division, '') || '%')
  ORDER BY created_at ASC
  LIMIT 1;

  -- Log the assignment
  IF _provider_id IS NOT NULL OR _rep_id IS NOT NULL THEN
    INSERT INTO public.booking_assignments
      (booking_id, provider_id, representative_id, assignment_type, reason)
    VALUES
      (NEW.id, _provider_id, _rep_id, 'auto', 'Auto-assigned by system on booking creation');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_booking ON public.bookings;
CREATE TRIGGER trg_auto_assign_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_booking();

-- ============================================================
-- 3. UNIFIED NOTIFICATION ENGINE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',     -- info / success / warning / error / booking / payment / job / mart / deal
  channel TEXT NOT NULL DEFAULT 'in_app',-- in_app / sms / email / push
  priority TEXT NOT NULL DEFAULT 'normal', -- low / normal / high / urgent
  link_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON public.app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_unread ON public.app_notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.app_notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
ON public.app_notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all notifications"
ON public.app_notifications FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins create notifications"
ON public.app_notifications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'call_center'::app_role));

-- Helper function for server-side notification creation
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _link_url TEXT DEFAULT NULL,
  _priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.app_notifications (user_id, title, message, type, link_url, priority)
  VALUES (_user_id, _title, _message, _type, _link_url, _priority)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Auto-notify customer on booking status change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title TEXT;
  _message TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        _title := 'বুকিং নিশ্চিত হয়েছে ✅';
        _message := 'আপনার "' || NEW.service_title || '" বুকিংটি নিশ্চিত করা হয়েছে।';
      WHEN 'in_progress' THEN
        _title := 'সেবা চলছে 🛠️';
        _message := 'আপনার "' || NEW.service_title || '" সেবা প্রদান শুরু হয়েছে।';
      WHEN 'completed' THEN
        _title := 'সেবা সম্পন্ন 🎉';
        _message := '"' || NEW.service_title || '" সেবাটি সফলভাবে সম্পন্ন হয়েছে। অনুগ্রহ করে রিভিউ দিন।';
      WHEN 'cancelled' THEN
        _title := 'বুকিং বাতিল';
        _message := '"' || NEW.service_title || '" বুকিংটি বাতিল করা হয়েছে।';
      ELSE
        RETURN NEW;
    END CASE;

    PERFORM public.create_notification(
      NEW.user_id, _title, _message, 'booking',
      '/bookings/' || NEW.id::text, 'high'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_status ON public.bookings;
CREATE TRIGGER trg_notify_booking_status
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- ============================================================
-- 4. PAYMENT LEDGER & RECONCILIATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,                          -- payer (nullable for system entries)
  recipient_id UUID,                     -- recipient (provider/vendor for payouts)
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  type TEXT NOT NULL,                    -- income / refund / commission / payout / fee / adjustment
  source_table TEXT NOT NULL,            -- bookings / mart_orders / job_packages / manual
  source_id TEXT,                        -- reference id
  payment_method TEXT,                   -- bkash / nagad / cod / card / bank
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',-- pending / completed / failed / cancelled / refunded
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_ledger_user ON public.payment_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_source ON public.payment_ledger(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_created ON public.payment_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_status ON public.payment_ledger(status);

ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all ledger entries"
ON public.payment_ledger FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Finance role manages ledger"
ON public.payment_ledger FOR ALL TO authenticated
USING (has_role(auth.uid(), 'finance'::app_role))
WITH CHECK (has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Users view own ledger entries"
ON public.payment_ledger FOR SELECT TO authenticated
USING (user_id = auth.uid() OR recipient_id = auth.uid());

CREATE TRIGGER update_payment_ledger_updated_at
BEFORE UPDATE ON public.payment_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reconciliation summary view
CREATE OR REPLACE VIEW public.payment_summary_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  type,
  status,
  COUNT(*) AS count,
  SUM(amount) AS total_amount
FROM public.payment_ledger
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
