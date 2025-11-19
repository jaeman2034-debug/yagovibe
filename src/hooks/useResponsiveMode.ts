import { useEffect, useState } from "react";

export function useResponsiveMode() {
  const [mode, setMode] = useState("mobile-portrait");

  const update = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w <= 768;
    const isTablet = w > 768 && w <= 1024;
    const isPC = w > 1024;
    const isLandscape = w > h;

    if (isPC) {
      setMode("pc-center"); // PC = 세로형 + 중앙정렬
    } else if (isMobile && isLandscape) {
      setMode("mobile-landscape"); // 모바일 가로형
    } else if (isMobile) {
      setMode("mobile-portrait"); // 모바일 세로형
    } else if (isTablet) {
      setMode("tablet"); // 태블릿
    }
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

