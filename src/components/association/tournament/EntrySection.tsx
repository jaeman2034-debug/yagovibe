/**
 * 참가 신청 섹션 컴포넌트
 * 
 * 상태 전이:
 * - none → applied → fee_pending → confirmed
 * - 참가비 0원: applied → confirmed
 * - 참가비 있음: applied → fee_pending → confirmed(입금확인)
 */

import type { Tournament, EntryStatus } from "@/types/tournament";
import { TournamentEntryButton } from "./TournamentEntryButton";
import { EntryStatusBox } from "./EntryStatusBox";

interface EntrySectionProps {
  tournament: Tournament;
  entryStatus: EntryStatus;
  membershipPaid: boolean;
  feeAmount?: number;
  feeConfirmed: boolean;
  onApply: () => void;
  loading?: boolean;
}

export function EntrySection({
  tournament,
  entryStatus,
  membershipPaid,
  feeAmount,
  feeConfirmed,
  onApply,
  loading = false,
}: EntrySectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">참가 신청</h3>
      
      {/* 참가 신청 상태 박스 (상단 고정) */}
      {entryStatus !== "none" && (
        <EntryStatusBox status={entryStatus} />
      )}
      
      {/* 참가 버튼 (none 상태일 때만 표시) */}
      {entryStatus === "none" && (
        <TournamentEntryButton
          tournament={tournament}
          entryStatus={entryStatus}
          membershipPaid={membershipPaid}
          onApply={onApply}
          loading={loading}
        />
      )}
    </div>
  );
}

