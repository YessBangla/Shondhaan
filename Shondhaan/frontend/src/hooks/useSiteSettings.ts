import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  logo_url: string;
  logo_text: string;
  logo_accent: string;
  favicon_url: string;
  footer_tagline_bn: string;
  footer_tagline_en: string;
  footer_phone: string;
  footer_email: string;
  footer_facebook: string;
  footer_instagram: string;
  footer_copyright_bn: string;
  footer_address_bn: string;
  footer_address_en: string;
  footer_copyright_en: string;
}

const DEFAULTS: SiteSettings = {
  logo_url: "/yess-service-logo.png",
  logo_text: "Yess",
  logo_accent: "Service",
  favicon_url: "/yess-service-logo.png",
  footer_tagline_bn: "আপনার বিশ্বস্ত হোম সার্ভিস পার্টনার",
  footer_tagline_en: "Your trusted home service partner",
  footer_phone: "+880 01805464345",
  footer_email: "info.shondhaan@gmail.com",
  footer_facebook: "#",
  footer_instagram: "#",
  footer_address_bn: "ঢাকা, বাংলাদেশ",
  footer_address_en: "Dhaka, Bangladesh",
  footer_copyright_bn: "© ২০২৬ সন্ধান। সর্বস্বত্ব সংরক্ষিত।",
  footer_copyright_en: "© 2026 Shondhaan. All rights reserved.",
};

export const useSiteSettings = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cms_site_settings")
        .select("setting_key, setting_value");
      if (error) throw error;
      const settings = { ...DEFAULTS };
      (data as { setting_key: string; setting_value: string }[]).forEach((row) => {
        if (row.setting_key in settings) {
          (settings as any)[row.setting_key] = row.setting_value || (DEFAULTS as any)[row.setting_key];
        }
      });
      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await (supabase as any)
        .from("cms_site_settings")
        .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
  });

  const updateMultiple = useMutation({
    mutationFn: async (items: { key: string; value: string }[]) => {
      const rows = items.map((i) => ({
        setting_key: i.key,
        setting_value: i.value,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any)
        .from("cms_site_settings")
        .upsert(rows, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
  });

  return { settings: query.data || DEFAULTS, isLoading: query.isLoading, updateSetting, updateMultiple };
};
