/**
 * 참가 신청 상태 박스 컴포넌트
 * 
 * 원칙:
 * - 참가 신청 후 상태를 명확히 표시
 * - 사람 설명 제거, 시스템 문구만
 * - 상단 고정으로 가장 먼저 보이게
 */

import type { EntryStatus } from "@/types/tournament";

interface EntryStatusBoxProps {
  status: EntryStatus;
}

const STATUS_TEXT: Record<EntryStatus, string> = {
  applied: "참가 신청이 완료되었습니다.",
  fee_pending: "참가비 확인 중입니다.",
  confirmed: "참가가 확정되었습니다.",
  rejected: "참가가 반려되었습니다.",
  none: "", // none일 때는 표시 안 함
};

const STATUS_COLOR: Record<EntryStatus, string> = {
  applied: "bg-blue-50 border-blue-200 text-blue-700",
  fee_pending: "bg-yellow-50 border-yellow-200 text-yellow-700",
  confirmed: "bg-green-50 border-green-200 text-green-700",
  rejected: "bg-red-50 border-red-200 text-red-700",
  none: "",
};

export function EntryStatusBox({ status }: EntryStatusBoxProps) {
  // none 상태는 표시 안 함
  if (status === "none") {
    return null;
  }

  const text = STATUS_TEXT[status];
  const colorClass = STATUS_COLOR[status];

  return (
    <div className={`rounded border p-4 ${colorClass}`}>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

