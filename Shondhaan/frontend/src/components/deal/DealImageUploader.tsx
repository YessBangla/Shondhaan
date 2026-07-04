import { useState, useRef } from "react";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DealImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  labelAdd?: string;
  labelMax?: string;
}

const DealImageUploader = ({ images, onChange, maxImages = 8, labelAdd = "ছবি", labelMax = "সর্বোচ্চ ৮টি ছবি যোগ করতে পারবেন" }: DealImageUploaderProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remaining = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    if (filesToUpload.length === 0) {
      toast.error(`সর্বোচ্চ ${maxImages}টি ছবি যোগ করা যাবে`);
      return;
    }

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

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("deal-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Upload error:", error);
        toast.error("ছবি আপলোড করতে সমস্যা হয়েছে");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("deal-images")
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length}টি ছবি আপলোড হয়েছে`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{labelAdd}</span>
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
