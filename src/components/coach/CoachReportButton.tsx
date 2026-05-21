/**
 * 🔥 CoachReportButton - 코치 리포트 생성 버튼
 * 
 * 역할:
 * - 리포트 모달 열기
 * 
 * UX 목적:
 * - 코치에게 가치 전달
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import { CoachReportModal } from "./CoachReportModal";

type Props = {
  playerUids: string[];
  teamName: string;
};

/**
 * 🔥 코치 리포트 버튼 컴포넌트
 */
export function CoachReportButton({ playerUids, teamName }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <FileText className="w-4 h-4" />
        경기 전 리포트 생성
      </button>
      <CoachReportModal
        playerUids={playerUids}
        teamName={teamName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
