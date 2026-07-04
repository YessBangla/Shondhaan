import { useLanguage } from "@/contexts/LanguageContext";
import { useBookingReminders } from "@/hooks/useBookingReminders";

const BookingRemindersManager = () => {
  const { language } = useLanguage();
  useBookingReminders(language === "bn");
  return null;
};

export default BookingRemindersManager;