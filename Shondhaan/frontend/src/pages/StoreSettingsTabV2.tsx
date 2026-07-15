import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, Plus, Store, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { MartSeller } from "@/lib/martApi";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE;

type StoreMediaItem = {
  url: string;
  type: "image" | "video";
  title?: string;
};

type PendingMediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

interface Props {
  seller: MartSeller | null;
  sellerId: number | null;
  bn: boolean;
  onSaved: (seller: MartSeller) => void;
}

const parseCarouselMedia = (value: unknown): StoreMediaItem[] => {
  if (Array.isArray(value)) return value.filter((item) => item?.url && item?.type);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.url && item?.type) : [];
  } catch {
    return [];
  }
};

const compressImage = (file: File, maxWidth = 1200, quality = 0.78): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });

const uploadMedia = async (file: File): Promise<string> => {
  if (file.type.startsWith("image/")) {
    const image = await compressImage(file, 1400, 0.78);
    const resp = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, folder: "sellers" }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.message || "Image upload failed");
    return result.url;
  }

  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  const result = await resp.json();
  if (!result.success) throw new Error(result.message || "Video upload failed");
  return result.url;
};

const StoreSettingsTabV2 = ({ seller, sellerId, bn, onSaved }: Props) => {
  const [shopName, setShopName] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [carouselMedia, setCarouselMedia] = useState<StoreMediaItem[]>([]);
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShopName(seller?.shop_name || "");
    setBannerPreview((seller as any)?.banner_url || "");
    setProfilePreview((seller as any)?.profile_image_url || "");
    setCarouselMedia(parseCarouselMedia((seller as any)?.store_carousel_media));
    setPendingMedia([]);
    setBannerFile(null);
    setProfileFile(null);
  }, [seller]);

  const hasChanges = useMemo(
    () =>
      Boolean(bannerFile || profileFile || pendingMedia.length) ||
      shopName.trim() !== (seller?.shop_name || "") ||
      JSON.stringify(carouselMedia) !== JSON.stringify(parseCarouselMedia((seller as any)?.store_carousel_media)),
    [bannerFile, carouselMedia, pendingMedia.length, profileFile, seller, shopName]
  );

  const handleBanner = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleCarouselFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const next = files.slice(0, Math.max(0, 6 - carouselMedia.length - pendingMedia.length)).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" as const : "image" as const,
    }));

    if (next.length < files.length) {
      toast.info(bn ? "Maximum 6 carousel items allowed" : "Maximum 6 carousel items allowed");
    }
    setPendingMedia((current) => [...current, ...next]);
  };

  const removeExistingMedia = (index: number) => {
    setCarouselMedia((current) => current.filter((_, i) => i !== index));
  };

  const removePendingMedia = (id: string) => {
    setPendingMedia((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleSave = async () => {
    if (!sellerId) return toast.error(bn ? "Seller ID missing" : "Seller ID missing");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (shopName.trim() !== (seller?.shop_name || "")) {
        body.shop_name = shopName.trim();
      }
      if (bannerFile) body.banner_url = await uploadMedia(bannerFile);
      if (profileFile) body.profile_image_url = await uploadMedia(profileFile);

      const uploadedCarousel = await Promise.all(
        pendingMedia.map(async (item) => ({
          type: item.type,
          url: await uploadMedia(item.file),
          title: item.file.name,
        }))
      );
      const nextCarouselMedia = [...carouselMedia, ...uploadedCarousel].slice(0, 6);
      body.store_carousel_media = nextCarouselMedia;

      const resp = await fetch(`${API_BASE}/api/sellers/${sellerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.message || "Save failed");

      toast.success(bn ? "Saved successfully" : "Saved successfully");
      onSaved(result.data);
    } catch (error: any) {
      toast.error(error.message || (bn ? "Save failed" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          {bn ? "Mart Vendor Profile" : "Mart Vendor Profile"}
        </h2>
        <p className="text-sm text-slate-500">
          {bn ? "Customize store photos and carousel media." : "Customize store photos and carousel media."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <label className="mb-3 block text-sm font-semibold">{bn ? "Store Cover Photo" : "Store Cover Photo"}</label>
          <button
            type="button"
            onClick={() => document.getElementById("storeBannerInput")?.click()}
            className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300"
          >
            {bannerPreview ? (
              <img src={bannerPreview} alt="Store cover" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm text-slate-400">
                <ImageIcon className="h-8 w-8" />
                Upload cover image
              </span>
            )}
          </button>
          <input id="storeBannerInput" type="file" accept="image/*" className="hidden" onChange={handleBanner} />
          <p className="mt-2 text-xs text-slate-400">Small cover height is used on the public store page.</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <label className="mb-3 block text-sm font-semibold">{bn ? "Store Profile Photo" : "Store Profile Photo"}</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => document.getElementById("storeProfileInput")?.click()}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300"
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Store profile" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-slate-400" />
              )}
            </button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => document.getElementById("storeProfileInput")?.click()}>
              Choose image
            </Button>
          </div>
          <input id="storeProfileInput" type="file" accept="image/*" className="hidden" onChange={handleProfile} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <label className="mb-3 block text-sm font-semibold">{bn ? "Store Name" : "Store Name"}</label>
        <input
          type="text"
          value={shopName}
          onChange={(event) => setShopName(event.target.value)}
          placeholder="Enter store name"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Store Carousel Ads</h3>
            <p className="text-xs text-slate-500">Add up to 6 banner images or videos for the public store page.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => document.getElementById("storeCarouselInput")?.click()}
            disabled={carouselMedia.length + pendingMedia.length >= 6}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add media
          </Button>
          <input
            id="storeCarouselInput"
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleCarouselFiles}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {carouselMedia.map((item, index) => (
            <MediaTile key={`${item.url}-${index}`} item={item} onRemove={() => removeExistingMedia(index)} />
          ))}
          {pendingMedia.map((item) => (
            <MediaTile
              key={item.id}
              item={{ url: item.previewUrl, type: item.type, title: item.file.name }}
              pending
              onRemove={() => removePendingMedia(item.id)}
            />
          ))}
          {carouselMedia.length === 0 && pendingMedia.length === 0 && (
            <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 sm:col-span-2 lg:col-span-3">
              No carousel media yet
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="relative h-28 bg-gradient-to-r from-emerald-500 to-teal-500">
          {bannerPreview && <img src={bannerPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="relative px-5 pb-5 pt-10">
          <div className="absolute -top-10 left-5 h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
            {profilePreview ? <img src={profilePreview} alt="" className="h-full w-full object-cover" /> : <Store className="m-5 h-10 w-10 text-emerald-500" />}
          </div>
          <h3 className="text-lg font-bold">{shopName || seller?.seller_name || "Your Store"}</h3>
          <p className="text-sm text-slate-500">Store preview</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="rounded-xl border-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-white shadow-sm hover:opacity-90"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

function MediaTile({
  item,
  pending,
  onRemove,
}: {
  item: StoreMediaItem;
  pending?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
      <div className="aspect-[16/7] bg-slate-100">
        {item.type === "video" ? (
          <video src={item.url} className="h-full w-full object-cover" muted controls />
        ) : (
          <img src={item.url} alt={item.title || "Carousel media"} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500">
          {item.type === "video" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
          <span className="truncate">{pending ? "Pending upload" : item.type}</span>
        </span>
        <button type="button" onClick={onRemove} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default StoreSettingsTabV2;
