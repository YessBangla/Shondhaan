import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, X, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMartCompare } from "@/contexts/MartCompareContext";
import { useMartCart } from "@/contexts/MartCartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MartCompare = () => {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useMartCompare();
  const { addItem } = useMartCart();
  const { language } = useLanguage();
  const bn = language === "bn";

  const rows: { label: string; render: (p: typeof compareList[0]) => React.ReactNode }[] = [
    {
      label: bn ? "ছবি" : "Image",
      render: (p) => (
        <div className="h-32 w-full rounded-lg bg-muted overflow-hidden mx-auto">
          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
        </div>
      ),
    },
    {
      label: bn ? "পণ্যের নাম" : "Product Name",
      render: (p) => (
        <button onClick={() => navigate(`/mart/product/${p.slug}`)} className="text-sm font-semibold text-primary hover:underline line-clamp-2 text-center">
          {bn ? p.name : (p.name_en || p.name)}
        </button>
      ),
    },
    {
      label: bn ? "মূল্য" : "Price",
      render: (p) => (
        <div className="text-center">
          <span className="text-lg font-bold text-primary">৳{p.price.toLocaleString("bn-BD")}</span>
          {p.original_price && (
            <span className="block text-xs text-muted-foreground line-through">৳{p.original_price.toLocaleString("bn-BD")}</span>
          )}
        </div>
      ),
    },
    {
      label: bn ? "ডিসকাউন্ট" : "Discount",
      render: (p) => {
        const d = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
        return d > 0 ? <Badge className="bg-red-500 text-white">{d}% OFF</Badge> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      label: bn ? "রেটিং" : "Rating",
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{p.rating}</span>
          <span className="text-xs text-muted-foreground">({p.total_reviews})</span>
        </div>
      ),
    },
    {
      label: bn ? "বিক্রি" : "Sold",
      render: (p) => <span className="font-medium">{p.total_sold.toLocaleString("bn-BD")}</span>,
    },
    {
      label: bn ? "স্টক" : "Stock",
      render: (p) => (
        <Badge variant={p.stock > 0 ? "default" : "destructive"}>
          {p.stock > 0 ? (bn ? `${p.stock} টি` : `${p.stock} pcs`) : (bn ? "স্টক আউট" : "Out of Stock")}
        </Badge>
      ),
    },
    {
      label: bn ? "ইউনিট" : "Unit",
      render: (p) => <span className="text-sm">{p.unit}</span>,
    },
    {
      label: bn ? "ক্যাটাগরি" : "Category",
      render: (p) => <span className="text-sm">{p.category ? (bn ? p.category.name : (p.category.name_en || p.category.name)) : "—"}</span>,
    },
    {
      label: "",
      render: (p) => (
        <Button size="sm" className="w-full text-xs" onClick={() => addItem(p)} disabled={p.stock <= 0}>
          <ShoppingCart className="h-3 w-3 mr-1" /> {bn ? "কার্টে যোগ" : "Add to Cart"}
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="app-container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              {bn ? "পণ্য তুলনা" : "Product Compare"}
            </h1>
          </div>
          {compareList.length > 0 && (
            <Button variant="secondary" size="sm" onClick={clearCompare}>
              {bn ? "সব সরান" : "Clear All"}
            </Button>
          )}
        </div>
      </div>

      <div className="app-container py-6 pb-28 md:pb-10">
        {compareList.length < 2 ? (
          <div className="text-center py-20">
            <GitCompareArrows className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-lg font-bold mb-2">{bn ? "তুলনা করতে কমপক্ষে ২টি পণ্য যোগ করুন" : "Add at least 2 products to compare"}</h2>
            <p className="text-muted-foreground text-sm mb-4">{bn ? "প্রডাক্ট কার্ডে তুলনা বাটনে ক্লিক করুন" : "Click the compare button on product cards"}</p>
            <Button onClick={() => navigate("/mart/home")}>{bn ? "পণ্য ব্রাউজ করুন" : "Browse Products"}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="w-28 p-2" />
                  {compareList.map((p) => (
                    <th key={p.id} className="p-2 text-center relative">
                      <button
                        onClick={() => removeFromCompare(p.id)}
                        className="absolute top-0 right-2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center"
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="p-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{row.label}</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-center align-middle">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MartCompare;
