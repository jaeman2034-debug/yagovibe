"use client";

/**
 * 협회 홈 Hero — 이미지 전용 (텍스트·오버레이·버튼 없음)
 */

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80";

interface FederationHeroProps {
  federation: {
    heroImage?: string;
    /** 스크린리더용 (화면에 표시하지 않음) */
    name?: string;
  };
}

export function FederationHero({ federation }: FederationHeroProps) {
  const url = federation.heroImage?.trim() || DEFAULT_HERO;

  return (
    <div
      role="img"
      aria-label={federation.name ? `${federation.name} 대표 이미지` : "협회 대표 이미지"}
      className="w-full h-[220px] md:h-[260px] rounded-xl overflow-hidden bg-gray-200 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('${url}')`,
      }}
    />
  );
}
