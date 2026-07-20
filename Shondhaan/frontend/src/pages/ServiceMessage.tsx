import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type ServiceMessageProps = {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
};

const ServiceMessage = ({
  message,
  type = "info",
  duration = 3000,
}: ServiceMessageProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!visible || !message) return null;

  const styles = {
    success: "bg-green-100 text-green-700 border-green-300",
    error: "bg-red-100 text-red-700 border-red-300",
    info: "bg-blue-100 text-blue-700 border-blue-300",
  };

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-sm ${styles[type]}`}
    >
      <div className="flex items-center gap-2">
        {icons[type]}
        <span className="text-sm font-medium">{message}</span>
      </div>

      <button onClick={() => setVisible(false)}>
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default ServiceMessage;