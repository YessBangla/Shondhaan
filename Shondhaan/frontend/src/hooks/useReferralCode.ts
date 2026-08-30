import { useState, useEffect } from "react";
import { getStoredReferralCode } from "@/lib/referralCookie";

export function useReferralCode() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    setReferralCode(getStoredReferralCode());
  }, []);

  return referralCode;
}