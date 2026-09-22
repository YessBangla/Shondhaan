import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Users } from "lucide-react";

const NAMES_BN = ["রহিম", "করিম", "সাবিনা", "জুয়েল", "মিতু", "আনিস", "রুমা", "সাকিব"];
const NAMES_EN = ["Rahim", "Karim", "Sabina", "Jewel", "Mitu", "Anis", "Ruma", "Sakib"];
const AREAS_BN = ["ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী", "খুলনা", "বরিশাল"];
const AREAS_EN = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal"];

const FIRST_DELAY = 18_000;
const INTERVAL = 45_000;
const MAX_PER_SESSION = 4;

/**
 * Subtle social-proof nudges — "X just booked Y" toasts on home/service pages.
 * Capped per session, randomised, avoids dashboards/checkout.
 */
export default function SocialProofToaster() {
  const location = useLocation();
  const countRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];

    const allowedPrefixes = ["/", "/all-services", "/service/", "/mart", "/mart/category", "/mart/product"];
    const skipExact = ["/checkout", "/dashboard", "/profile", "/admin"];
    const path = location.pathname;
    const allowed =
      allowedPrefixes.some((p) => p === "/" ? path === "/" : path.startsWith(p)) &&
      !skipExact.some((s) => path.startsWith(s));
    if (!allowed) return;

    const bn = (localStorage.getItem("yess_lang") || "bn") === "bn";
    const services = bn
      ? ["এসি সার্ভিসিং", "ক্লিনিং", "ইলেকট্রিক", "প্লাম্বিং", "পেইন্টিং"]
      : ["AC Service", "Cleaning", "Electric", "Plumbing", "Painting"];
    const names = bn ? NAMES_BN : NAMES_EN;
    const areas = bn ? AREAS_BN : AREAS_EN;

    const fire = () => {
      if (countRef.current >= MAX_PER_SESSION) return;
      countRef.current += 1;
      const n = names[Math.floor(Math.random() * names.length)];
      const a = areas[Math.floor(Math.random() * areas.length)];
      const s = services[Math.floor(Math.random() * services.length)];
      const minsAgo = Math.floor(Math.random() * 12) + 2;
      toast(
        bn ? `${n} (${a}) এইমাত্র ${s} বুক করেছেন` : `${n} from ${a} just booked ${s}`,
        {
          description: bn ? `${minsAgo} মিনিট আগে` : `${minsAgo} min ago`,
          icon: <Users className="h-4 w-4 text-primary" />,
          closeButton: true,
          duration: 4500,
        }
      );
    };

    const t1 = window.setTimeout(fire, FIRST_DELAY);
    const t2 = window.setInterval(fire, INTERVAL);
    timersRef.current.push(t1, t2);

    return () => {
      window.clearTimeout(t1);
      window.clearInterval(t2);
    };
  }, [location.pathname]);

  return null;
}
