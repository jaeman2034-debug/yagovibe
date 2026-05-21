/**
 * 🔥 운영 액션 섹션 컴포넌트
 * 조 추첨 실행, 경기 자동 생성, 경기장별 일정표 관리
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DrawExecuteButton } from "@/components/tournament/DrawExecuteButton";
import { GenerateMatchesButton } from "@/components/tournament/GenerateMatchesButton";
import { PromoteTestToOfficialButton } from "@/components/tournament/PromoteTestToOfficialButton";
import { TestDataManagementButton } from "@/components/tournament/TestDataManagementButton";
import { TestTeamGenerator } from "@/components/tournament/TestTeamGenerator";
import { TeamRosterPhaseCard } from "@/components/tournament/TeamRosterPhaseCard";
import { Button } from "@/components/ui/button";
import { Calendar, Shuffle, PlusCircle, Settings, ArrowRight, CheckCircle2, Archive } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useState, useEffect } from "react";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";

interface TournamentOpsActionsProps {
  associationId: string;
  tournament: Tournament;
  onActionSuccess?: () => void;
  testMode?: boolean; // 🔥 테스트 모드
}

export function TournamentOpsActions({
  associationId,
  tournament,
  onActionSuccess,
  testMode = false, // 🔥 테스트 모드 기본값
}: TournamentOpsActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  // 🔥 협회 관리자 권한 확인 (올바른 권한 체크)
  const { isAdmin: isUserAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  // 디버깅 로그
  useEffect(() => {
    if (!adminLoading) {
      console.log("[TournamentOpsActions] 관리자 권한 확인", {
        associationId,
        isUserAdmin,
        userId: user?.uid,
      });
    }
  }, [isUserAdmin, adminLoading, associationId, user?.uid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">운영 액션</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          대회 운영에 필요한 작업을 순서대로 진행하세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 🔥 0️⃣ 테스트 팀 생성 (관리자 전용, 운영 액션 최상단) */}
        {!adminLoading && isUserAdmin && (
          <div className="border-2 border-blue-300 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-amber-50 mb-6">
            <TestTeamGenerator
              associationId={associationId}
              tournamentId={tournament.id}
              onTeamsCreated={onActionSuccess}
            />
          </div>
        )}

        {/* 🔥 팀원 등록 Phase 제어 (관리자 전용, 테스트 팀 생성 바로 아래) */}
        {!adminLoading && isUserAdmin && (
          <div className="mb-6">
            <TeamRosterPhaseCard
              associationId={associationId}
              tournamentId={tournament.id}
              currentPhase={tournament.tournamentPhase}
              onUpdate={onActionSuccess}
            />
          </div>
        )}
        
        {/* 🔥 권한 확인 중 표시 */}
        {adminLoading && (
          <div className="border rounded-lg p-4 bg-gray-50 mb-6">
            <p className="text-sm text-gray-600">권한 확인 중...</p>
          </div>
        )}
        
        {/* 🔥 권한 없을 때 안내 (디버깅용) */}
        {!adminLoading && !isUserAdmin && (
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50 mb-6">
            <p className="text-sm text-red-700 font-semibold">⚠️ 관리자 권한이 없습니다</p>
            <p className="text-xs text-red-600 mt-1">
              협회 관리자로 설정되어 있는지 확인해주세요.
              <br />
              associations/{associationId} 문서의 adminUids 배열에 현재 사용자 UID가 포함되어 있어야 합니다.
            </p>
          </div>
        )}

        {/* 1️⃣ 조 추첨 실행 */}
        {(!tournament.drawExecuted || testMode) && (
          <div className={`border rounded-lg p-4 ${testMode ? "bg-orange-50 border-orange-200" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Shuffle className={`w-5 h-5 ${testMode ? "text-orange-600" : "text-blue-600"}`} />
              <h3 className="font-semibold text-gray-900">
                1️⃣ 조 추첨 실행
                {testMode && <span className="ml-2 text-sm text-orange-600">🧪 테스트 모드</span>}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              승인된 팀을 시스템 랜덤 알고리즘으로 조에 배정합니다.
              <span className="font-semibold text-red-600 ml-1">(1회만 실행 가능, 되돌릴 수 없음)</span>
              {testMode && (
                <span className="block mt-2 text-orange-700 text-xs">
                  ⚠️ 테스트 모드: 운영 기록에는 반영되지 않습니다.
                </span>
              )}
            </p>
            <DrawExecuteButton
              associationId={associationId}
              tournament={tournament}
              onSuccess={onActionSuccess}
              testMode={testMode} // 🔥 테스트 모드 전달
            />
          </div>
        )}

        {/* 조 추첨 완료 상태 (공식 확정) */}
        {tournament.drawExecuted && !testMode && (
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">✅ 공식 조 추첨 확정</h3>
            </div>
            <p className="text-sm text-green-800">
              본 대회는 공식 조 추첨 및 대진표가 확정되었습니다. 이후 수정은 이력으로 관리됩니다.
            </p>
          </div>
        )}

        {/* 2️⃣ 경기 자동 생성 */}
        <div className={`border rounded-lg p-4 ${tournament.drawExecuted ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">2️⃣ 경기 자동 생성</h3>
            {!tournament.drawExecuted && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                조 추첨 완료 후 활성화
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">
            조 추첨 결과를 기준으로 모든 경기를 자동 생성합니다.
            <span className="font-semibold text-red-600 ml-1">(1회만 실행 가능, 되돌릴 수 없음)</span>
          </p>
          {tournament.drawExecuted || testMode ? (
            <GenerateMatchesButton
              associationId={associationId}
              tournamentId={tournament.id}
              tournament={tournament}
              onSuccess={onActionSuccess}
              testMode={testMode} // 🔥 테스트 모드 전달
            />
          ) : (
            <div className="text-sm text-gray-500 italic">
              ※ 조 추첨 완료 후 경기 자동 생성이 가능합니다.
            </div>
          )}
        </div>

        {/* 3️⃣ 경기장별 일정표 관리 */}
        <div className={`border rounded-lg p-4 ${tournament.drawExecuted ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">3️⃣ 경기장별 일정표 관리</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            경기장별 일정표를 확인하고 심판 배정, 경기 결과를 관리합니다.
            {!tournament.drawExecuted && (
              <span className="block mt-1 text-amber-600 font-medium">
                ※ 조 추첨 및 경기 생성 후 일정이 자동 생성됩니다.
              </span>
            )}
          </p>
          <Button
            onClick={() => {
              const scheduleSection = document.getElementById("schedule-section");
              if (scheduleSection) {
                scheduleSection.scrollIntoView({ behavior: "smooth" });
              } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!tournament.drawExecuted}
          >
            <Settings className="w-4 h-4 mr-2" />
            일정표 보기
          </Button>
        </div>

        {/* 4️⃣ 테스트 결과 공식 승격 (테스트 모드일 때만 표시) */}
        {testMode && (
          <div className="border rounded-lg p-4 bg-white border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">4️⃣ 테스트 결과 공식 승격</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              테스트 모드로 생성된 조 추첨 및 대진표를 공식 기록으로 승격합니다.
              <span className="font-semibold text-red-600 ml-1">(되돌릴 수 없음)</span>
            </p>
            <PromoteTestToOfficialButton
              associationId={associationId}
              tournamentId={tournament.id}
              onSuccess={onActionSuccess}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

