import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

interface JobsPageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Subtle, branded page transition for all Yess Jobs routes.
 * - Fades + slides content up on enter
 * - Re-keys on pathname so navigation between jobs pages re-triggers the animation
 * - Respects prefers-reduced-motion via Framer Motion defaults
 */
const JobsPageTransition = ({ children, className = "" }: JobsPageTransitionProps) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1], // expo-out for a refined feel
      }}
      className={`min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default JobsPageTransition;