import { useState } from "react";
import { CheckCircle2, MessageCircleQuestion, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { createMartSellerNotification, isNumericMartUserId } from "@/lib/martSellerNotifications";

const MART_API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

type QaStorage = "supabase" | "mysql";

interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  seller_id?: string | null;
  question: string;
  answer?: string | null;
  answered_at?: string | null;
  created_at: string;
}

interface Props {
  productId: string;
  productName?: string;
  productUrl?: string;
  vendorId?: string | number | null;
  storage?: QaStorage;
}

const MartProductQA = ({ productId, productName, productUrl, vendorId, storage = "supabase" }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingAnswerId, setSubmittingAnswerId] = useState<string | null>(null);

  const queryKey = ["mart-product-qa", storage, productId];
  const mysqlUserId = user?.id && Number.isFinite(Number(user.id)) ? Number(user.id) : null;

  const { data: currentSeller } = useQuery({
    queryKey: ["mart-current-seller-for-qa", mysqlUserId],
    queryFn: async () => {
      const res = await fetch(`${MART_API_BASE}/api/sellers?user_id=${mysqlUserId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Could not load seller");
      }
      return json.data?.[0] || null;
    },
    enabled: storage === "mysql" && !!mysqlUserId,
    staleTime: 5 * 60 * 1000,
  });

  const canAnswer =
    storage === "mysql"
      ? !!currentSeller?.id &&
        !!vendorId &&
        (String(currentSeller.user_id) === String(vendorId) || String(currentSeller.id) === String(vendorId))
      : !!user?.id && !!vendorId && String(user.id) === String(vendorId);

  const { data: questions = [] } = useQuery<ProductQuestion[]>({
    queryKey,
    queryFn: async () => {
      if (storage === "mysql") {
        const res = await fetch(
          `${MART_API_BASE}/api/product-questions?product_id=${encodeURIComponent(productId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Failed to load questions");
        }
        return json.data || [];
      }

      const { data, error } = await supabase
        .from("mart_product_questions")
        .select("*")
        .eq("product_id", productId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ProductQuestion[];
    },
  });

  const refreshQuestions = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const notifySellerAboutQuestion = async (cleanQuestion: string) => {
    if (!vendorId || String(vendorId) === String(user?.id)) return;

    const title = bn ? "পণ্যে নতুন প্রশ্ন এসেছে" : "New product question";
    const trimmedQuestion =
      cleanQuestion.length > 120 ? `${cleanQuestion.slice(0, 117)}...` : cleanQuestion;
    const message = productName
      ? `${productName}: ${trimmedQuestion}`
      : trimmedQuestion;

    if (isNumericMartUserId(vendorId)) {
      await createMartSellerNotification({
        userId: vendorId,
        title,
        message,
        type: "mart_product_question",
        productId,
        actionUrl: productUrl ? `${productUrl}?tab=qa#product-qa` : null,
      });
      return;
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: String(vendorId),
      title,
      message,
      type: "mart_product_question",
      action_url: productUrl ? `${productUrl}?tab=qa#product-qa` : null,
    } as any);

    if (error) {
      console.warn("Seller Q&A notification failed", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(bn ? "লগইন করুন" : "Please login");
      return;
    }

    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    if (storage === "mysql" && !mysqlUserId) {
      toast.error(bn ? "মার্ট অ্যাকাউন্ট দিয়ে লগইন করুন" : "Please login with a mart account");
      return;
    }

    setSubmittingQuestion(true);
    try {
      if (storage === "mysql") {
        const res = await fetch(`${MART_API_BASE}/api/product-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            user_id: mysqlUserId,
            question: cleanQuestion,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Question submit failed");
        }
      } else {
        const { error } = await supabase.from("mart_product_questions").insert({
          product_id: productId,
          user_id: user.id,
          question: cleanQuestion,
        } as any);
        if (error) throw error;
      }

      await notifySellerAboutQuestion(cleanQuestion);
      setQuestion("");
      refreshQuestions();
      toast.success(bn ? "প্রশ্ন পাঠানো হয়েছে" : "Question submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : bn ? "ব্যর্থ" : "Failed");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!user) {
      toast.error(bn ? "লগইন করুন" : "Please login");
      return;
    }

    const cleanAnswer = (answerDrafts[questionId] || "").trim();
    if (!cleanAnswer) return;

    setSubmittingAnswerId(questionId);
    try {
      if (storage === "mysql") {
        if (!mysqlUserId || !currentSeller?.id) {
          throw new Error("Vendor account is required");
        }

        const res = await fetch(`${MART_API_BASE}/api/product-questions/${questionId}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: mysqlUserId,
            seller_id: currentSeller.id,
            answer: cleanAnswer,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Answer submit failed");
        }
      } else {
        const { error } = await supabase
          .from("mart_product_questions")
          .update({
            answer: cleanAnswer,
            answered_by: user.id,
            answered_at: new Date().toISOString(),
          } as any)
          .eq("id", questionId);
        if (error) throw error;
      }

      setAnswerDrafts((drafts) => ({ ...drafts, [questionId]: "" }));
      refreshQuestions();
      toast.success(bn ? "উত্তর সংরক্ষণ হয়েছে" : "Answer saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : bn ? "ব্যর্থ" : "Failed");
    } finally {
      setSubmittingAnswerId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-bold">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        {bn ? "প্রশ্ন ও উত্তর" : "Questions & Answers"} ({questions.length})
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={bn ? "এই পণ্য সম্পর্কে প্রশ্ন করুন..." : "Ask a question about this product..."}
          rows={2}
          className="min-h-[72px] flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={submittingQuestion || !question.trim()}
          size="sm"
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="space-y-3 rounded-lg border border-border/50 p-3">
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">Q</span>
                <p className="text-sm leading-relaxed">{q.question}</p>
              </div>

              {q.answer ? (
                <div className="flex items-start gap-2 pl-6">
                  <span className="flex shrink-0 items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-600 dark:bg-green-900/30">
                    <CheckCircle2 className="h-3 w-3" /> A
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{q.answer}</p>
                </div>
              ) : canAnswer ? (
                <div className="space-y-2 pl-6">
                  <Textarea
                    value={answerDrafts[q.id] || ""}
                    onChange={(e) => setAnswerDrafts((drafts) => ({ ...drafts, [q.id]: e.target.value }))}
                    placeholder={bn ? "বিক্রেতার উত্তর লিখুন..." : "Write vendor answer..."}
                    rows={2}
                    className="min-h-[68px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAnswer(q.id)}
                    disabled={submittingAnswerId === q.id || !(answerDrafts[q.id] || "").trim()}
                  >
                    {bn ? "উত্তর দিন" : "Answer"}
                  </Button>
                </div>
              ) : (
                <p className="pl-6 text-xs italic text-muted-foreground">
                  {bn ? "উত্তর অপেক্ষমাণ..." : "Awaiting answer..."}
                </p>
              )}

              <p className="pl-6 text-[10px] text-muted-foreground/60">
                {new Date(q.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {bn ? "এখনো কোনো প্রশ্ন নেই। প্রথম প্রশ্ন করুন!" : "No questions yet. Be the first to ask!"}
        </p>
      )}
    </div>
  );
};

export default MartProductQA;
