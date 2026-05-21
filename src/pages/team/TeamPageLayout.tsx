import { mobileFullWidthContainerClassName } from "@/components/layout/MobileFullWidthContainer";

/**
 * 🔥 TeamPageLayout - /team 페이지 고정 레이아웃 (STEP 14)
 *
 * STEP 14 설계 원칙:
 * - /me와 동일한 3-Layer 구조
 * - 이 컴포넌트는 절대 분기 없음
 * - 스타일만 담당
 * - 형태를 고정하면 문제의 80%는 다시 발생하지 않는다
 *
 * 3-Layer 구조:
 * 1. IdentityHeader (항상 렌더링 - 나 + 팀 관계 요약)
 * 2. PersonaSection (Persona별 메인 콘텐츠)
 * 3. OpportunitySection (CTA 전용)
 */

interface TeamPageLayoutProps {
  children: React.ReactNode;
}

/**
 * 🔥 /team 페이지 레이아웃 컴포넌트
 *
 * 이 컴포넌트는:
 * - 절대 분기 없음
 * - 스타일만 담당
 * - 3-Layer 구조의 컨테이너 역할
 */
export function TeamPageLayout({ children }: TeamPageLayoutProps) {
  return (
    <main className="team-page min-h-screen bg-gray-50 pb-20">
      <div className={mobileFullWidthContainerClassName}>{children}</div>
    </main>
  );
}
