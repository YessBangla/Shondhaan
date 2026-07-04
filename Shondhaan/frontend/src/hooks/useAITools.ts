import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type AIAction = "generate_description" | "suggest_price" | "review_summary" | "auto_reply" | "smart_search" | "mart_description";

export function useAITools() {
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();

  const callAI = async (action: AIAction, data: Record<string, any>): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke("ai-tools", {
        body: { action, data: { ...data, language } },
      });
      if (error) throw error;
      if (fnData?.error) {
        if (fnData.error.includes("Rate limit")) {
          toast.error(language === "bn" ? "অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন" : "Please try again in a moment");
        } else {
          toast.error(fnData.error);
        }
        return null;
      }
      return fnData?.result || null;
    } catch (e: any) {
      console.error("AI tool error:", e);
      toast.error(language === "bn" ? "AI সহকারী সাময়িকভাবে অনুপলব্ধ" : "AI assistant temporarily unavailable");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = (title: string, category?: string, condition?: string) =>
    callAI("generate_description", { title, category, condition });

  const suggestPrice = async (title: string, category?: string, condition?: string) => {
    const result = await callAI("suggest_price", { title, category, condition });
    if (!result) return null;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestion: result };
    } catch {
      return { suggestion: result };
    }
  };

  const summarizeReviews = (reviews: { rating: number; comment: string | null }[], productName: string) =>
    callAI("review_summary", { reviews, productName });

  const autoReply = (message: string, productInfo?: string, sellerName?: string) =>
    callAI("auto_reply", { message, productInfo, sellerName });

  const smartSearch = async (query: string) => {
    const result = await callAI("smart_search", { query });
    if (!result) return null;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
  };

  const generateMartDescription = (name: string, category?: string, price?: string) =>
    callAI("mart_description", { name, category, price });

  return {
    loading,
    generateDescription,
    suggestPrice,
    summarizeReviews,
    autoReply,
    smartSearch,
    generateMartDescription,
  };
}
