import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

const ImageUploader = ({ value, onChange, folder = "general", label = "ছবি আপলোড" }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করা যাবে");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ফাইল সাইজ ৫MB এর বেশি হতে পারবে না");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("cms-images").upload(fileName, file);

    if (error) {
      toast.error("আপলোড ব্যর্থ: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("cms-images").getPublicUrl(fileName);
    onChange(urlData.publicUrl);
    toast.success("ছবি আপলোড হয়েছে");
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-16 w-16 rounded-lg border border-border overflow-hidden bg-secondary">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => onChange("")}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "আপলোড হচ্ছে..." : "ছবি বাছুন"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
      {value && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="অথবা URL পেস্ট করুন"
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      )}
      {!value && (
        <input
          value=""
          onChange={(e) => onChange(e.target.value)}
          placeholder="অথবা ছবির URL পেস্ট করুন"
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
};

export default ImageUploader;
