import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamFeePaymentMethod } from "@/types/federationOperating";
import { createTeamFeePayment } from "@/services/federationOperatingService";
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
  teamId: string;
  teamName: string;
  year: number;
  onRecorded: () => void;
};

export default function TeamFeePaymentDialog({
  open,
  onClose,
  federationSlug,
  teamId,
  teamName,
  year,
  onRecorded,
}: Props) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<TeamFeePaymentMethod>("bank_transfer");
  const [installmentNo, setInstallmentNo] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (saving) return;
    const n = Math.floor(Number(String(amount).replace(/,/g, "")));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("금액을 올바르게 입력해 주세요.");
      return;
    }
    const inst = installmentNo.trim() ? parseInt(installmentNo, 10) : undefined;
    if (installmentNo.trim() && (!Number.isFinite(inst) || inst! < 1 || inst! > 12)) {
      toast.error("월납 회차는 1~12 사이로 입력하거나 비워 주세요.");
      return;
    }
    setSaving(true);
    try {
      await createTeamFeePayment(federationSlug, {
        teamId,
        year,
        amount: n,
        paidAt: new Date(paidAt + "T12:00:00").toISOString(),
        method,
        installmentNo: inst,
        memo: memo.trim() || undefined,
      });
      toast.success("납부를 기록했습니다. 원장은 서버에서 반영됩니다.");
      onRecorded();
      onClose();
      setAmount("");
      setMemo("");
      setInstallmentNo("");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "납부 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">회비 납부 입력</h3>
        <p className="text-sm text-gray-500 mb-4">
          {teamName} · {year}년 — <span className="text-amber-700">원장(transactions)은 직접 만들지 않습니다.</span>
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600">금액 (원)</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 500000"
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
            <Label className="text-xs text-gray-600">월납 회차 (선택, 1~12)</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              value={installmentNo}
              onChange={(e) => setInstallmentNo(e.target.value)}
              placeholder="일시불이면 비움"
            />
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
