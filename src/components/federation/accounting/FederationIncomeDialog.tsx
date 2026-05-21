import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFederationIncomeTransaction,
  findPotentialDuplicateIncomes,
  type PotentialDuplicateIncome,
} from "@/services/federationAccountingService";
import type {
  FederationIncomePaymentMethod,
  FederationIncomePayerType,
  FederationIncomeSourceType,
  FederationIncomeStatus,
  FederationOperatingCompetition,
} from "@/types/federationOperating";
import { FEDERATION_INCOME_SOURCE_LABELS } from "@/types/federationOperating";
import { toast } from "sonner";

const SOURCE_OPTIONS = (Object.entries(FEDERATION_INCOME_SOURCE_LABELS) as [
  FederationIncomeSourceType,
  string,
][]).map(([value, label]) => ({ value, label }));

const PAYER_OPTIONS: { value: FederationIncomePayerType; label: string }[] = [
  { value: "team", label: "팀" },
  { value: "individual", label: "개인" },
  { value: "sponsor", label: "후원사" },
  { value: "organization", label: "기관" },
];

const STATUS_OPTIONS: { value: FederationIncomeStatus; label: string }[] = [
  { value: "expected", label: "예정" },
  { value: "pending", label: "입금 대기" },
  { value: "paid", label: "입금 완료" },
];

const PAYMENT_OPTIONS: { value: FederationIncomePaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "협회 통장" },
  { value: "cash", label: "현금" },
  { value: "card", label: "카드" },
  { value: "other", label: "기타" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  federationSlug: string;
  defaultYear: number;
  defaultMonth: number | null;
  competitions: FederationOperatingCompetition[];
  presetCompetitionId?: string | null;
  onRecorded: () => void;
};

