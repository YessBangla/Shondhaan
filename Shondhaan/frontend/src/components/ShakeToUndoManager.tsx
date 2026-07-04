import { useLanguage } from "@/contexts/LanguageContext";
import { useShakeToUndo } from "@/hooks/useUndoStack";

const ShakeToUndoManager = () => {
  const { language } = useLanguage();
  useShakeToUndo(language === "bn");
  return null;
};

export default ShakeToUndoManager;