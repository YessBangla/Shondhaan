import { useLanguage } from "@/contexts/LanguageContext";
import { useOfflineSync } from "@/hooks/useOfflineDraft";

/**
 * Mounts once at the App root. Watches network state and surfaces
 * toasts when the user goes offline / regains connectivity with
 * pending offline drafts.
 */
const OfflineSyncManager = () => {
  const { language } = useLanguage();
  useOfflineSync(language === "bn");
  return null;
};

export default OfflineSyncManager;