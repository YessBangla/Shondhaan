import { useRef, useState } from "react";
import { X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

interface DealImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  labelAdd?: string;
  labelMax?: string;
}

const DEAL_API_BASE_URL = (
  import.meta.env.VITE_DEAL_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const getImageUrl = (url: string) => {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return `${DEAL_API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const DealImageUploader = ({
  images,
  onChange,
  maxImages = 8,
  labelAdd = "ছবি",
  labelMax = "সর্বোচ্চ ৮টি ছবি যোগ করতে পারবেন",
}: DealImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    if (filesToUpload.length === 0) {
      toast.error(`সর্বোচ্চ ${maxImages}টি ছবি যোগ করা যাবে`);
      return;
    }

    try {
      setUploading(true);

      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error("শুধুমাত্র ছবি ফাইল আপলোড করা যাবে");
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error("ছবির সাইজ ৫MB এর বেশি হতে পারবে না");
          continue;
        }

        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(
          `${DEAL_API_BASE_URL}/api/uploads?folder=deal`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.message ||
              payload?.error ||
              "ছবি আপলোড করতে সমস্যা হয়েছে"
          );
        }

        const imageUrl = payload?.image_url || payload?.url;

        if (imageUrl) {
          newUrls.push(imageUrl);
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
        toast.success(`${newUrls.length}টি ছবি আপলোড হয়েছে`);
      }
    } catch (error: any) {
      console.error("Deal image upload error:", error);
      toast.error(error?.message || "ছবি আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="grid grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative aspect-square rounded-lg overflow-hidden border border-border group"
          >
            <img
              src={getImageUrl(url)}
              alt={`Deal image ${i + 1}`}
              className="w-full h-full object-cover"
            />

            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {labelAdd}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">{labelMax}</p>
    </div>
  );
};

export default DealImageUploader;