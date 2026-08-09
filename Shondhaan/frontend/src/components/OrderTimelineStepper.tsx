import { motion } from "framer-motion";
import { Check, Clock, Package, Truck, Home } from "lucide-react";

export type OrderStep = {
  key: string;
  label: string;
  time?: string;
};

interface Props {
  steps: OrderStep[];
  currentIndex: number;
}

const ICONS = [Clock, Package, Truck, Home, Check];

const OrderTimelineStepper = ({ steps, currentIndex }: Props) => {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const Icon = ICONS[i] ?? Check;
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s.key} className="flex gap-3 pb-5 last:pb-0 relative">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-4 top-8 bottom-0 w-0.5 ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                done
                  ? "bg-primary text-white"
                  : active
                  ? "bg-primary/20 text-primary ring-2 ring-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
            </motion.div>
            <div className="flex-1 pt-1">
              <p className={`text-sm font-medium ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </p>
              {s.time && <p className="text-xs text-muted-foreground mt-0.5">{s.time}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderTimelineStepper;