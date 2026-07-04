import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatCurrency, formatDate, formatDateTime, formatNumber,
  formatTime, localizeDigits, timeAgo, toBnDigits, toEnDigits,
} from "@/lib/i18nFormat";

/**
 * Locale-aware formatters bound to the current UI language.
 * Use anywhere a date/number/time is shown to the user.
 *
 * @example
 * const fmt = useFormat();
 * <span>{order.created_at.toLocaleDateString("bn-BD")}</span>
 * <span>{fmt.currency(order.total)}</span>
 * <span>{fmt.timeAgo(message.sent_at)}</span>
 */
export const useFormat = () => {
  const { language } = useLanguage();

  return useMemo(
    () => ({
      lang: language,
      digits: (v: string | number) => localizeDigits(v, language),
      number: (v: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
        formatNumber(v, language, opts),
      currency: (v: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
        formatCurrency(v, language, opts),
      date: (v: Date | string | number | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
        formatDate(v, language, opts),
      time: (v: Date | string | number | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
        formatTime(v, language, opts),
      dateTime: (v: Date | string | number | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
        formatDateTime(v, language, opts),
      timeAgo: (v: Date | string | number | null | undefined) => timeAgo(v, language),
      toBn: toBnDigits,
      toEn: toEnDigits,
    }),
    [language],
  );
};