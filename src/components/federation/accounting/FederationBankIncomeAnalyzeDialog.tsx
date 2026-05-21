import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  confirmFederationIncomePayment,
  createFederationIncomeTransaction,
  requestAnalyzeBankTransaction,
} from "@/services/federationAccountingService";
import type { AnalyzeBankTransactionResult } from "@/services/federationAccountingService";
import type { FederationIncomePaymentMethod, FederationIncomeSourceType } from "@/types/federationOperating";
import { federationIncomeSourceLabel } from "@/types/federationOperating";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  federationSlug: string;
  onRecorded: () => void;
};

function coercePm(s?: string | null): FederationIncomePaymentMethod {
  if (s === "cash" || s === "bank_transfer" || s === "card" || s === "other") return s;
  return "bank_transfer";
}

function toIsoFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toISOString();
}

export default function FederationBankIncomeAnalyzeDialog({ open, onClose, federationSlug, onRecorded }: Props) {
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeBankTransactionResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setRawText("");
    setAnalyzing(false);
    setApplying(false);
    setSelectedMatchId(null);
    setAnalysis(null);
  }, [open]);

  if (!open) return null;

  const runAnalyze = async () => {
    const t = rawText.trim();
    if (!t) {
      toast.error("입금 문자 또는 내역을 붙여 넣어 주세요.");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setSelectedMatchId(null);
    try {
      const res = await requestAnalyzeBankTransaction(federationSlug, t);
      setAnalysis(res);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.suggestion === "ambiguous" && res.matchCandidates?.length) {
        setSelectedMatchId(res.matchCandidates[0].id);
      }
      if (res.suggestion === "match_existing" && res.matchedTransactionId) {
        setSelectedMatchId(res.matchedTransactionId);
      }
      toast.success("분석을 완료했습니다.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const depositYmd = analysis && analysis.ok && analysis.date ? analysis.date : new Date().toISOString().slice(0, 10);

  const applyMatch = async () => {
    if (!analysis || !analysis.ok) return;
    const pm = coercePm(analysis.suggestedPaymentMethod);
    const bankGuess = analysis.bankAccountIdGuess?.trim() || undefined;

    if (analysis.suggestion === "match_existing" && analysis.matchedTransactionId) {
      setApplying(true);
      try {
        const res = await confirmFederationIncomePayment(
          federationSlug,
          analysis.matchedTransactionId,
          toIsoFromYmd(depositYmd),
          { paymentMethod: pm, bankAccountId: bankGuess }
        );
        if (!res.ok) {
          if (res.code === "POTENTIAL_DUPLICATE") {
            toast.message("유사한 입금 완료가 있습니다.", { description: "중복 무시 옵션은 수동 입금 확인에서 처리하세요." });
            return;
          }
          toast.error(res.error);
          return;
        }
        toast.success("기존 미수 건에 입금을 반영했습니다.");
        onRecorded();
        onClose();
      } finally {
        setApplying(false);
      }
      return;
    }

    if (analysis.suggestion === "ambiguous" && selectedMatchId) {
      setApplying(true);
      try {
        const res = await confirmFederationIncomePayment(
          federationSlug,
          selectedMatchId,
          toIsoFromYmd(depositYmd),
          { paymentMethod: pm, bankAccountId: bankGuess }
        );
        if (!res.ok) {
          if (res.code === "POTENTIAL_DUPLICATE") {
            toast.error("중복 가능성이 있어 처리하지 않았습니다.");
            return;
          }
          toast.error(res.error);
          return;
        }
        toast.success("선택한 미수 건에 입금을 반영했습니다.");
        onRecorded();
        onClose();
      } finally {
        setApplying(false);
      }
    }
  };

  const applyCreateNew = async () => {
    if (!analysis || !analysis.ok || !analysis.amount || !analysis.payerName) {
      toast.error("금액·입금자명이 있어야 신규 등록할 수 있습니다.");
      return;
    }
    const st = (analysis.suggestedSourceType as FederationIncomeSourceType) || "other";
    setApplying(true);
    try {
      const res = await createFederationIncomeTransaction(federationSlug, {
        amount: analysis.amount,
        sourceType: st,
        payerName: analysis.payerName,
        payerType: "individual",
        status: "paid",
        paymentMethod: coercePm(analysis.suggestedPaymentMethod),
        bankAccountId: analysis.bankAccountIdGuess?.trim() || undefined,
        occurredAt: toIsoFromYmd(depositYmd),
        description: analysis.aiNotes || undefined,
        skipDuplicateCheck: false,
      });
      if (!res.ok) {
        if (res.code === "POTENTIAL_DUPLICATE") {
          toast.message("유사 수입이 있습니다.", { description: "수입 등록 화면에서 확인 건너뛰기를 사용하세요." });
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success("신규 입금(입금 완료)을 등록했습니다.");
      onRecorded();
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1205] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">입금 내역(텍스트) 분석</h3>
        <p className="text-sm text-gray-500 mb-3">
          은행 입금 알림 문자·메모를 붙여 넣으면 AI가 금액·이름·날짜를 추출하고, 미수 수입과 매칭을 제안합니다. 이미지·CSV는
          추후 지원 예정입니다.
        </p>

        <Label className="text-xs text-gray-600">입금 내역</Label>
        <textarea
          className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="예: [국민은행] 홍길동 300,000원 입금 ..."
          maxLength={8000}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void runAnalyze()} disabled={analyzing}>
            {analyzing ? "분석 중…" : "분석 실행"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>

        {analysis && analysis.ok ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm space-y-2">
            <p className="font-medium text-gray-900">분석 결과</p>
            <p className="text-gray-700 tabular-nums">
              금액: {analysis.amount != null ? `${analysis.amount.toLocaleString("ko-KR")}원` : "—"}
            </p>
            <p className="text-gray-700">입금자: {analysis.payerName || "—"}</p>
            <p className="text-gray-700">날짜: {analysis.date || "(오늘 기준 처리)"}</p>
            <p className="text-gray-700">
              추정 유형:{" "}
              {analysis.suggestedSourceType
                ? federationIncomeSourceLabel(analysis.suggestedSourceType as FederationIncomeSourceType)
                : "—"}
            </p>
            <p className="text-gray-700">
              입금 경로:{" "}
              {analysis.suggestedPaymentMethod === "bank_transfer"
                ? "협회 통장"
                : analysis.suggestedPaymentMethod === "cash"
                  ? "현금"
                  : analysis.suggestedPaymentMethod === "card"
                    ? "카드"
                    : analysis.suggestedPaymentMethod || "—"}
            </p>
            <p className="text-[11px] text-gray-500">
              AI 신뢰도: {Math.round((analysis.confidence || 0) * 100)}%
              {analysis.aiNotes ? ` · ${analysis.aiNotes}` : ""}
            </p>

            <p className="text-xs font-semibold text-gray-800 pt-2">
              제안:{" "}
              {analysis.suggestion === "match_existing"
                ? "기존 미수 수입과 매칭"
                : analysis.suggestion === "create_new"
                  ? "신규 입금으로 등록"
                  : analysis.suggestion === "ambiguous"
                    ? "후보 여러 건 — 선택 필요"
                    : "수동 확인 필요"}
            </p>

            {analysis.suggestion === "ambiguous" && analysis.matchCandidates && analysis.matchCandidates.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs">매칭할 미수 건</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedMatchId || ""}
                  onChange={(e) => setSelectedMatchId(e.target.value || null)}
                >
                  {analysis.matchCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.refDate} · {c.amount.toLocaleString("ko-KR")}원 · {c.payerName || "이름없음"} (유사도{" "}
                      {Math.round(c.score * 100)}%)
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" disabled={!selectedMatchId || applying} onClick={() => void applyMatch()}>
                  선택 건에 입금 반영
                </Button>
              </div>
            ) : null}

            {analysis.suggestion === "match_existing" && analysis.matchedTransactionId ? (
              <Button type="button" size="sm" disabled={applying} onClick={() => void applyMatch()}>
                미수 건에 입금 반영
              </Button>
            ) : null}

            {analysis.suggestion === "create_new" ? (
              <Button type="button" variant="secondary" size="sm" disabled={applying} onClick={() => void applyCreateNew()}>
                신규 입금 완료로 등록
              </Button>
            ) : null}

            {analysis.suggestion === "needs_review" ? (
              <p className="text-xs text-amber-900">
                자동 처리할 수 없습니다. 금액·이름·날짜를 확인한 뒤 「수입 등록」에서 직접 입력하세요.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
