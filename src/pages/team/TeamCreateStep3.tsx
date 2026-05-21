// src/pages/team/TeamCreateStep3.tsx
// 🔥 STEP 3: 신청 완료 상태 화면
// 
// 회원 신청 완료 후 표시되는 화면
// - 신청 완료 메시지
// - 승인 대기 안내
// - 다음 액션 선택

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamCreateStep3() {
  const navigate = useNavigate();
  const { sport, type } = useParams<{ sport?: string; type?: string }>();
  const [searchParams] = useSearchParams();
  const sportType = sport || type || searchParams.get("type") || "soccer";
  const teamId = searchParams.get("teamId");

  // 팀 홈으로 이동 (teamId 있으면)
  const handleGoToTeamManagement = () => {
    if (teamId) {
      navigate(`/team/${teamId}`, { replace: true });
      return;
    }
    navigate(`/sports/${sportType}/team`, { replace: true });
  };

  // 대관 현황 보기 (비회원 기준, 승인 전까지는 비회원 대관 정책 적용)
  const handleViewBookingStatus = () => {
    if (teamId) {
      navigate(`/team/${teamId}`, { replace: true });
      return;
    }
    navigate(`/sports/${sportType}/team`, { replace: true });
    // TODO: 대관 현황 섹션으로 스크롤 (비회원 대관 정책 표시)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full py-6">
        {/* STEP 표시 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">
              STEP 3 / 3
            </span>
            <span>신청 완료</span>
          </div>
        </div>

        {/* 완료 메시지 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            신청이 완료되었습니다
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            노원구 축구협회 관리자가 검토 후 승인합니다
          </p>
        </div>

        {/* 상태 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                노원구 축구협회 회원 신청
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                승인 대기 중
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                  검토 중
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            ⏳ 승인까지 보통 1-2일 소요됩니다. 승인 완료 시 알림을 드립니다.
          </p>
        </div>

        {/* CTA 버튼 */}
        <div className="space-y-3">
          <Button
            onClick={handleGoToTeamManagement}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
          >
            팀 관리로 이동
          </Button>
          
          <Button
            onClick={handleViewBookingStatus}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 h-12 text-base flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            대관 현황 보기 (비회원 기준)
          </Button>
        </div>
      </div>
    </div>
  );
}

