-- Assignable modules catalog
CREATE TABLE public.assignable_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key TEXT NOT NULL UNIQUE,
  label_bn TEXT NOT NULL,
  label_en TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  applicable_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignable_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read modules"
ON public.assignable_modules FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Super admins manage modules"
ON public.assignable_modules FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Staff assignments
CREATE TABLE public.staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_to UUID NOT NULL,
  assigned_to_name TEXT,
  assigned_to_role TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  assigner_role TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  scope_label TEXT,
  permissions JSONB NOT NULL DEFAULT '{"view":true,"edit":true,"approve":false}'::jsonb,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_assign_to ON public.staff_assignments(assigned_to) WHERE is_active = true;
CREATE INDEX idx_staff_assign_by ON public.staff_assignments(assigned_by);
CREATE INDEX idx_staff_assign_scope ON public.staff_assignments(scope_type, scope_value);

ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins: full access
CREATE POLICY "Super admins manage all assignments"
ON public.staff_assignments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins: can assign to non-admin/non-super roles only
CREATE POLICY "Admins create assignments for staff"
ON public.staff_assignments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND assigned_by = auth.uid()
  AND assigned_to_role NOT IN ('super_admin', 'admin')
);

CREATE POLICY "Admins update own assignments"
ON public.staff_assignments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND assigned_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND assigned_by = auth.uid());

CREATE POLICY "Admins delete own assignments"
ON public.staff_assignments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND assigned_by = auth.uid());

CREATE POLICY "Admins view all staff assignments"
ON public.staff_assignments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff: view own assignments
CREATE POLICY "Staff view own assignments"
ON public.staff_assignments FOR SELECT TO authenticated
USING (assigned_to = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_staff_assignments_updated_at
BEFORE UPDATE ON public.staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_assignments(_user_id UUID)
RETURNS TABLE (
  id UUID,
  scope_type TEXT,
  scope_value TEXT,
  scope_label TEXT,
  permissions JSONB,
  priority TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, scope_type, scope_value, scope_label, permissions, priority, expires_at
  FROM public.staff_assignments
  WHERE assigned_to = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.has_module_assignment(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_assignments
    WHERE assigned_to = _user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND ((scope_type = 'module' AND scope_value = _module) OR scope_value = 'all')
  );
$$;

-- Seed assignable modules
INSERT INTO public.assignable_modules (module_key, label_bn, label_en, category, icon, applicable_roles, sort_order) VALUES
('services', 'সার্ভিস ম্যানেজমেন্ট', 'Services', 'platform', 'Wrench', ARRAY['admin','moderator','supervisor'], 1),
('mart', 'সন্ধান মার্ট', 'Yess Mart', 'platform', 'ShoppingCart', ARRAY['admin','moderator','mart_support'], 2),
('deal', 'সন্ধান ডিল', 'Yess Deal', 'platform', 'Handshake', ARRAY['admin','moderator'], 3),
('jobs', 'সন্ধান জবস', 'Yess Jobs', 'platform', 'Briefcase', ARRAY['admin','moderator'], 4),
('bookings', 'বুকিং ম্যানেজমেন্ট', 'Bookings', 'operations', 'Calendar', ARRAY['admin','call_center','supervisor'], 5),
('approvals', 'অ্যাপ্রুভাল কিউ', 'Approval Queue', 'operations', 'CheckCircle', ARRAY['admin','moderator','supervisor'], 6),
('disputes', 'ডিসপিউট ও রিফান্ড', 'Disputes', 'operations', 'AlertTriangle', ARRAY['admin','call_center','finance','supervisor'], 7),
('finance', 'ফিনান্স ও পেমেন্ট', 'Finance', 'finance', 'Banknote', ARRAY['admin','finance'], 8),
('coupons', 'কুপন ম্যানেজমেন্ট', 'Coupons', 'finance', 'Tag', ARRAY['admin','moderator'], 9),
('withdrawals', 'উইথড্রয়াল', 'Withdrawals', 'finance', 'CreditCard', ARRAY['admin','finance'], 10),
('representatives', 'প্রতিনিধি ম্যানেজমেন্ট', 'Representatives', 'hr', 'MapPinCheck', ARRAY['admin','supervisor'], 11),
('providers', 'প্রোভাইডার ম্যানেজমেন্ট', 'Providers', 'hr', 'Users', ARRAY['admin','supervisor'], 12),
('reviews', 'রিভিউ মডারেশন', 'Reviews', 'content', 'Star', ARRAY['admin','moderator'], 13),
('contacts', 'কন্টাক্ট মেসেজ', 'Contact Messages', 'communication', 'MessageSquare', ARRAY['admin','call_center','moderator'], 14),
('chat_history', 'চ্যাট হিস্ট্রি', 'Chat History', 'communication', 'Bot', ARRAY['admin','call_center'], 15),
('notifications', 'নোটিফিকেশন সেন্টার', 'Notifications', 'communication', 'Bell', ARRAY['admin','moderator'], 16),
('cms_categories', 'CMS ক্যাটেগরি', 'CMS Categories', 'content', 'Grid3X3', ARRAY['admin','moderator'], 17),
('cms_banners', 'হোমপেজ ব্যানার', 'Banners', 'content', 'Image', ARRAY['admin','moderator'], 18),
('cms_offers', 'স্পেশাল অফার', 'Special Offers', 'content', 'Percent', ARRAY['admin','moderator'], 19);