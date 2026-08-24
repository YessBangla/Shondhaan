import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store, Package, ShoppingBag, Settings, Plus, Edit, Trash2, Loader2,
  Eye, MessageSquare, BarChart3, Image as ImageIcon, Save, ExternalLink
} from "lucide-react";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import AddProductForm from "@/components/mart/AddProductForm";
import BackToHomeButton from "@/components/BackToHomeButton";
import Navbar from "@/components/Navbar";

const MartShopPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Shop form
  const [shopForm, setShopForm] = useState({
    name: "", name_en: "", slug: "", description: "", phone: "", division: "", district: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get user's shop
    const { data: shopData } = await supabase
      .from("mart_shops")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (shopData) {
      setShop(shopData);
      setShopForm({
        name: shopData.name || "",
        name_en: shopData.name_en || "",
        slug: shopData.slug || "",
        description: shopData.description || "",
        phone: shopData.phone || "",
        division: shopData.division || "",
        district: shopData.district || "",
      });

      // Get products
      const { data: productsData } = await supabase
        .from("mart_products")
        .select("*, mart_categories(name, name_en)")
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });
      setProducts(productsData || []);

      // Get orders for shop products
      const productIds = (productsData || []).map((p: any) => p.id);
      if (productIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("mart_order_items")
          .select("*, mart_orders(*)")
          .in("product_id", productIds)
          .order("created_at", { ascending: false });
        setOrders(orderItems || []);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createShop = async () => {
    if (!user) return;
    if (!shopForm.name.trim()) { toast.error(bn ? "শপের নাম দিন" : "Enter shop name"); return; }
    const slug = shopForm.slug.trim() || shopForm.name.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/-+$/, "");

    setSaving(true);
    const { data, error } = await supabase.from("mart_shops").insert({
      owner_id: user.id,
      name: shopForm.name,
      name_en: shopForm.name_en || null,
      slug,
      description: shopForm.description || null,
      phone: shopForm.phone || null,
      division: shopForm.division || null,
      district: shopForm.district || null,
    }).select().single();
    setSaving(false);

    if (error) {
      if (error.code === "23505") toast.error(bn ? "এই শপ লিংক আগে থেকেই নেওয়া" : "Shop slug already taken");
      else toast.error(bn ? "শপ তৈরি করতে সমস্যা হয়েছে" : "Failed to create shop");
      return;
    }

    toast.success(bn ? "শপ তৈরি হয়েছে!" : "Shop created!");
    setShop(data);
  };

  const updateShop = async () => {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase.from("mart_shops").update({
      name: shopForm.name,
      name_en: shopForm.name_en || null,
      description: shopForm.description || null,
      phone: shopForm.phone || null,
      division: shopForm.division || null,
      district: shopForm.district || null,
    }).eq("id", shop.id);
    setSaving(false);

    if (error) toast.error(bn ? "আপডেট ব্যর্থ" : "Update failed");
    else toast.success(bn ? "শপ আপডেট হয়েছে" : "Shop updated");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !shop) return;
    const file = e.target.files[0];
    const path = `shops/${shop.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("cms-images").upload(path, file, { upsert: true });
    if (error) { toast.error(bn ? "আপলোড ব্যর্থ" : "Upload failed"); return; }
    const { data } = supabase.storage.from("cms-images").getPublicUrl(path);
    await supabase.from("mart_shops").update({ logo_url: data.publicUrl }).eq("id", shop.id);
    setShop({ ...shop, logo_url: data.publicUrl });
    toast.success(bn ? "লোগো আপডেট হয়েছে" : "Logo updated");
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !shop) return;
    const file = e.target.files[0];
    const path = `shops/${shop.id}/banner-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("cms-images").upload(path, file, { upsert: true });
    if (error) { toast.error(bn ? "আপলোড ব্যর্থ" : "Upload failed"); return; }
    const { data } = supabase.storage.from("cms-images").getPublicUrl(path);
    await supabase.from("mart_shops").update({ banner_url: data.publicUrl }).eq("id", shop.id);
    setShop({ ...shop, banner_url: data.publicUrl });
    toast.success(bn ? "ব্যানার আপডেট হয়েছে" : "Banner updated");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm(bn ? "পণ্য মুছে ফেলবেন?" : "Delete product?")) return;
    const { error } = await supabase.from("mart_products").delete().eq("id", id);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success(bn ? "পণ্য মুছে ফেলা হয়েছে" : "Product deleted");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No shop yet — show create form
  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mt-[44px] md:mt-[30px]" />
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* <BackToHomeButton /> */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 mt-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-primary/10 p-3"><Store className="h-6 w-6 text-primary" /></div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{bn ? "আপনার শপ খুলুন" : "Open Your Shop"}</h1>
                <p className="text-sm text-muted-foreground">{bn ? "দারাজের মতো নিজের শপ তৈরি করুন" : "Create your own shop like Daraz"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{bn ? "শপের নাম *" : "Shop Name *"}</label>
                <input value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder={bn ? "যেমন: রহিম ইলেকট্রনিক্স" : "e.g. Rahim Electronics"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{bn ? "শপের নাম (ইংরেজি)" : "Shop Name (English)"}</label>
                <input value={shopForm.name_en} onChange={e => setShopForm({ ...shopForm, name_en: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Rahim Electronics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{bn ? "শপ লিংক (ইউনিক)" : "Shop Link (unique)"}</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground shrink-0">/mart/shop/</span>
                  <input value={shopForm.slug} onChange={e => setShopForm({ ...shopForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="rahim-electronics" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{bn ? "বিবরণ" : "Description"}</label>
                <textarea value={shopForm.description} onChange={e => setShopForm({ ...shopForm, description: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{bn ? "ফোন" : "Phone"}</label>
                <input value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="01XXXXXXXXX" />
              </div>
              <button onClick={createShop} disabled={saving}
                className="w-full rounded-lg bg-primary py-3 text-base font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                {bn ? "শপ তৈরি করুন" : "Create Shop"}
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="h-16 md:hidden" />
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800", shipped: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />
      <div className="mx-auto max-w-6xl px-0 md:px-4 py-0 md:py-6">
        <PanelSidebarTabs
          items={[
            { value: "products", label: bn ? "পণ্য" : "Products", icon: <Package className="h-5 w-5" />, group: bn ? "শপ" : "Shop" },
            { value: "orders", label: bn ? "অর্ডার" : "Orders", icon: <ShoppingBag className="h-5 w-5" /> },
            { value: "settings", label: bn ? "শপ সেটিংস" : "Shop Settings", icon: <Settings className="h-5 w-5" />, group: bn ? "সেটিংস" : "Settings" },
          ]}
          defaultValue="products"
          panelTitle={shop.name || (bn ? "আমার শপ" : "My Shop")}
          panelIcon={<Store className="h-5 w-5" />}
        >
          {(activeTab) => (
            <div className="p-4 md:p-6">

              {/* Shop Stats */}
              {activeTab === "products" && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { value: products.length, label: bn ? "পণ্য" : "Products", color: "text-primary" },
                    { value: orders.length, label: bn ? "অর্ডার" : "Orders", color: "text-green-600" },
                    { value: shop.rating || 0, label: bn ? "রেটিং" : "Rating", color: "text-yellow-600" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-foreground">{bn ? "আমার পণ্য" : "My Products"}</h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => window.open(`/mart/shop/${shop.slug}`, "_blank")}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5" /> {bn ? "শপ দেখুন" : "View Shop"}
                      </button>
                      <button onClick={() => { setEditingProduct(null); setShowAddProduct(true); }}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                        <Plus className="h-4 w-4" /> {bn ? "পণ্য যোগ" : "Add Product"}
                      </button>
                    </div>
                  </div>

                  {showAddProduct && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                      <AddProductForm
                        open={showAddProduct}
                        onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
                        onSuccess={() => { setShowAddProduct(false); setEditingProduct(null); fetchData(); }}
                        editProduct={editingProduct}
                        shopId={shop.id}
                      />
                    </motion.div>
                  )}

                  {products.length === 0 && !showAddProduct ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">{bn ? "কোনো পণ্য নেই" : "No products yet"}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{bn ? p.name : (p.name_en || p.name)}</p>
                            <p className="text-sm font-bold text-primary">৳{p.price.toLocaleString("bn-BD")}</p>
                            <p className="text-xs text-muted-foreground">{bn ? "স্টক:" : "Stock:"} {p.stock || 0}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => { setEditingProduct(p); setShowAddProduct(true); }}
                              className="rounded-lg p-2 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                            <button onClick={() => deleteProduct(p.id)}
                              className="rounded-lg p-2 hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">{bn ? "কোনো অর্ডার নেই" : "No orders yet"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((item: any, i: number) => {
                      const order = item.mart_orders;
                      if (!order) return null;
                      return (
                        <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-bold text-foreground">{order.order_number}</p>
                              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("bn-BD")}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[order.status] || "bg-muted"}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity}x ৳{item.unit_price}</p>
                            </div>
                            <p className="text-sm font-bold text-primary">৳{item.total_price}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{bn ? "ক্রেতা:" : "Buyer:"} {order.customer_name} • {order.customer_phone}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-5">
                  {/* Logo & Banner Upload */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">{bn ? "শপ ব্র্যান্ডিং" : "Shop Branding"}</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="relative">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-dashed border-border">
                            <Store className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                        <label className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 cursor-pointer">
                          <ImageIcon className="h-3 w-3" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{bn ? "লোগো" : "Logo"}</p>
                        <p className="text-xs text-muted-foreground">{bn ? "স্কয়ার ছবি রিকমেন্ডেড" : "Square image recommended"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">{bn ? "ব্যানার" : "Banner"}</p>
                      {shop.banner_url && <img src={shop.banner_url} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />}
                      <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                        <ImageIcon className="h-3.5 w-3.5" /> {bn ? "ব্যানার আপলোড" : "Upload Banner"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Shop Info */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-bold text-foreground">{bn ? "শপ তথ্য" : "Shop Info"}</h3>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{bn ? "শপের নাম" : "Shop Name"}</label>
                      <input value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{bn ? "বিবরণ" : "Description"}</label>
                      <textarea value={shopForm.description} onChange={e => setShopForm({ ...shopForm, description: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" rows={3} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{bn ? "ফোন" : "Phone"}</label>
                      <input value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{bn ? "শপ লিংক:" : "Shop URL:"}</span>
                      <a href={`/mart/shop/${shop.slug}`} target="_blank" className="text-primary hover:underline flex items-center gap-1">
                        /mart/shop/{shop.slug} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <button onClick={updateShop} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {bn ? "সেভ করুন" : "Save Changes"}
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          )}
        </PanelSidebarTabs>
      </div>

      
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default MartShopPanel;
