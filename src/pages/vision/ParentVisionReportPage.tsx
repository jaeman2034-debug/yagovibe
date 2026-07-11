/**
 * RC4-4 M4 — Parent Vision Report (full page)
 * Route: /home/parent/vision/report?teamId=&playerId=&matchId=
 */

import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ParentIntelligenceSection } from "@/components/vision/parent/ParentIntelligenceSection";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { VISION_PILOT_MATCH_ID } from "@/lib/vision/fiiSummaryLoader";

export default function ParentVisionReportPage() {
  const [params] = useSearchParams();
  const teamId = params.get("teamId")?.trim() ?? "";
  const playerId = params.get("playerId")?.trim() ?? "";
  const matchId = params.get("matchId")?.trim() || VISION_PILOT_MATCH_ID;
  const playerName = params.get("playerName")?.trim() ?? undefined;

  if (!teamId || !playerId) {
    return (
      <div className="px-3 py-8 md:mx-auto md:max-w-lg">
        <Link
          to="/home/parent"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          보호자 홈
        </Link>
        <p className="mt-6 text-sm text-gray-700">
          teamId와 playerId가 필요합니다. 자녀 프로필에서 리포트를 열어 주세요.
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-none px-3 py-6 md:mx-auto md:max-w-lg"
      data-testid="parent-vision-report-page"
    >
      <Link
        to="/home/parent"
        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        보호자 홈
      </Link>
      <h1 className="mt-4 text-xl font-black text-indigo-950">Parent Vision Report</h1>
      <p className="mt-1 text-xs text-indigo-800/80">
        fii_summary 기반 경기 성장 리포트 (RC4-4)
      </p>
      <VisionPlatformNav
        className="mt-3"
        teamId={teamId}
        matchId={matchId}
        playerId={playerId}
        current="parent-report"
        variant="light"
        compact
      />
      <ParentIntelligenceSection
        className="mt-4"
        teamId={teamId}
        playerId={playerId}
        playerName={playerName}
        matchId={matchId}
      />
    </div>
  );
}
