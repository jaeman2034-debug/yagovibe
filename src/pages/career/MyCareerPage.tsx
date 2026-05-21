/**
 * 🔥 개인 기록 상세 페이지 (STEP: 개인 기록 상세 페이지)
 * 
 * /me/records
 * 
 * 페이지 구조 (HubLayout):
 * - IdentityHeader: 선수 이름, 종목/활동 기간
 * - PersonaSection: CareerSummary, CareerTimeline
 * - OpportunitySection: 없음 (기록은 소비용)
 * 
 * 핵심 원칙:
 * - 개인 기록은 '팀 결과를 개인 관점에서 재해석한 뷰(View)'
 * - 원본은 항상 tournamentResults
 * - 팀이 해체돼도 기록 유지
 */

import { useState } from "react";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { CareerSummary } from "@/components/career/CareerSummary";
import { CareerTimeline } from "@/components/career/CareerTimeline";
import { SeasonSelector } from "@/components/season/SeasonSelector";
import { ActivityLogSection } from "@/components/activity/ActivityLogSection";
import { useAuth } from "@/context/AuthProvider";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { Trophy, User } from "lucide-react";

export default function MyCareerPage() {
  const { user } = useAuth();
  const { profile } = useMyProfile();
  const { activeSeason } = useActiveSeason();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    activeSeason?.id || null // 기본값: 활성 시즌
  );

  const userName = profile?.name || user?.displayName || "선수";
  const sport = profile?.sport || "종목 미정";

  return (
    <HubLayout
      header={
        <IdentityHeader
          title={userName}
          subtitle="개인 커리어"
          meta={
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Trophy className="w-4 h-4" />
              <span>{sport}</span>
            </div>
          }
        />
      }
      persona={
        <div className="space-y-6">
          {/* 시즌 선택기 (STEP: 시즌/연도 관리 시스템) */}
          <SeasonSelector
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
            showAll={true}
          />
          <CareerSummary seasonId={selectedSeasonId} />
          <div>
            <div className="px-4 py-2 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">활동 타임라인</h2>
            </div>
            <CareerTimeline seasonId={selectedSeasonId} />
          </div>
          {/* 활동 로그 (STEP: 알림 히스토리 & 활동 로그) */}
          <div>
            <div className="px-4 py-2 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">활동 기록</h2>
            </div>
            <ActivityLogSection seasonId={selectedSeasonId} />
          </div>
        </div>
      }
      // OpportunitySection 없음 (기록은 소비용)
    />
  );
}
