import {
  formatKrw,
  formatQuoteStatusLabel,
  type VenuePricingQuote,
} from "@/lib/federation/venuePricingEngine";

type Props = {
  quote: VenuePricingQuote;
  /** denser admin layout */
  compact?: boolean;
};

/**
 * Pre-request / admin estimate display.
 * Never fabricates a total from lighting-only when base is unknown.
 */
export function VenuePricingEstimateSummary({ quote, compact }: Props) {
  const showLighting =
    quote.lightingFee.status === "CALCULATED" &&
    typeof quote.lightingFee.amount === "number" &&
    (quote.lightingFee.amount > 0 || quote.status === "PARTIAL");

  const title =
    quote.status === "CALCULATED" ? "예상 대관료" : formatQuoteStatusLabel(quote.status);

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-1"
          : "rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2"
      }
    >
      <div className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-sm"}`}>
        {title}
      </div>

      {quote.status === "CALCULATED" && (
        <dl className="text-sm text-gray-700 space-y-1">
          <div className="flex justify-between gap-2">
            <dt>기본 대관료</dt>
            <dd>{formatKrw(quote.baseFee.amount ?? 0)}</dd>
          </div>
          {showLighting && (
            <div className="flex justify-between gap-2">
              <dt>조명 사용료</dt>
              <dd>{formatKrw(quote.lightingFee.amount ?? 0)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2 font-semibold text-gray-900 pt-1 border-t border-gray-200">
            <dt>총 예상 금액</dt>
            <dd>{formatKrw(quote.totalFee.amount ?? 0)}</dd>
          </div>
        </dl>
      )}

      {(quote.status === "PRICE_CONFIRMATION_REQUIRED" || quote.status === "PARTIAL") && (
        <dl className="text-sm text-gray-700 space-y-1">
          <div className="flex justify-between gap-2">
            <dt>기본 대관료</dt>
            <dd className="text-amber-800">확인 필요</dd>
          </div>
          {quote.lightingFee.status === "CALCULATED" &&
            typeof quote.lightingFee.amount === "number" && (
              <div className="flex justify-between gap-2">
                <dt>예상 조명료</dt>
                <dd>{formatKrw(quote.lightingFee.amount)}</dd>
              </div>
            )}
          <div className="flex justify-between gap-2 font-semibold text-amber-900 pt-1 border-t border-gray-200">
            <dt>총 예상 금액</dt>
            <dd>확인 필요</dd>
          </div>
        </dl>
      )}

      <p className="text-[11px] text-gray-500">
        예상 금액(ESTIMATE) · 결제/정산 확정이 아닙니다
      </p>
    </div>
  );
}
