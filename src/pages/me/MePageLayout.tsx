/**
 * 🔥 MePageLayout - /me 페이지 고정 레이아웃 (PR 3)
 * 
 * PR 3 설계 원칙:
 * - 이 컴포넌트는 절대 분기 없음
 * - 스타일만 담당
 * - 형태를 고정하면 문제의 80%는 다시 발생하지 않는다
 * 
 * 3-Layer 구조:
 * 1. IdentityHeader (항상 렌더링)
 * 2. PersonaSection (Persona별 메인 콘텐츠)
 * 3. OpportunitySection (CTA 전용)
 */

interface MePageLayoutProps {
  children: React.ReactNode;
}

/**
 * 🔥 /me 페이지 레이아웃 컴포넌트
 * 
 * 이 컴포넌트는:
 * - 절대 분기 없음
 * - 스타일만 담당
 * - 3-Layer 구조의 컨테이너 역할
 */
export function MePageLayout({ children }: MePageLayoutProps) {
  return (
    <main className="me-page min-h-screen bg-gray-50 pb-20">
      <div className="me-container">
        {children}
      </div>
    </main>
  );
}
