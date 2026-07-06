import { useRef, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { getMySqlAuth } from "@/lib/mysqlAuth";

type ImageUploaderProps = {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
};

const API_BASE_URL = (INDIVIDUAL_API_BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const getImageSrc = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${path}`;
};

const ImageUploader = ({
  value = "",
  onChange,
  folder = "common",
  label = "ছবি",
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র image file upload করুন");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size 5MB এর কম হতে হবে");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    setUploading(true);

    try {
      const auth = getMySqlAuth();

      const response = await fetch(
        `${API_BASE_URL}/api/uploads?folder=${encodeURIComponent(folder)}`,
        {
          method: "POST",
          headers: {
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "Image upload failed");
      }

      const imageUrl = data.image_url || data.url;

      if (!imageUrl) {
        throw new Error("Image URL missing from server response");
      }

      onChange(imageUrl);
      toast.success("ছবি আপলোড হয়েছে");
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast.error(error.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const preview = getImageSrc(value);

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>

      <div className="rounded-xl border border-dashed border-border bg-background p-3">
        {preview ? (
          <div className="relative overflow-hidden rounded-lg border border-border">
            <img
              src={preview}
              alt={label}
              className="h-44 w-full object-cover"
            />

            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-lg bg-secondary/50 text-muted-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <ImageIcon className="h-8 w-8" />
            )}

            <span className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload image"}
            </span>

            <span className="text-xs">JPG, PNG, WEBP — max 5MB</span>
          </button>
        )}

        {preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Change Image
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {value && (
        <p className="mt-1 break-all text-[10px] text-muted-foreground">
          Saved URL: {value}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;