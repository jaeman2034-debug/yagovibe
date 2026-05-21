/**
 * 공지/대회/대관 공통 페이지 레이아웃
 * 
 * 원칙:
 * - 모든 섹션 페이지를 "한 시스템"처럼 보이게 통일
 * - 공식 기준 배지 고정
 * - 하단 고정 문구 고정
 * - 상단 설명 카드 옵션 지원
 */

import { Link } from "react-router-dom";
import { OfficialSystemBadge } from "@/components/common/OfficialSystemBadge";

interface SectionLayoutProps {
  title: string;
  children: React.ReactNode;
  backUrl?: string;
  associationId?: string;
  description?: string; // 상단 설명 카드 텍스트 (옵션)
  isOfficial?: boolean; // 공식 기준 여부 (기본값: true)
}

export function SectionLayout({
  title,
  children,
  backUrl,
  associationId,
  description,
  isOfficial = true, // 기본값: true (협회 시스템은 기본적으로 공식 기준)
}: SectionLayoutProps) {
  const defaultBackUrl = associationId ? `/association/${associationId}` : backUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          {defaultBackUrl && (
            <Link
              to={defaultBackUrl}
              className="text-blue-600 hover:text-blue-800 mb-4 text-sm inline-block"
            >
              ← 협회 페이지로 돌아가기
            </Link>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {isOfficial && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                공식 기준
              </span>
            )}
          </div>
        </div>

        {/* 상단 설명 카드 (옵션) */}
        {description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 font-medium">{description}</p>
          </div>
        )}

        {/* 본문 */}
        <div className="sectionBody">{children}</div>

        {/* 하단 고정 문구 (공식 기준일 때만) */}
        {isOfficial && <OfficialSystemBadge variant="footer" />}
      </div>
    </div>
  );
}
