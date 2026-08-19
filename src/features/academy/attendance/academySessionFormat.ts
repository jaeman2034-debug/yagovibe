import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";

export function formatSessionWhen(value: unknown): string {
  if (!value) return "일정 미정";
  const d =
    typeof value === "object" && value !== null && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "일정 미정";
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<AcademySessionStatus, string> = {
  scheduled: "예정",
  open: "출석 진행",
  closed: "마감",
  cancelled: "취소",
};

export function sessionStatusLabel(status: AcademySessionStatus): string {
  return STATUS_LABEL[status] ?? status;
}
