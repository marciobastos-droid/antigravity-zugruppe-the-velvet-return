import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction,
  rightAction,
  className = ""
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const background = useTransform(
    x,
    [-150, -50, 0, 50, 150],
    ["#ef4444", "#f87171", "#ffffff", "#22c55e", "#16a34a"]
  );

  const handleDragEnd = (event, info) => {
    if (info.offset.x < -100 && onSwipeLeft) {
      onSwipeLeft();
    } else if (info.offset.x > 100 && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ x, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      {/* Left Action Indicator */}
      {leftAction && (
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-red-600 font-semibold"
          style={{ opacity: useTransform(x, [0, -100], [0, 1]) }}
        >
          {leftAction}
        </motion.div>
      )}

      {/* Right Action Indicator */}
      {rightAction && (
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-green-600 font-semibold"
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
        >
          {rightAction}
        </motion.div>
      )}

      {children}
    </motion.div>
  );
}