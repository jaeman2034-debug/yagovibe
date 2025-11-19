import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * RouteTransition
 * - 라우트 전환 시 자동 페이드/슬라이드 효과
 * - 레이아웃 내부에서 children을 감싸서 사용
 */
const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default RouteTransition;
