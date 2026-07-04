import { toast } from "sonner";

interface Options {
  message: string;
  onUndo: () => void;
  duration?: number;
  actionLabel?: string;
}

export function showUndoToast({ message, onUndo, duration = 5000, actionLabel = "আনডু" }: Options) {
  toast(message, {
    duration,
    action: {
      label: actionLabel,
      onClick: () => onUndo(),
    },
  });
}