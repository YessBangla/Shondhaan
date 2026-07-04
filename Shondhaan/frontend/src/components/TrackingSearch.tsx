import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, FileSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const TrackingSearch = () => {
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    navigate(`/track/${trimmed}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-auto max-w-2xl px-4 py-6"
    >
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            {bn ? "সেবা ট্র্যাক করুন" : "Track Your Service"}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {bn
            ? "আপনার ট্র্যাকিং টোকেন আইডি দিন এবং সেবার বিস্তারিত দেখুন"
            : "Enter your tracking token ID to view service details"}
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={bn ? "ট্র্যাকিং টোকেন আইডি লিখুন..." : "Enter tracking token ID..."}
            className="flex-1 text-sm"
          />
          <Button type="submit" size="sm" disabled={!token.trim()}>
            <Search className="h-4 w-4 mr-1" />
            {bn ? "খুঁজুন" : "Search"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default TrackingSearch;
