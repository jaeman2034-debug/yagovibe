import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamFeePaymentMethod } from "@/types/federationOperating";
import { createCompetitionFeePayment } from "@/services/federationOperatingService";
import { toast } from "sonner";

const METHOD_OPTIONS: { value: TeamFeePaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "계좌이체" },
  { value: "cash", label: "현금" },
  { value: "card", label: "카드" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  federationSlug: string;
  entryId: string;
  competitionId: string;
  teamId: string;
  teamName: string;
  competitionName: string;
  totalFeeAmount: number;
  paidAmount: number;
  onRecorded: () => void;
};

export default function CompetitionFeePaymentDialog({
  open,
  onClose,
  federationSlug,
  entryId,
  competitionId,
  teamId,
  teamName,
  competitionName,
  totalFeeAmount,
  paidAmount,
  onRecorded,
}: Props) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<TeamFeePaymentMethod>("bank_transfer");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const remaining = Math.max(0, Math.floor(totalFeeAmount) - Math.floor(paidAmount));

  const submit = async () => {
    if (saving) return;
    const n = Math.floor(Number(String(amount).replace(/,/g, "")));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("금액을 올바르게 입력해 주세요.");
      return;
    }
    if (n > remaining) {
      toast.error(
        remaining > 0
          ? `잔액은 ${formatWon(remaining)} 이하로 입력해 주세요.`
          : "이미 납부가 완료된 항목입니다."
      );
      return;
    }
    setSaving(true);
    try {
      await createCompetitionFeePayment(federationSlug, {
        entryId,
        competitionId,
        teamId,
        amount: n,
        paidAt: new Date(paidAt + "T12:00:00").toISOString(),
        method,
        memo: memo.trim() || undefined,
      });
      toast.success("참가비 납부를 기록했습니다. 원장은 서버에서 반영됩니다.");
      onRecorded();
      onClose();
      setAmount("");
      setMemo("");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">대회 참가비 납부</h3>
        <p className="text-sm text-gray-500 mb-1">
          {competitionName} · {teamName}
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mb-3">
          원장(transactions)은 클라이언트에서 만들지 않습니다. 납부 문서만 저장하면 Cloud Function이 반영합니다.
        </p>
        <p className="text-sm text-gray-700 mb-3">
          청구 합계 <span className="font-semibold tabular-nums">{formatWon(totalFeeAmount)}</span>
          {" · "}
          납부 누적 <span className="font-semibold tabular-nums">{formatWon(paidAmount)}</span>
          {remaining > 0 ? (
            <>
              {" · "}
              잔액 <span className="text-primary-700 font-semibold tabular-nums">{formatWon(remaining)}</span>
            </>
          ) : null}
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600">금액 (원)</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={remaining > 0 ? String(remaining) : "예: 200000"}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">납부일</Label>
            <Input className="mt-1" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-gray-600">납부 방식</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as TeamFeePaymentMethod)}
            >
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">메모</Label>
            <Input className="mt-1" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="선택" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? "저장 중…" : "납부 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}
