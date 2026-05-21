/**
 * Tournament 참가 신청 버튼 컴포넌트 (v1.2: 비활성 사유 명확화)
 * 
 * 버튼 노출 조건:
 * - 회원 로그인 ✔
 * - 회비 납부 ✔
 * - 대회 registrationOpen === true
 */

import type { Tournament, EntryStatus } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";

interface TournamentEntryButtonProps {
  tournament: Tournament;
  entryStatus: EntryStatus;
  membershipPaid: boolean;
  onApply: () => void;
  loading?: boolean;
}

export function TournamentEntryButton({
  tournament,
  entryStatus,
  membershipPaid,
  onApply,
  loading = false,
}: TournamentEntryButtonProps) {
  const { user } = useAuth();

  // 🔥 비활성 사유 계산
  const getDisabledReason = (): string | null => {
    if (!user) {
      return "로그인 후 참가 가능합니다.";
    }
    if (!membershipPaid) {
      return "회비 미납으로 참가 불가합니다.";
    }
    if (tournament.status === "ended") {
      return "종료된 대회입니다. 신청할 수 없습니다.";
    }
    if (tournament.status === "ongoing") {
      return "진행 중인 대회입니다. 신청할 수 없습니다.";
    }
    if (!tournament.registrationOpen) {
      return "참가 신청 기간이 종료되었습니다.";
    }
    if (tournament.drawExecuted) {
      return "조 추첨이 완료되어 신청이 마감되었습니다.";
    }
    return null;
  };

  const disabledReason = getDisabledReason();
  const isDisabled = !!disabledReason;

  // 비활성 상태: disabled 버튼 + 사유
  if (isDisabled) {
    return (
      <div className="space-y-1">
        <button
          disabled
          className="w-full rounded bg-gray-300 text-gray-600 py-2 cursor-not-allowed opacity-60"
          onClick={() => {
            // 🔥 클릭 시 안내
            alert(disabledReason + "\n\n다음 대회 공지를 확인해주세요.");
          }}
        >
          대회 참가 신청
        </button>
        <p className="text-xs text-gray-500">
          {disabledReason}
        </p>
      </div>
    );
  }

  // 이미 참가 신청함
  if (entryStatus !== "none" && entryStatus !== "rejected") {
    return (
      <div className="flex items-center gap-2">
        {entryStatus === "applied" && (
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm">
            참가 신청 완료
          </span>
        )}
        {entryStatus === "fee_pending" && (
          <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm">
            참가비 확인 중
          </span>
        )}
        {entryStatus === "confirmed" && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm">
            참가 확정
          </span>
        )}
      </div>
    );
  }

  // 참가 신청 가능
  return (
    <button
      onClick={onApply}
      disabled={loading}
      className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
    >
      {loading ? "신청 중..." : "대회 참가 신청"}
    </button>
  );
}
