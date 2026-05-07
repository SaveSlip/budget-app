"use client";

import { motion } from "motion/react";

interface AnimateSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimateSection({ children, delay = 0, className }: AnimateSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