export default function FederationIncomeDialog({
  open,
  onClose,
  federationSlug,
  defaultYear,
  defaultMonth,
  competitions,
  presetCompetitionId,
  onRecorded,
}: Props) {
  const [amount, setAmount] = useState("");
  const [sourceType, setSourceType] = useState<FederationIncomeSourceType>("other");
  const [payerName, setPayerName] = useState("");
  const [payerType, setPayerType] = useState<FederationIncomePayerType>("individual");
  const [status, setStatus] = useState<FederationIncomeStatus>("pending");
  const [competitionId, setCompetitionId] = useState("");
  const [description, setDescription] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<PotentialDuplicateIncome[] | null>(null);
  const [duplicateCheckFailed, setDuplicateCheckFailed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<FederationIncomePaymentMethod>("bank_transfer");
  const [bankAccountId, setBankAccountId] = useState("");
  const [fundSource, setFundSource] = useState("");
  const [fundPurpose, setFundPurpose] = useState("");
  const [subsidyReportRequired, setSubsidyReportRequired] = useState(true);

  useEffect(() => {
    if (!open) return;
    const m = defaultMonth != null ? String(defaultMonth).padStart(2, "0") : "01";
    setPaidAt(`${defaultYear}-${m}-15`);
    setExpectedAt(`${defaultYear}-${m}-15`);
    setCompetitionId(presetCompetitionId?.trim() || "");
    setAmount("");
    setPayerName("");
    setPayerType("individual");
    setStatus("pending");
    setSourceType("other");
    setDescription("");
    setDuplicateMatches(null);
    setDuplicateCheckFailed(false);
    setPaymentMethod("bank_transfer");
    setBankAccountId("");
    setFundSource("");
    setFundPurpose("");
    setSubsidyReportRequired(true);
  }, [open, defaultYear, defaultMonth, presetCompetitionId]);

  useEffect(() => {
    if (sourceType === "competition_fee") {
      setPayerType("team");
    }
  }, [sourceType]);

  if (!open) return null;

  const toIso = (dateYmd: string) => new Date(`${dateYmd}T12:00:00`).toISOString();

  const submit = async (opts?: { skipDuplicateCheck?: boolean }) => {
    const n = Math.floor(Number(String(amount).replace(/,/g, "")));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("금액을 올바르게 입력해 주세요.");
      return;
    }

    if (sourceType === "competition_fee") {
      if (!competitionId.trim()) {
        toast.error("대회 참가비는 대회를 선택해 주세요.");
        return;
      }
      if (payerType !== "team") {
        toast.error("대회 참가비는 납부자 유형이 팀이어야 합니다.");
        return;
      }
    }

    const paidIso = status === "paid" ? toIso(paidAt) : undefined;
    const expectedIso = status !== "paid" ? toIso(expectedAt) : undefined;

    if (status === "paid" && !paidAt.trim()) {
      toast.error("입금 완료일을 입력해 주세요.");
      return;
    }
    if (status !== "paid" && !expectedAt.trim()) {
      toast.error("예정·입금 대기 건은 예정일을 입력해 주세요.");
      return;
    }

    const refIso = paidIso || expectedIso;
    if (!refIso) {
      toast.error("날짜를 확인해 주세요.");
      return;
    }

    if (!opts?.skipDuplicateCheck) {
      setDuplicateCheckFailed(false);
      try {
        const dups = await findPotentialDuplicateIncomes(federationSlug, {
          refIso,
          amount: n,
          payerName: payerName.trim() || undefined,
        });
        if (dups.length > 0) {
          setDuplicateMatches(dups);
          return;
        }
      } catch (e) {
        console.error(e);
        setDuplicateMatches(null);
        setDuplicateCheckFailed(true);
        toast.message("비슷한 수입 확인에 실패했습니다.", {
          description: "네트워크 문제일 수 있습니다. 아래에서 확인을 건너뛰고 저장할 수 있습니다.",
        });
        return;
      }
    }

    setDuplicateMatches(null);
    setDuplicateCheckFailed(false);
    setSaving(true);
    try {
      const saveRes = await createFederationIncomeTransaction(federationSlug, {
        amount: n,
        sourceType,
        payerName: payerName.trim() || undefined,
        payerType,
        status,
        paymentMethod,
        bankAccountId: bankAccountId.trim() || undefined,
        occurredAt: paidIso,
        expectedAt: status !== "paid" ? expectedIso : undefined,
        competitionId: competitionId.trim() || undefined,
        description: description.trim() || undefined,
        ...(sourceType === "subsidy"
          ? {
              fundSource: fundSource.trim() || undefined,
              fundPurpose: fundPurpose.trim() || undefined,
              reportRequired: subsidyReportRequired,
            }
          : {}),
        skipDuplicateCheck: opts?.skipDuplicateCheck === true,
      });
      if (!saveRes.ok) {
        if (saveRes.code === "POTENTIAL_DUPLICATE") {
          setDuplicateMatches(saveRes.matches);
          toast.message("유사한 수입이 원장에 있습니다.", {
            description: "아래 목록을 확인하거나 「확인 건너뛰고 저장」을 선택하세요.",
          });
          return;
        }
        toast.error(saveRes.error);
        return;
      }
      toast.success("수입을 원장에 등록했습니다.");
      onRecorded();
      onClose();
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
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">수입 등록</h3>
        <p className="text-sm text-gray-500 mb-3">
          수동 수입은 서버(Callable)로만 저장됩니다. <span className="font-medium text-gray-800">입금 완료</span>만
          손익 집계에 포함되고, 예정·대기는 미수금으로 집계됩니다.
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
            <Label className="text-xs text-gray-600">수입 유형</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as FederationIncomeSourceType)}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">납부자 이름 (선택)</Label>
            <Input
              className="mt-1"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="예: ○○ FC"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">납부자 유형</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={payerType}
              disabled={sourceType === "competition_fee"}
              onChange={(e) => setPayerType(e.target.value as FederationIncomePayerType)}
            >
              {PAYER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {sourceType === "competition_fee" ? (
              <p className="text-[11px] text-gray-500 mt-1">대회 참가비는 납부자 유형이 팀으로 고정됩니다.</p>
            ) : null}
          </div>
          <div>
            <Label className="text-xs text-gray-600">상태</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as FederationIncomeStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
              <Input
                className="mt-1"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                placeholder="예: main · 국민 123"
              />
              <p className="text-[11px] text-gray-500 mt-1">여러 통장을 쓸 때 잔액 대조용 내부 라벨입니다.</p>
            </div>
          ) : null}
          {sourceType === "subsidy" ? (
            <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-950">관 지원금(한정성 기금)</p>
              <p className="text-[11px] text-amber-900/90">이 유형은 일반 수입과 분리되어 잔액이 집계됩니다.</p>
              <div>
                <Label className="text-xs text-gray-600">재원 출처 (선택)</Label>
                <Input className="mt-1" value={fundSource} onChange={(e) => setFundSource(e.target.value)} placeholder="예: ○○구청" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">용도 (선택)</Label>
                <Input className="mt-1" value={fundPurpose} onChange={(e) => setFundPurpose(e.target.value)} placeholder="예: 청소년 리그 지원" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={subsidyReportRequired}
                  onChange={(e) => setSubsidyReportRequired(e.target.checked)}
                />
                정산·보고 의무 있음
              </label>
            </div>
          ) : null}
          {status === "paid" ? (
            <div>
              <Label className="text-xs text-gray-600">입금일</Label>
              <Input className="mt-1" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label className="text-xs text-gray-600">예정일</Label>
              <Input className="mt-1" type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs text-gray-600">대회 연결 {sourceType === "competition_fee" ? "(필수)" : "(선택)"}</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
            >
              <option value="">{sourceType === "competition_fee" ? "대회를 선택하세요" : "없음"}</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.year}] {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">설명 (선택)</Label>
            <Input
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="메모"
            />
          </div>
        </div>

        {duplicateCheckFailed ? (
          <div className="mt-4 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">중복 확인에 실패했습니다.</p>
            <p className="text-xs text-slate-600 mt-1">
              네트워크 또는 일시 오류일 수 있습니다. 그래도 저장하려면 「확인 건너뛰고 저장」을 누르세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDuplicateCheckFailed(false)}>
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setDuplicateCheckFailed(false);
                  void submit({ skipDuplicateCheck: true });
                }}
              >
                확인 건너뛰고 저장
              </Button>
            </div>
          </div>
        ) : null}

        {duplicateMatches && duplicateMatches.length > 0 ? (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-950">유사한 수입이 이미 있을 수 있습니다.</p>
            <ul className="mt-2 list-disc pl-4 text-amber-900 text-xs space-y-1">
              {duplicateMatches.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {d.occurredAt?.slice(0, 10) ?? "—"} · {d.amount.toLocaleString("ko-KR")}원
                  {d.payerName ? ` · ${d.payerName}` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDuplicateMatches(null)}>
                취소
              </Button>
              <Button type="button" size="sm" onClick={() => void submit({ skipDuplicateCheck: true })}>
                그래도 저장
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? "저장 중…" : "수입 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
