// src/pages/team/TeamCreateStep2.tsx
// 🔥 STEP 2: 노원구 축구협회 선택 화면 (노원 실전 전용)
// 
// 핵심 정체성: "결정 페이지"
// - 팀 정보 페이지 ❌
// - 관리 페이지 ❌
// - 결정 페이지 ✅
// 
// 역할:
// "지금 바로 외부로 나갈래?" (협회 가입)
// "아니면 내부부터 다질래?" (팀 준비)
// 
// UX 원칙 (완전 Stateless):
// - 이 화면은 "정보를 쓰는 곳"이 아니라 "결정만 받는 곳"
// - teamId 검증 ❌ / team 조회 ❌ / alert ❌
// - 버튼 클릭 시에만 navigate (teamId가 없어도 /me로 이동)
// - /me에서만 팀 상태 판단 (useMyTeams 실시간 구독)

import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TeamCreateStep2() {
  const navigate = useNavigate();
  const { sport, type } = useParams<{ sport?: string; type?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sportType = sport || type || searchParams.get("type") || "soccer";
  const teamId = searchParams.get("teamId"); // STEP 1에서 생성된 팀 ID
  
  const [loading, setLoading] = useState(false);

  // 🔥 teamId를 localStorage에 저장 (동기화 대기 화면에서 사용)
  useEffect(() => {
    if (teamId) {
      localStorage.setItem('lastCreatedTeamId', teamId);
    }
  }, [teamId]);

  // 🔥 협회 회원 신청 → 협회 가입 페이지로 이동 (teamId 포함)
  const handleRequestMembership = () => {
    // teamId를 찾기 (여러 소스에서)
    const foundTeamId = teamId || localStorage.getItem('lastCreatedTeamId');
    
    // 🔥 null 문자열 체크
    if (!foundTeamId || foundTeamId === "null" || foundTeamId === "undefined") {
      // teamId를 찾을 수 없으면 /me로 이동 (허브)
      navigate("/me", { replace: true });
      return;
    }

    // 🔥 협회 가입 페이지로 이동 (teamId 포함)
    // 노원구 축구협회: assoc-nowon-football
    navigate(`/associations/assoc-nowon-football/apply?teamId=${foundTeamId}`, { replace: true });
  };

  // 🔥 팀 관리하러 가기 → 팀 관리 페이지로 이동 (teamId 포함)
  const handleSkip = () => {
    // teamId를 찾기 (여러 소스에서)
    const foundTeamId = teamId || localStorage.getItem('lastCreatedTeamId');
    
    // 🔥 null 문자열 체크
    if (!foundTeamId || foundTeamId === "null" || foundTeamId === "undefined") {
      // teamId를 찾을 수 없으면 /me로 이동 (허브)
      navigate("/me", { replace: true });
      return;
    }

    // 팀 생성 직후 → 팀 홈에서 모집·채팅·일정으로 분기
    navigate(`/team/${foundTeamId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full py-6">
        {/* STEP 표시 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
              STEP 2 / 3
            </span>
            <span>협회 선택 (노원 실전)</span>
          </div>
        </div>

        {/* 상단 선언 */}
        <div className="mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎉</span>
              <h2 className="text-lg font-bold text-green-900 dark:text-green-100">
                팀이 만들어졌어요!
              </h2>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              이제 팀장으로서<br />
              팀을 운영하고, 더 큰 활동을 시작할 수 있어요.
            </p>
          </div>
        </div>

        {/* 노원구 축구협회 카드 */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 shadow-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  ⚽ 노원구 축구협회와 함께할까요?
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  서울시 노원구
                </p>
              </div>
            </div>

            {/* 혜택 목록 */}
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>운동장 대관 걱정 없이 경기 진행</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>리그 · 교류전을 통한 팀 활동 확대</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>협회 공지와 기록을 한 곳에서 관리</span>
              </li>
            </ul>

            {/* CTA 버튼 */}
            <Button
              onClick={handleRequestMembership}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2 mb-3"
            >
              {loading ? "신청 중..." : "협회에 가입하고 활동 시작하기 →"}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={loading}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 h-12 text-base"
            >
              팀 관리하러 가기
            </Button>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            💡 언제든지 팀 관리 페이지에서<br />
            협회 가입을 진행할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
}

