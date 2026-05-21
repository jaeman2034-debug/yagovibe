import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        playOvrPop: {
          "0%": { transform: "scale(0.82)", opacity: "0.5" },
          "60%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        playStatChip: {
          "0%": { transform: "translateY(6px) scale(0.94)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        playGlowPulse: {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(129, 140, 248, 0.45), 0 0 28px rgba(99, 102, 241, 0.35), 0 12px 40px rgba(91, 33, 182, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px rgba(167, 139, 250, 0.6), 0 0 48px rgba(139, 92, 246, 0.45), 0 16px 48px rgba(67, 56, 202, 0.25)",
          },
        },
        playStatBarPulse: {
          "0%, 100%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(1.15)" },
        },
        playBadgeSparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "40%": { opacity: "0.85", transform: "scale(1.06)" },
          "70%": { opacity: "1", transform: "scale(1)" },
        },
        /** 미니슛 스트립 라벨(NICE/HOT/ON FIRE) 센터 팝업 */
        miniShotStreakPop: {
          "0%": { opacity: "0", transform: "scale(0.86)" },
          "18%": { opacity: "1", transform: "scale(1.06)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        /** 팀 프로필 완성도 점수 변화 피드백 */
        profileScoreDelta: {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.92)" },
          "18%": { opacity: "1", transform: "translateY(0) scale(1.08)" },
          "72%": { opacity: "1", transform: "translateY(-2px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
        },
      },
      animation: {
        "play-ovr-pop": "playOvrPop 0.75s cubic-bezier(0.34, 1.45, 0.64, 1) forwards",
        "play-stat-chip": "playStatChip 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "play-glow-pulse": "playGlowPulse 3s ease-in-out infinite",
        "play-stat-pulse": "playStatBarPulse 1.4s ease-in-out infinite",
        "play-badge-sparkle": "playBadgeSparkle 2.2s ease-in-out infinite",
        "mini-shot-streak-pop": "miniShotStreakPop 0.52s cubic-bezier(0.22, 1, 0.36, 1) both",
        "profile-score-delta": "profileScoreDelta 2.75s ease-out forwards",
      },
    },
  },
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
