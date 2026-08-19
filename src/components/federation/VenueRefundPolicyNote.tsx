/**
 * Sprint 2-2 — Refund policy copy only (no venueRefundRequests runtime).
 * Domain P4 / Attachment: weather = operator-reviewed; no auto-approve; no invented penalty %.
 */

type Props = {
  variant?: "member" | "admin";
  className?: string;
};

export function VenueRefundPolicyNote({ variant = "member", className = "" }: Props) {
  return (
    <section
      className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600 ${className}`}
      aria-label="환불·취소 정책 안내"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        환불·취소 안내
      </h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        <li>
          날씨·재해 또는 야외 구장 미사용 등 사유는{" "}
          <strong className="font-medium text-slate-800">협회 운영자 검토 후</strong> 전액 환불
          여부가 결정됩니다. 자동 승인되지 않습니다.
        </li>
        <li>
          일반 취소의 위약금·기한은 협회 운영 기준에 따르며, 앱에서 임의 요율을 적용하지
          않습니다.
        </li>
        {variant === "member" ? (
          <li>환불·취소 요청은 협회 담당자에게 문의해 주세요. (앱 내 자동 환불 없음)</li>
        ) : (
          <li>
            운영: 요청·증빙 확인 후 수동 처리. Stripe/PG·자동 환불 엔진은 사용하지 않습니다.
          </li>
        )}
      </ul>
    </section>
  );
}
