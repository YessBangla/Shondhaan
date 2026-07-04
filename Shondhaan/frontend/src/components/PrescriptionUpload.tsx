import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, FileImage, CheckCircle2, AlertCircle, Image as ImageIcon, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DocumentScanner from "@/components/DocumentScanner";

interface PrescriptionUploadProps {
  bn: boolean;
  onUploadComplete?: (urls: string[]) => void;
}

const PrescriptionUpload = ({ bn, onUploadComplete }: PrescriptionUploadProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ file: File; preview: string; uploading: boolean; uploaded: boolean; url?: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const accepted = Array.from(newFiles).filter(f =>
      f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    if (accepted.length === 0) {
      toast.error(bn ? "শুধুমাত্র ছবি ফাইল গ্রহণযোগ্য (সর্বোচ্চ ১০MB)" : "Only image files accepted (max 10MB)");
      return;
    }
    const newEntries = accepted.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
    }));
    setFiles(prev => [...prev, ...newEntries].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAll = async () => {
    if (!user) {
      toast.error(bn ? "আপলোড করতে লগইন করুন" : "Please login to upload");
      return;
    }
    const pending = files.filter(f => !f.uploaded);
    if (pending.length === 0) return;

    const updatedFiles = [...files];
    const uploadedUrls: string[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].uploaded) {
        if (updatedFiles[i].url) uploadedUrls.push(updatedFiles[i].url!);
        continue;
      }
      updatedFiles[i] = { ...updatedFiles[i], uploading: true };
      setFiles([...updatedFiles]);

      const ext = updatedFiles[i].file.name.split(".").pop() || "jpg";
      const path = `prescriptions/${user.id}/${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage
        .from("cms-images")
        .upload(path, updatedFiles[i].file, { upsert: true });

      if (error) {
        updatedFiles[i] = { ...updatedFiles[i], uploading: false };
        setFiles([...updatedFiles]);
        toast.error(bn ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed");
        continue;
      }

      const { data: urlData } = supabase.storage.from("cms-images").getPublicUrl(path);
      updatedFiles[i] = { ...updatedFiles[i], uploading: false, uploaded: true, url: urlData.publicUrl };
      uploadedUrls.push(urlData.publicUrl);
      setFiles([...updatedFiles]);
    }

    toast.success(bn ? "প্রেসক্রিপশন আপলোড সম্পন্ন!" : "Prescription uploaded!");
    onUploadComplete?.(uploadedUrls);
  };

  const allUploaded = files.length > 0 && files.every(f => f.uploaded);
  const hasFiles = files.length > 0;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <FileImage className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-bold text-foreground">
            {bn ? "📋 প্রেসক্রিপশন আপলোড করুন" : "📋 Upload Prescription"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bn ? "ডাক্তারের প্রেসক্রিপশনের ছবি তুলুন বা গ্যালারি থেকে সিলেক্ট করুন" : "Take a photo or select from gallery"}
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-background hover:border-primary/40"
        }`}
      >
        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {bn ? "ছবি টেনে এখানে ছাড়ুন অথবা" : "Drag & drop image here or"}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {bn ? "স্মার্ট স্ক্যান" : "Smart Scan"}
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Camera className="h-3.5 w-3.5" />
            {bn ? "ক্যামেরা" : "Camera"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Upload className="h-3.5 w-3.5" />
            {bn ? "গ্যালারি" : "Gallery"}
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <p className="text-[10px] text-muted-foreground mt-2">
          {bn ? "সর্বোচ্চ ৫টি ছবি • JPG, PNG • সর্বোচ্চ ১০MB" : "Max 5 images • JPG, PNG • Max 10MB each"}
        </p>
      </div>

      {/* Preview grid */}
      <AnimatePresence>
        {hasFiles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {files.map((f, i) => (
                <motion.div
                  key={f.preview}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                >
                  <img src={f.preview} alt={`prescription-${i}`} className="h-full w-full object-cover" />
                  {f.uploading && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                      <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {f.uploaded && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-primary drop-shadow-md" />
                    </div>
                  )}
                  {!f.uploading && !f.uploaded && (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {!allUploaded && (
              <button
                onClick={uploadAll}
                disabled={files.some(f => f.uploading)}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {bn ? `প্রেসক্রিপশন আপলোড করুন (${files.filter(f => !f.uploaded).length}টি)` : `Upload Prescription (${files.filter(f => !f.uploaded).length})`}
              </button>
            )}

            {allUploaded && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs text-foreground font-medium">
                  {bn ? "প্রেসক্রিপশন সফলভাবে আপলোড হয়েছে! অর্ডার করলে আমাদের ফার্মাসিস্ট যাচাই করে ঔষধ পাঠাবেন।" : "Prescription uploaded! Our pharmacist will verify and deliver your medicines."}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info note */}
      <div className="flex items-start gap-2 rounded-lg bg-secondary/80 p-3">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>{bn ? "• প্রেসক্রিপশন স্পষ্ট ও পড়ার উপযোগী হতে হবে" : "• Prescription must be clear and readable"}</p>
          <p>{bn ? "• শুধুমাত্র রেজিস্টার্ড ডাক্তারের প্রেসক্রিপশন গ্রহণযোগ্য" : "• Only registered doctor's prescriptions accepted"}</p>
          <p>{bn ? "• আপনার তথ্য সম্পূর্ণ গোপন ও নিরাপদ থাকবে" : "• Your information is completely secure"}</p>
        </div>
      </div>
    </motion.div>

      <DocumentScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title={bn ? "প্রেসক্রিপশন স্ক্যান" : "Scan Prescription"}
        onCapture={(dataUrl) => {
          // Convert dataURL → File and feed into existing pipeline
          fetch(dataUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
              const dt = new DataTransfer();
              dt.items.add(file);
              addFiles(dt.files);
            });
        }}
      />
    </>
  );
};

export default PrescriptionUpload;
