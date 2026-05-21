/**
 * 🔥 CareerLinkCard - 커리어 링크 카드 (STEP: 개인 기록 상세 페이지)
 * 
 * /me 페이지에 추가
 * - 내 커리어 링크
 * - 강요 ❌, 관심 있는 사람만 클릭
 */

import { useMyCareer } from "@/hooks/useMyCareer";
import { Card } from "@/components/ui/cards/Card";
import { Trophy, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CareerLinkCard() {
  const { careerItems, loading } = useMyCareer();
  const navigate = useNavigate();

  // 결과 없으면 카드 미노출
  if (loading || careerItems.length === 0) {
    return null;
  }

  return (
    <Card
      variant="info"
      className="bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/me/records")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">내 커리어</h3>
            <p className="text-sm text-gray-600">참가한 모든 대회 기록 보기</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
      </div>
    </Card>
  );
}
