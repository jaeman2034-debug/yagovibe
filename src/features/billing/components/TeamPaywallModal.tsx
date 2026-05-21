import { useState } from "react";
import { toast } from "sonner";
import { createStripeCheckoutForTeam, type StripeCheckoutTier } from "@/lib/billing/createStripeCheckoutForTeam";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";

export type PaywallFeatureKind = "bulk_reminder" | "monthly_report";

type TeamPaywallModalProps = {
  open: boolean;
  onClose: () => void;
  teamId: string;
  feature: PaywallFeatureKind;
  /** true 이면 Stripe 업그레이드 버튼 표시 (팀 대표일 때) */
  canStartCheckout: boolean;
};

const COPY: Record<
  PaywallFeatureKind,
  { title: string; bullets: string[]; tier: StripeCheckoutTier }
> = {
  bulk_reminder: {
    title: "Basic 이상에서 사용할 수 있어요",
    bullets: ["미납·연체 멤버에게 일괄 알림", "회비 KPI에서 바로 실행", "자동화로 총무 시간 절약"],
    tier: "basic",
  },
  monthly_report: {
    title: "Pro 플랜에서 사용할 수 있어요",
    bullets: ["월간 회비 리포트·보내기", "KPI·추세 활용", "회계 자동 반영 등 운영 기능과 함께"],
    tier: "pro",
  },
};

export default function TeamPaywallModal({
  open,
  onClose,
  teamId,
  feature,
  canStartCheckout,
}: TeamPaywallModalProps) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const cfg = COPY[feature];

  const handleUpgrade = async () => {
    if (!canStartCheckout) {
      toast.message("플랜 결제는 팀 대표만 진행할 수 있어요. 대표에게 업그레이드를 요청해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const url = await createStripeCheckoutForTeam({ teamId, tier: cfg.tier });
      window.location.assign(url);
    } catch (e) {
      console.error(e);
      toast.error(callableErrorMessage(e) || "결제 페이지를 열 수 없습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900">{cfg.title}</h3>
        <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-slate-700">
          {cfg.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUpgrade()}
            className="min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "이동 중…" : "지금 업그레이드"}
          </button>
        </div>
        {!canStartCheckout ? (
          <p className="mt-3 text-xs text-slate-500">결제는 팀 대표 계정으로만 진행됩니다.</p>
        ) : null}
      </div>
    </div>
  );
}
