import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"];
  safelist: [
    // 마켓/상품 상세에서 사용하는 커스텀 유틸들
    "products-grid",
    "recommended-grid",
    "product-card",
    "detail-view",
    "product-detail",
    // HMR 시 종종 튀는 레이아웃 유틸들
    "max-w-[900px]",
    "max-w-[600px]",
    "min-w-0",
    "w-full",
    "h-auto",
    // Skeleton 및 애니메이션
    "animate-pulse",
    "bg-gray-200",
    "bg-gray-200/80",
    "bg-gray-100",
  ],
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".products-grid": {
          display: "grid",
          "grid-template-columns": "1fr",
          gap: "1rem",
        },
        "@media (min-width: 640px)": {
          ".products-grid": {
            "grid-template-columns": "repeat(2, 1fr)",
          },
        },
        "@media (min-width: 1024px)": {
          ".products-grid": {
            "grid-template-columns": "repeat(3, 1fr)",
          },
        },
      });
    },
  ],
} satisfies Config;
