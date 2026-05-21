/**
 * HeroSection
 * 협회 공식 페이지 Hero 영역
 * 
 * 역할: "여기가 공식 채널이다"를 3초 안에 증명
 * 원칙: 행정 선언문 (홍보용 아님)
 * 
 * 문구: 회원/일반용 (기본)
 * - H1: 노원구 축구, 여기서 확인하세요
 * - H2: 공지 · 대회 일정 · 운동장 대관 현황을 한 화면에서 확인합니다.
 * - Meta: 전화/카톡 대신, 이 페이지가 기준입니다.
 */

import { Link, useParams } from "react-router-dom";

interface HeroSectionProps {
  associationName?: string;
  season?: string;
  highlightedTournamentTitle?: string | null;
}

export default function HeroSection({
  associationName = "노원구 축구협회",
  season,
  highlightedTournamentTitle,
}: HeroSectionProps) {
  const { associationId } = useParams<{ associationId: string }>();

  return (
    <section id="hero" className="py-16 border-b bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-6">
          {/* H1 - 메인 헤드라인 */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            노원구 축구, 여기서 확인하세요
          </h1>

          {/* H2 - 서브 설명 */}
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            공지 · 대회 일정 · 운동장 대관 현황을
            <br className="md:hidden" />
            한 화면에서 확인합니다.
          </p>

          {/* Meta - 보조 문장 */}
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            전화/카톡 대신, 이 페이지가 기준입니다.
          </p>

          {/* Quick Links - 페이지 링크 */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={`/association/${associationId}/notices`}
              className="px-6 py-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              #notice 공지
            </Link>
            <Link
              to={`/association/${associationId}/tournaments`}
              className="px-6 py-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              #tournament 대회
            </Link>
            <Link
              to={`/association/${associationId}/facility`}
              className="px-6 py-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              #facility 대관
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

