/**
 * 🔥 CoachReportModal - 코치 리포트 모달
 * 
 * 역할:
 * - 경기 전 리포트 표시
 * - 리포트 다운로드/인쇄
 * 
 * UX 목적:
 * - 코치가 리포트를 한눈에 확인
 * - PDF 저장 가능
 */

import { useCoachReport } from "@/hooks/useCoachReport";
import { Download, Printer, FileText, X } from "lucide-react";

type Props = {
  playerUids: string[];
  teamName: string;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 🔥 코치 리포트 모달 컴포넌트
 */
export function CoachReportModal({
  playerUids,
  teamName,
  isOpen,
  onClose,
}: Props) {
  const { report, loading, downloadAsText, downloadAsHTML, printReport } =
    useCoachReport(playerUids, teamName);

  if (!isOpen) return null;

  if (loading || !report) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
          <div className="text-center text-neutral-500">리포트 생성 중...</div>
        </div>
      </div>
    );
  }

  const { generatedAt, summary, riskPlayers, readyPlayers, aiComment } = report;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📊 {teamName} 경기 전 리포트</h2>
            <div className="text-sm text-neutral-500 mt-1">
              생성일: {generatedAt.toLocaleString("ko-KR")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAsHTML}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              다운로드
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 리포트 내용 */}
        <div className="p-6 space-y-6">
          {/* ① 팀 요약 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-600">
              📈 팀 요약
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">팀 평균 리듬</div>
                <div className="text-2xl font-bold text-blue-700">
                  {summary.averageRhythm !== null
                    ? Math.round(summary.averageRhythm)
                    : "-"}
                  점
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-xs text-orange-600 mb-1">과부하 선수</div>
                <div className="text-2xl font-bold text-orange-700">
                  {summary.overloadPlayers}명
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="text-xs text-yellow-600 mb-1">회복 권장</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {summary.recoveryPlayers}명
                </div>
              </div>
            </div>
          </div>

          {/* ② 위험 선수 리스트 (핵심) */}
          {riskPlayers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                ⚠️ 위험 선수 ({riskPlayers.length}명)
              </h3>
              <div className="space-y-2">
                {riskPlayers.map((player) => {
                  const reasons: string[] = [];
                  if (player.rhythmScore !== null && player.rhythmScore < 40) {
                    reasons.push(`리듬 ${Math.round(player.rhythmScore)}`);
                  }
                  if (player.trainingLoad.loadRatio > 1.2) {
                    reasons.push(`부하 ${player.trainingLoad.loadRatio.toFixed(1)}x`);
                  }
                  return (
                    <div
                      key={player.uid}
                      className="bg-red-50 rounded-lg p-3 border border-red-200"
                    >
                      <div className="font-semibold text-red-700">
                        {player.name} — {reasons.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ③ 컨디션 우수 선수 */}
          {readyPlayers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">
                ✅ 컨디션 우수 선수 ({readyPlayers.length}명)
              </h3>
              <div className="space-y-2">
                {readyPlayers.map((player) => {
                  const status =
                    player.rhythmScore! >= 85
                      ? "훈련 적기"
                      : "집중 훈련 가능";
                  return (
                    <div
                      key={player.uid}
                      className="bg-green-50 rounded-lg p-3 border border-green-200"
                    >
                      <div className="font-semibold text-green-700">
                        {player.name} — 리듬 {Math.round(player.rhythmScore!)} (
                        {status})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ④ AI 코치 코멘트 (하단 한 줄) */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-600">
              💡 AI 코치 코멘트
            </h3>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-neutral-700 leading-relaxed">{aiComment}</p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t p-4 text-center text-xs text-neutral-500">
          YAGO SPORTS - 선수 퍼포먼스 관리 플랫폼
        </div>
      </div>
    </div>
  );
}
