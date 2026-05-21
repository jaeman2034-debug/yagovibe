/**
 * TeamCreateChoice
 * 팀 생성 선택 화면
 * 
 * 핵심 원칙:
 * - 팀 만들기 = 팀을 등록하는 행위 (협회 소속 아님)
 * - 협회 소속 = 명시적 신청 + 승인 필요
 * 
 * 플로우:
 * 1. 현재 상태 확인 (협회 미소속)
 * 2. 선택지 A: 비회원팀으로 시작 (Primary, 즉시 생성)
 * 3. 선택지 B: 협회 회원팀으로 신청 (Secondary, 승인 필요)
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { normalizeSportId } from "@/constants/sports";
import { Building2, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";

export default function TeamCreateChoice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const sportType =
    normalizeSportId(sportParam ?? searchParams.get("type") ?? undefined) ?? "soccer";

  const [hubGuideTip, setHubGuideTip] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("yago:hubTeamCreateGuide") === "1") {
        setHubGuideTip(true);
        sessionStorage.removeItem("yago:hubTeamCreateGuide");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 선택지 A: 비회원팀으로 시작하기
  const handleCreateNonMemberTeam = () => {
    console.log("🔥 CLICKED 비회원 팀으로 시작하기", { sportType });
    navigate(`/sports/${sportType}/team/create?mode=non-member`);
  };

  // 선택지 B: 협회 회원팀으로 신청
  const handleRequestMemberTeam = () => {
    console.log("🔥 CLICKED 협회 회원 팀으로 신청", { sportType });
    navigate(`/sports/${sportType}/team/create?mode=member-request`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CreateFormContainer>
        <CreatePageContextBadges sportSlug={sportType} kind="team" />

        <div className="mb-8">
          {hubGuideTip ? (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              스포츠 허브에서 왔어요. 아래에서 팀 유형을 고르면 바로 만들 수 있어요.
              <button
                type="button"
                className="ml-2 text-xs font-semibold underline"
                onClick={() => setHubGuideTip(false)}
              >
                닫기
              </button>
            </div>
          ) : null}
          {user?.isAnonymous ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-50">
              게스트로도 팀을 만들 수 있어요. 만든 뒤 팀 화면에서 이메일·회원가입으로 계정을 연결하면 소유권을 안전하게 가져갈 수 있어요.
            </div>
          ) : null}
          {/* 현재 상태 표시 */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  현재 상태
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  협회 미소속
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            팀을 등록하고 시작하세요. 협회 소속은 나중에 신청할 수 있습니다.
          </p>
        </div>

        {/* 선택지 A: 비회원팀으로 시작하기 (Primary) */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    비회원 팀으로 시작하기
                  </h2>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                    추천
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  지금 바로 팀을 시작하고, 필요하면 협회에 합류하세요
                </p>
              </div>
            </div>

            {/* 장점 목록 */}
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>즉시 생성 가능</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>제한된 대관 (잔여 시간대 이용)</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>언제든 협회 전환 가능</span>
              </li>
            </ul>

            <Button
              onClick={handleCreateNonMemberTeam}
              disabled={false}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2 relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              비회원 팀으로 시작하기
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 선택지 B: 협회 회원팀으로 신청 (Secondary) */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    협회 회원 팀으로 신청
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  협회에 가입하여 우선 대관 시설을 이용하세요
                </p>
              </div>
            </div>

            {/* 주의사항 */}
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>협회 선택 필요</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>협회 승인 필요 (임시 상태: 회원 신청 중)</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>승인 후 우선 대관 시설 이용 가능</span>
              </li>
            </ul>
            
            {/* 승인 안내 문구 */}
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-6 px-2">
              ※ 협회 승인은 관리자의 검토 후 처리됩니다
            </p>

            <Button
              onClick={handleRequestMemberTeam}
              variant="outline"
              disabled={false}
              className="w-full border-purple-600 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 h-12 text-base font-semibold flex items-center justify-center gap-2 relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              협회 회원 팀으로 신청
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            💡 <strong>참고:</strong> 비회원팀으로 시작해도 언제든 협회에 가입 신청할 수 있습니다.
          </p>
        </div>
      </CreateFormContainer>
    </div>
  );
}

