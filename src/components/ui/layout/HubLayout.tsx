/**
 * 🔥 HubLayout - 3-Layer 공용 골격 (STEP 15B)
 * 
 * 모든 Hub 페이지(/me, /team, /tournament)가 동일한 구조 사용
 * - 항상 동일한 구조
 * - 페이지별 스타일만 변경
 */

import { ReactNode } from "react";

interface HubLayoutProps {
  header: ReactNode;
  persona: ReactNode;
  opportunity?: ReactNode;
  children?: ReactNode; // 추가 콘텐츠 (폼 등)
  className?: string;
}

/**
 * 🔥 HubLayout 컴포넌트
 * 
 * 3-Layer 구조:
 * 1. header: IdentityHeader (항상 렌더링)
 * 2. persona: PersonaSection (Persona별 분기)
 * 3. opportunity: OpportunitySection (조건부 CTA)
 * 4. children: 추가 콘텐츠 (폼 등)
 */
export function HubLayout({
  header,
  persona,
  opportunity,
  children,
  className = "",
}: HubLayoutProps) {
  return (
    <main 
      className={`min-h-screen bg-gray-50 ${className}`}
      style={{
        paddingBottom: `calc(96px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* ① IdentityHeader - 항상 렌더링 */}
      <section className="hub-header">{header}</section>

      {/* ② PersonaSection - Persona별 분기 */}
      <section className="hub-persona">{persona}</section>

      {/* ③ OpportunitySection - 조건부 CTA */}
      {opportunity && <section className="hub-opportunity">{opportunity}</section>}

      {/* ④ 추가 콘텐츠 */}
      {children}
    </main>
  );
}
