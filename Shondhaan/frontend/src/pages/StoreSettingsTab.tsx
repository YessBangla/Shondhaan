// src/components/mart/StoreSettingsTab.tsx
import { useState, useEffect } from "react";
import { Loader2, Store } from "lucide-react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { MartSeller } from "@/lib/martApi";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081";

interface Props {
  seller: MartSeller | null;
  sellerId: number | null;
  bn: boolean;
  onSaved: (s: MartSeller) => void;
}

const StoreSettingsTab = ({ seller, sellerId, bn, onSaved }: Props) => {
  const [bannerFile, setBannerFile]         = useState<File | null>(null);
  const [profileFile, setProfileFile]       = useState<File | null>(null);
  const [bannerPreview, setBannerPreview]   = useState<string>(
    (seller as any)?.banner_url || ""
  );
  const [profilePreview, setProfilePreview] = useState<string>(
    (seller as any)?.profile_image_url || ""
  );
  const [saving, setSaving] = useState(false);

 // Replace your toBase64 function with this
const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  };

  const handleProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileFile(f);
    setProfilePreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!sellerId) return toast.error(bn ? "সেলার আইডি নেই" : "Seller ID missing");
    setSaving(true);
    try {
    const body: Record<string, string> = {};

if (shopName.trim() !== (seller?.shop_name || "")) {
  body.shop_name = shopName.trim();
}

      if (bannerFile) {
       const b64 = await compressImage(bannerFile, 1400, 0.78);
        const up = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, folder: "sellers" }),
        });
        const upRes = await up.json();
        if (!upRes.success) throw new Error(upRes.message || "Banner upload failed");
        body.banner_url = upRes.url;
      }

      if (profileFile) {
        const b64 = await compressImage(profileFile, 600, 0.80);
        const up = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, folder: "sellers" }),
        });
        const upRes = await up.json();
        if (!upRes.success) throw new Error(upRes.message || "Profile upload failed");
        body.profile_image_url = upRes.url;
      }

      if (Object.keys(body).length === 0) {
        toast.info(bn ? "কোনো পরিবর্তন নেই" : "Nothing to save");
        setSaving(false);
        return;
      }

      const resp = await fetch(`${API_BASE}/api/sellers/${sellerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.message);

      toast.success(bn ? "সেভ হয়েছে" : "Saved successfully");
      onSaved(result.data);
    } catch (err: any) {
      toast.error(err.message || (bn ? "সেভ ব্যর্থ" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };
const [shopName, setShopName] = useState(
  seller?.shop_name || ""
);


useEffect(() => {
  setShopName(seller?.shop_name || "");
}, [seller]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          {bn ? "মার্ট ভেন্ডর প্রোফাইল" : "Mart Vendor Profile"}
        </h2>
        <p className="text-sm text-slate-500">
          {bn
            ? "স্টোর নাম, ব্যানার ও প্রোফাইল ছবি কাস্টমাইজ করুন।"
            : "Customize your store name, banner and profile image."}
        </p>
      </div>

      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <label className="block text-sm font-semibold mb-3">
          {bn ? "স্টোর ব্যানার" : "Store Banner"}
        </label>
        <div
          className="h-52 rounded-xl border-2 border-dashed border-slate-200 relative overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={() => document.getElementById("bannerInput")?.click()}
        >
          {bannerPreview ? (
            <img
              src={bannerPreview}
              className="absolute inset-0 w-full h-full object-cover"
              alt="banner"
            />
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                {bn ? "ব্যানার আপলোড করুন" : "Upload banner image"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {bn ? "ক্লিক করুন" : "Click to select"}
              </p>
            </>
          )}
          {bannerPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <p className="text-white text-sm font-medium">
                {bn ? "পরিবর্তন করুন" : "Change image"}
              </p>
            </div>
          )}
        </div>
        <input
          id="bannerInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBanner}
        />
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <label className="block text-sm font-semibold mb-3">
          {bn ? "স্টোর প্রোফাইল ছবি" : "Store Profile Picture"}
        </label>
        <div className="flex items-center gap-5">
          <div
            className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-300 transition-colors shrink-0"
            onClick={() => document.getElementById("profileInput")?.click()}
          >
            {profilePreview ? (
              <img
                src={profilePreview}
                className="w-full h-full object-cover"
                alt="profile"
              />
            ) : (
              <Store className="h-10 w-10 text-slate-400" />
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => document.getElementById("profileInput")?.click()}
            >
              {bn ? "ছবি বেছে নিন" : "Choose image"}
            </Button>
            <p className="text-xs text-slate-400 mt-2">
              {bn ? "প্রস্তাবিত: ৫০০×৫০০ পিক্সেল" : "Recommended: 500×500 px"}
            </p>
          </div>
        </div>
        <input
          id="profileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleProfile}
        />
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div
          className="h-44 bg-gradient-to-r from-emerald-500 to-teal-500 relative"
          style={
            bannerPreview
              ? {
                  backgroundImage: `url(${bannerPreview})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        />
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              {profilePreview ? (
                <img
                  src={profilePreview}
                  className="w-full h-full object-cover"
                  alt="profile"
                />
              ) : (
                <Store className="h-10 w-10 text-emerald-500" />
              )}
            </div>
          </div>
          {/* Shop Name */}
<div className="bg-white rounded-2xl border border-slate-100 p-6">
  <label className="block text-sm font-semibold mb-3">
    {bn ? "স্টোরের নাম" : "Store Name"}
  </label>

  <input
    type="text"
    value={shopName}
    onChange={(e) => setShopName(e.target.value)}
    placeholder={bn ? "স্টোরের নাম লিখুন" : "Enter store name"}
    className="w-full h-11 rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-emerald-500"
  />
</div>
          <div className="pt-16">
            <h3 className="text-xl font-bold">
               {shopName || seller?.seller_name || "Your Store"}
            </h3>
            <p className="text-sm text-slate-500">
              {bn ? "স্টোর প্রিভিউ" : "Store Preview"}
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
         disabled={
  saving ||
  (
    !bannerFile &&
    !profileFile &&
    shopName.trim() === (seller?.shop_name || "")
  )
}
          className="px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm hover:opacity-90"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {bn ? "সেভ হচ্ছে..." : "Saving..."}
            </>
          ) : bn ? (
            "সেভ করুন"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
};

export default StoreSettingsTab;
