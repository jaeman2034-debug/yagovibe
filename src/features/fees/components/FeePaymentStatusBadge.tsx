import { AlertTriangle, Check, Clock } from "lucide-react";
import type { TimelineFeeStatusV1 } from "../utils/timelineFeeStatusV1";

type Props = {
  status: TimelineFeeStatusV1;
  /** 선택된 타임라인 셀(어두운 배경) 위 */
  tone?: "surface" | "inverse";
  className?: string;
};

const styles: Record<TimelineFeeStatusV1, { ring: string; text: string; bg: string }> = {
  paid: {
    ring: "ring-emerald-200",
    text: "text-emerald-800",
    bg: "bg-emerald-50",
  },
  unpaid: {
    ring: "ring-amber-200",
    text: "text-amber-900",
    bg: "bg-amber-50",
  },
  overdue: {
    ring: "ring-red-200",
    text: "text-red-800",
    bg: "bg-red-50",
  },
};

const inverseStyles: Record<TimelineFeeStatusV1, { ring: string; text: string; bg: string }> = {
  paid: { ring: "ring-emerald-300/50", text: "text-emerald-100", bg: "bg-emerald-500/25" },
  unpaid: { ring: "ring-amber-200/50", text: "text-amber-100", bg: "bg-amber-500/20" },
  overdue: { ring: "ring-red-300/50", text: "text-red-100", bg: "bg-red-500/25" },
};

/** 타임라인 V1 — 색 + 아이콘(색약 보조) */
export default function FeePaymentStatusBadge({ status, tone = "surface", className = "" }: Props) {
  const t = tone === "inverse" ? inverseStyles[status] : styles[status];
  const icon =
    status === "paid" ? (
      <Check className="size-3.5 shrink-0" aria-hidden />
    ) : status === "overdue" ? (
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
    ) : (
      <Clock className="size-3.5 shrink-0" aria-hidden />
    );
  const label = status === "paid" ? "완납" : status === "overdue" ? "연체" : "미납";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${t.bg} ${t.text} ${t.ring} ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
