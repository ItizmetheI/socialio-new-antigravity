import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoaderProps {
  onComplete: () => void;
}

export default function Loader({ onComplete }: LoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Sequence the loader steps
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for exit animation to complete before unmounting
    }, 2000); // 2 second loading experience

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-10%" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="flex flex-col items-center">
            <motion.img
              src="/logo.png"
              alt="Socialio Loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-12 w-auto mb-6" 
            />
            <div className="w-[200px] h-[2px] bg-white/10 relative overflow-hidden">
               <motion.div 
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-full h-full"
               />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
