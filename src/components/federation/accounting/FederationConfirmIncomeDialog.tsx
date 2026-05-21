import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmFederationIncomePayment,
  type PotentialDuplicateIncome,
} from "@/services/federationAccountingService";
import type { FederationIncomePaymentMethod, FederationLedgerTransaction } from "@/types/federationOperating";
import { federationIncomeSourceLabel } from "@/types/federationOperating";

const PAYMENT_OPTIONS: { value: FederationIncomePaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "협회 통장" },
  { value: "cash", label: "현금" },
  { value: "card", label: "카드" },
  { value: "other", label: "기타" },
];
import { toast } from "sonner";

type Props = {
  open: boolean;
  tx: FederationLedgerTransaction | null;
  federationSlug: string;
  defaultPaidDate: string;
  onClose: () => void;
  onConfirmed: () => void;
};

export default function FederationConfirmIncomeDialog({
  open,
  tx,
  federationSlug,
  defaultPaidDate,
  onClose,
  onConfirmed,
}: Props) {
  const [paidAt, setPaidAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<FederationIncomePaymentMethod>("bank_transfer");
  const [bankAccountId, setBankAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<PotentialDuplicateIncome[] | null>(null);

  useEffect(() => {
    if (!open || !tx) return;
    setPaidAt(defaultPaidDate);
    setDuplicateMatches(null);
    const pm = tx.paymentMethod;
    setPaymentMethod(
      pm === "cash" || pm === "bank_transfer" || pm === "card" || pm === "other" ? pm : "bank_transfer"
    );
    setBankAccountId(tx.bankAccountId?.trim() || "");
  }, [open, defaultPaidDate, tx?.id, tx?.paymentMethod, tx?.bankAccountId]);

  if (!open || !tx) return null;

  const toIso = (dateYmd: string) => new Date(`${dateYmd}T12:00:00`).toISOString();

  const runConfirm = async (opts?: { skipDuplicateCheck?: boolean }) => {
    if (!paidAt.trim()) {
      toast.error("입금일을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await confirmFederationIncomePayment(federationSlug, tx.id, toIso(paidAt), {
        skipDuplicateCheck: opts?.skipDuplicateCheck === true,
        paymentMethod,
        bankAccountId: bankAccountId.trim() || undefined,
      });
      if (!res.ok) {
        if (res.code === "POTENTIAL_DUPLICATE") {
          setDuplicateMatches(res.matches);
          toast.message("이미 유사한 입금 완료 건이 있습니다.", {
            description: "목록을 확인하거나 「그래도 입금 확인」을 선택하세요.",
          });
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success("입금 확인 처리했습니다.");
      onConfirmed();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1210] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">입금 확인</h3>
        <p className="text-sm text-gray-600 mb-3">
          {federationIncomeSourceLabel(tx.incomeSourceType)} ·{" "}
          <span className="tabular-nums font-medium">{tx.amount.toLocaleString("ko-KR")}원</span>
          {tx.payerName ? ` · ${tx.payerName}` : ""}
        </p>

        <div className="mb-4 space-y-3">
          <div>
            <Label className="text-xs text-gray-600">실제 입금일</Label>
            <Input className="mt-1" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-gray-600">입금 경로</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as FederationIncomePaymentMethod)}
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {paymentMethod === "bank_transfer" ? (
            <div>
              <Label className="text-xs text-gray-600">통장 식별 (선택)</Label>
              <Input className="mt-1" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} />
            </div>
          ) : null}
        </div>

        {duplicateMatches && duplicateMatches.length > 0 ? (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-950 text-xs">유사한 입금 완료 건</p>
            <ul className="mt-2 list-disc pl-4 text-amber-900 text-[11px] space-y-1">
              {duplicateMatches.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {d.occurredAt?.slice(0, 10) ?? "—"} · {d.amount.toLocaleString("ko-KR")}원
                  {d.payerName ? ` · ${d.payerName}` : ""}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              disabled={saving}
              onClick={() => void runConfirm({ skipDuplicateCheck: true })}
            >
              중복 무시하고 입금 확인
            </Button>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="button" onClick={() => void runConfirm()} disabled={saving}>
            {saving ? "처리 중…" : "입금 확인"}
          </Button>
        </div>
      </div>
    </div>
  );
}
