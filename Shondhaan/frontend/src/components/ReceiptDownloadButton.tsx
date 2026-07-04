import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReceiptPdf, type ReceiptData } from "@/lib/receiptPdf";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  data: ReceiptData;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
}

const ReceiptDownloadButton = ({ data, variant = "outline", size = "sm", label = "রসিদ ডাউনলোড" }: Props) => {
  const onClick = () => {
    try {
      downloadReceiptPdf(data);
      haptic("success");
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch {
      toast.error("ডাউনলোড ব্যর্থ হয়েছে");
    }
  };
  return (
    <Button variant={variant} size={size} onClick={onClick} className="gap-2">
      <Download className="w-4 h-4" /> {label}
    </Button>
  );
};

export default ReceiptDownloadButton;