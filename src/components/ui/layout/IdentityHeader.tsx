/**
 * 🔥 공용 IdentityHeader (STEP 15B)
 * 
 * 모든 Hub 페이지에서 사용하는 공통 헤더
 * - 컨텍스트 주입 방식 (title, subtitle, meta)
 * - 페이지별로 다른 내용 표시
 */

import { ReactNode } from "react";

interface IdentityHeaderProps {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * 🔥 IdentityHeader 컴포넌트
 * 
 * 사용 예:
 * - /me: 이름/종목
 * - /team: 팀명/역할
 * - /tournament: 대회명/기간
 */
export function IdentityHeader({
  title,
  subtitle,
  meta,
  actions,
  className = "",
}: IdentityHeaderProps) {
  return (
    <section className={`px-4 pt-6 pb-4 bg-white border-b border-gray-200 ${className}`}>
      {/* 제목 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>

      {/* 메타 정보 */}
      {meta && <div className="mb-4">{meta}</div>}

      {/* 액션 버튼 */}
      {actions && <div className="mt-4">{actions}</div>}
    </section>
  );
}
