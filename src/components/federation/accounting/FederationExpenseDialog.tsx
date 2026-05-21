import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFederationExpenseTransaction,
  findPotentialDuplicateExpenses,
  uploadFederationExpenseReceiptImageAsset,
  uploadFederationExpenseReceiptImage,
  type PotentialDuplicateExpense,
} from "@/services/federationAccountingService";
import { analyzeFederationExpenseReceiptImage } from "@/services/federationReceiptAiService";
import type {
  FederationExpenseCategory,
  FederationExpenseOperatingDomain,
  FederationExpensePaymentMethod,
  FederationOperatingCompetition,
} from "@/types/federationOperating";
import {
  FEDERATION_EXPENSE_CATEGORY_LABELS,
  FEDERATION_RESTRICTED_EXPENSE_PURPOSE_PRESETS,
} from "@/types/federationOperating";
import { toast } from "sonner";

const CATEGORY_OPTIONS = (Object.entries(FEDERATION_EXPENSE_CATEGORY_LABELS) as [FederationExpenseCategory, string][]).map(
  ([value, label]) => ({ value, label })
);

const OPERATING_DOMAIN_OPTIONS: { value: FederationExpenseOperatingDomain; label: string }[] = [
  { value: "program", label: "협회·프로그램 운영" },
  { value: "event", label: "행사·대회 외 이벤트" },
  { value: "league", label: "리그·리그 운영" },
];

const PAYMENT_OPTIONS: { value: FederationExpensePaymentMethod; label: string }[] = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "bank_transfer", label: "계좌이체" },
  { value: "other", label: "기타" },
];

const FUND_PURPOSE_CUSTOM = "__custom__";

type ReceiptSuggestion = {
  amount: number | null;
  date: string | null;
  categoryKey: FederationExpenseCategory;
  paymentMethod: FederationExpensePaymentMethod;
  merchant: string | null;
  memo: string | null;
};

type ReceiptAnalysisMeta = {
  rawText: string;
  confidence: number;
  categoryLabel: string;
  suggestion: ReceiptSuggestion;
};

type Props = {
  open: boolean;
  onClose: () => void;
  federationSlug: string;
  /** 필터 연도에 맞춰 날짜 기본값 */
  defaultYear: number;
  defaultMonth: number | null;
  competitions: FederationOperatingCompetition[];
  /** 대회 상세 손익에서 열 때 미리 선택 */
  presetCompetitionId?: string | null;
  /** 입금 완료 관 지원금 수입 — 지출 연결 드롭다운 */
  subsidyPaidIncomeOptions: { id: string; label: string }[];
  onRecorded: () => void;
};

export default function FederationExpenseDialog({
  open,
  onClose,
  federationSlug,
  defaultYear,
  defaultMonth,
  competitions,
  presetCompetitionId,
  subsidyPaidIncomeOptions,
  onRecorded,
}: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<FederationExpenseCategory>("other");
  const [operatingDomain, setOperatingDomain] = useState<FederationExpenseOperatingDomain>("program");
  const [competitionId, setCompetitionId] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<FederationExpensePaymentMethod>("card");
  const [paidAt, setPaidAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [receiptAnalyzing, setReceiptAnalyzing] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [pendingReceiptImageUrl, setPendingReceiptImageUrl] = useState<string | null>(null);
  const [receiptMeta, setReceiptMeta] = useState<ReceiptAnalysisMeta | null>(null);
  /** 신뢰도 &lt; 0.6 일 때 사용자가 「제안 적용」을 눌렀는지, 또는 0.6 이상으로 자동 채움됐는지 */
  const [hasAppliedSuggestion, setHasAppliedSuggestion] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<PotentialDuplicateExpense[] | null>(null);
  const [duplicateCheckFailed, setDuplicateCheckFailed] = useState(false);
  const [restrictedFund, setRestrictedFund] = useState(false);
  const [fundPurposeChoice, setFundPurposeChoice] = useState("");
  const [fundPurposeCustom, setFundPurposeCustom] = useState("");
  const [relatedFundIncomeId, setRelatedFundIncomeId] = useState("");
  const [relatedFundSource, setRelatedFundSource] = useState("");
  /** OCR 자동 채움 시 사용자가 이미 수정한 입력은 덮어쓰지 않기 위한 touched 플래그 */
  const [amountTouched, setAmountTouched] = useState(false);
  const [paidAtTouched, setPaidAtTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [paymentMethodTouched, setPaymentMethodTouched] = useState(false);
  const [merchantTouched, setMerchantTouched] = useState(false);
  const [memoTouched, setMemoTouched] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const m = defaultMonth != null ? String(defaultMonth).padStart(2, "0") : "01";
    setPaidAt(`${defaultYear}-${m}-15`);
    setCompetitionId(presetCompetitionId?.trim() || "");
    setAmount("");
    setMemo("");
    setMerchantName("");
    setCategory("other");
    setOperatingDomain("program");
    setPaymentMethod("card");
    setPendingReceiptFile(null);
    setPendingReceiptImageUrl(null);
    setReceiptMeta(null);
    setHasAppliedSuggestion(false);
    setDuplicateMatches(null);
    setDuplicateCheckFailed(false);
    setRestrictedFund(false);
    setFundPurposeChoice("");
    setFundPurposeCustom("");
    setRelatedFundIncomeId("");
    setRelatedFundSource("");
    setAmountTouched(false);
    setPaidAtTouched(false);
    setCategoryTouched(false);
    setPaymentMethodTouched(false);
    setMerchantTouched(false);
    setMemoTouched(false);
  }, [open, defaultYear, defaultMonth, presetCompetitionId]);

  if (!open) return null;

  const resetAiFilledFields = () => {
    const m = defaultMonth != null ? String(defaultMonth).padStart(2, "0") : "01";
    setPaidAt(`${defaultYear}-${m}-15`);
    setAmount("");
    setCategory("other");
    setPaymentMethod("card");
    setMerchantName("");
    setMemo("");
    setReceiptMeta(null);
    setPendingReceiptImageUrl(null);
    setHasAppliedSuggestion(false);
    setDuplicateMatches(null);
    setDuplicateCheckFailed(false);
    setAmountTouched(false);
    setPaidAtTouched(false);
    setCategoryTouched(false);
    setPaymentMethodTouched(false);
    setMerchantTouched(false);
    setMemoTouched(false);
  };

  const applySuggestionToForm = (s: ReceiptSuggestion, opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    if (s.amount != null && (!amountTouched || force)) setAmount(String(s.amount));
    if (s.date && (!paidAtTouched || force)) setPaidAt(s.date);
    if (!categoryTouched || force) setCategory(s.categoryKey);
    if (!paymentMethodTouched || force) setPaymentMethod(s.paymentMethod);
    if (s.merchant?.trim() && (!merchantTouched || force)) setMerchantName(s.merchant.trim());
    if (!memoTouched || force) {
      if (s.memo?.trim()) setMemo(s.memo.trim());
      else if (s.merchant?.trim()) setMemo(s.merchant.trim());
      else setMemo("");
    }
    setHasAppliedSuggestion(true);
  };

  const runReceiptAnalysis = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    const isReshoot = receiptMeta !== null || pendingReceiptFile !== null;
    if (isReshoot) {
      resetAiFilledFields();
    }

    setReceiptAnalyzing(true);
    setPendingReceiptFile(file);

    try {
      const uploaded = await uploadFederationExpenseReceiptImageAsset(federationSlug, file);
      setPendingReceiptImageUrl(uploaded.downloadURL);

      const res = await analyzeFederationExpenseReceiptImage({
        federationSlug,
        storagePath: uploaded.storagePath,
        imageUrl: uploaded.downloadURL,
      });

      if (!res.success) {
        toast.error(res.error);
        setReceiptMeta(null);
        setHasAppliedSuggestion(false);
        return;
      }

      const suggestion: ReceiptSuggestion = {
        amount: res.amount,
        date: res.date,
        categoryKey: res.categoryKey,
        paymentMethod: res.paymentMethod,
        merchant: res.merchant?.trim() || null,
        memo: res.description?.trim() || res.merchant?.trim() || null,
      };

      setReceiptMeta({
        rawText: res.rawText,
        confidence: res.confidence,
        categoryLabel: res.category,
        suggestion,
      });

      const c = res.confidence;
      if (c >= 0.6) {
        applySuggestionToForm(suggestion);
      } else {
        setHasAppliedSuggestion(false);
        toast.warning("AI 신뢰도가 낮습니다. 아래 제안만 참고하고 직접 입력하거나 「제안 적용」을 누르세요.", {
          duration: 5000,
        });
      }

      const pct = Math.round(c * 100);
      if (c >= 0.85) {
        toast.success(`AI 분석 완료 (${pct}%) — 내용 확인 후 저장하세요.`);
      } else if (c >= 0.6) {
        toast.message(`AI 분석 완료 (${pct}%)`, {
          description: "중간 신뢰도입니다. 금액·날짜·분류를 반드시 확인하세요.",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "영수증 분석에 실패했습니다.");
      setReceiptMeta(null);
      setHasAppliedSuggestion(false);
      setPendingReceiptImageUrl(null);
    } finally {
      setReceiptAnalyzing(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void runReceiptAnalysis(file);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void runReceiptAnalysis(file);
  };

  const submit = async (opts?: { skipDuplicateCheck?: boolean }) => {
    const n = Math.floor(Number(String(amount).replace(/,/g, "")));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("금액을 올바르게 입력해 주세요.");
      return;
    }
    const comp = competitionId.trim();

    if (!opts?.skipDuplicateCheck) {
      setDuplicateCheckFailed(false);
      const occurredIso = new Date(paidAt + "T12:00:00").toISOString();
      try {
        const dups = await findPotentialDuplicateExpenses(federationSlug, {
          occurredAtIso: occurredIso,
          amount: n,
          merchantName: merchantName.trim() || undefined,
        });
        if (dups.length > 0) {
          setDuplicateMatches(dups);
          return;
        }
      } catch (e) {
        console.error(e);
        setDuplicateMatches(null);
        setDuplicateCheckFailed(true);
        toast.message("비슷한 지출 확인에 실패했습니다.", {
          description: "네트워크 문제일 수 있습니다. 아래에서 확인을 건너뛰고 저장할 수 있습니다.",
        });
        return;
      }
    }

    setDuplicateMatches(null);
    setDuplicateCheckFailed(false);
    setSaving(true);
    try {
      const resolvedFundPurpose =
        restrictedFund &&
        (fundPurposeChoice === FUND_PURPOSE_CUSTOM
          ? fundPurposeCustom.trim()
          : fundPurposeChoice.trim());

      const receiptAnalyzed = receiptMeta !== null;
      /** AI 제안을 폼에 반영했을 때만 receipt_ai (분석만 하고 수기만 쓴 경우는 manual) */
      const source = hasAppliedSuggestion ? "receipt_ai" : "manual";

      let receiptImageUrl: string | undefined;
      if (pendingReceiptImageUrl) {
        receiptImageUrl = pendingReceiptImageUrl;
      } else if (pendingReceiptFile) {
        try {
          receiptImageUrl = await uploadFederationExpenseReceiptImage(federationSlug, pendingReceiptFile);
        } catch (uploadErr) {
          console.error(uploadErr);
          toast.warning("영수증 이미지 업로드에 실패했습니다. 증빙 URL 없이 지출만 저장합니다.");
        }
      }

      const saveRes = await createFederationExpenseTransaction(federationSlug, {
        amount: n,
        occurredAt: new Date(paidAt + "T12:00:00").toISOString(),
        category,
        memo: memo.trim() || undefined,
        restrictedFund: restrictedFund || undefined,
        fundPurpose: resolvedFundPurpose || undefined,
        relatedFundIncomeId:
          restrictedFund && relatedFundIncomeId.trim() ? relatedFundIncomeId.trim() : undefined,
        relatedFundSource: restrictedFund && relatedFundSource.trim() ? relatedFundSource.trim() : undefined,
        competitionId: comp || undefined,
        operatingDomain: comp ? undefined : operatingDomain,
        paymentMethod,
        merchantName: merchantName.trim() || undefined,
        receiptImageUrl,
        receiptRawText: receiptAnalyzed ? receiptMeta?.rawText : undefined,
        receiptConfidence: receiptAnalyzed ? receiptMeta?.confidence : undefined,
        receiptAnalyzed,
        source,
        skipDuplicateCheck: opts?.skipDuplicateCheck === true,
      });
      if (!saveRes.ok) {
        if (saveRes.code === "POTENTIAL_DUPLICATE") {
          setDuplicateMatches(saveRes.matches);
          toast.message("유사한 지출이 원장에 있습니다.", {
            description: "아래 목록을 확인하거나 「확인 건너뛰고 저장」을 선택하세요.",
          });
          return;
        }
        toast.error(saveRes.error);
        return;
      }
      toast.success("지출을 원장에 등록했습니다.");
      onRecorded();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const lowConfidenceSuggestion =
    receiptMeta && receiptMeta.confidence < 0.6 ? receiptMeta.suggestion : null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">지출 등록</h3>
        <p className="text-sm text-gray-500 mb-3">
          자동 수입(회비·참가비 납부)은 납부 문서 + Cloud Function으로만 생성됩니다. 수동 수입은 대시보드 「수입 등록」에서
          처리하고, 여기서는 <span className="font-medium text-gray-800">지출</span>만 기록합니다.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleCameraChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleGalleryChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={receiptAnalyzing || saving}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 shrink-0" aria-hidden />
            {receiptAnalyzing ? "분석 중…" : "영수증 촬영"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={receiptAnalyzing || saving}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageUp className="w-4 h-4 shrink-0" aria-hidden />
            이미지 업로드
          </Button>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          AI가 초안만 채웁니다. <span className="font-medium text-gray-700">저장 전에 금액·날짜·카테고리·결제수단을 반드시 확인</span>
          하세요. 신뢰도 60% 미만이면 폼에 자동 입력하지 않습니다.
        </p>

        {receiptMeta ? (
          <div
            className={`mb-4 rounded-md border p-3 text-sm space-y-2 ${
              receiptMeta.confidence < 0.6
                ? "border-amber-200 bg-amber-50/80"
                : receiptMeta.confidence < 0.85
                  ? "border-indigo-100 bg-indigo-50/60"
                  : "border-emerald-100 bg-emerald-50/50"
            }`}
          >
            <div className="font-medium text-gray-900">AI 분석 결과 (참고)</div>
            <div className="text-gray-700">
              신뢰도: <span className="tabular-nums font-medium">{(receiptMeta.confidence * 100).toFixed(0)}%</span>
              {" · "}
              추정 분류: {receiptMeta.categoryLabel}
            </div>
            {receiptMeta.confidence < 0.6 ? (
              <p className="text-xs text-amber-900 font-medium">
                자동 입력 없음 — 잘못된 금액/날짜가 들어가는 것을 막기 위해 제안만 표시합니다.
              </p>
            ) : receiptMeta.confidence < 0.85 ? (
              <p className="text-xs text-rose-600 font-medium">중간 신뢰도입니다. 금액·날짜를 꼭 확인해 주세요.</p>
            ) : (
              <p className="text-xs text-emerald-800">신뢰도가 높은 편입니다. 그래도 저장 전 한 번만 확인해 주세요.</p>
            )}

            {lowConfidenceSuggestion && !hasAppliedSuggestion ? (
              <div className="rounded border border-amber-100 bg-white/90 px-2 py-2 text-xs text-gray-800 space-y-1">
                <div className="font-medium text-gray-700">제안 값</div>
                <div>금액: {lowConfidenceSuggestion.amount != null ? `${lowConfidenceSuggestion.amount.toLocaleString("ko-KR")}원` : "—"}</div>
                <div>날짜: {lowConfidenceSuggestion.date || "—"}</div>
                <div>상호: {lowConfidenceSuggestion.merchant || "—"}</div>
                <div>카테고리: {FEDERATION_EXPENSE_CATEGORY_LABELS[lowConfidenceSuggestion.categoryKey]}</div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => applySuggestionToForm(lowConfidenceSuggestion, { force: true })}
                >
                  제안을 폼에 적용
                </Button>
              </div>
            ) : null}

            {pendingReceiptFile ? (
              <p className="text-[11px] text-gray-500">저장 시 영수증 이미지를 함께 보관합니다.</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600">금액 (원)</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setAmountTouched(true);
                setAmount(e.target.value);
              }}
              placeholder="예: 300000"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">카테고리</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => {
                setCategoryTouched(true);
                setCategory(e.target.value as FederationExpenseCategory);
              }}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">발생일</Label>
            <Input
              className="mt-1"
              type="date"
              value={paidAt}
              onChange={(e) => {
                setPaidAtTouched(true);
                setPaidAt(e.target.value);
              }}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">결제 수단</Label>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-1">영수증만으로는 카드 여부가 항상 맞지 않을 수 있어, 직접 고르세요.</p>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethodTouched(true);
                setPaymentMethod(e.target.value as FederationExpensePaymentMethod);
              }}
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">대회 연결 (선택)</Label>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-1">
              선택 시 원장 <code className="text-[10px] bg-gray-100 px-1 rounded">competitionId</code>가 저장되고, 회계
              화면에서 해당 대회만 볼 때 손익에 포함됩니다.
            </p>
            <select
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
            >
              <option value="">없음 (협회 일반 지출)</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.year}] {c.name}
                </option>
              ))}
            </select>
          </div>
          {!competitionId.trim() ? (
            <div>
              <Label className="text-xs text-gray-600">원장 도메인 (대회 미연결 시)</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={operatingDomain}
                onChange={(e) => setOperatingDomain(e.target.value as FederationExpenseOperatingDomain)}
              >
                {OPERATING_DOMAIN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <Label className="text-xs text-gray-600">상호·가맹점 (선택)</Label>
            <Input
              className="mt-1"
              value={merchantName}
              onChange={(e) => {
                setMerchantTouched(true);
                setMerchantName(e.target.value);
              }}
              placeholder="예: ○○마트"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">설명 (선택)</Label>
            <Input
              className="mt-1"
              value={memo}
              onChange={(e) => {
                setMemoTouched(true);
                setMemo(e.target.value);
              }}
              placeholder="예: 심판 2인"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={restrictedFund}
              onChange={(e) => setRestrictedFund(e.target.checked)}
            />
            <span>
              <span className="font-medium">관 지원금(한정) 집행</span>
              <span className="block text-[11px] text-gray-500 mt-0.5">
                체크 시 원장 <code className="text-[10px] bg-gray-100 px-0.5 rounded">ledgerDomain: restricted_fund</code>로
                저장되어 일반 지출과 합산되지 않습니다.
              </span>
            </span>
          </label>
          {restrictedFund ? (
            <>
              <div>
                <Label className="text-xs text-gray-600">지출 용도 (보고·집계)</Label>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-1">
                  프리셋 또는 직접 입력. 감사·PDF·추후 AI 집계에 쓰입니다.
                </p>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={fundPurposeChoice}
                  onChange={(e) => setFundPurposeChoice(e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  {FEDERATION_RESTRICTED_EXPENSE_PURPOSE_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={FUND_PURPOSE_CUSTOM}>직접 입력…</option>
                </select>
                {fundPurposeChoice === FUND_PURPOSE_CUSTOM ? (
                  <Input
                    className="mt-2"
                    value={fundPurposeCustom}
                    onChange={(e) => setFundPurposeCustom(e.target.value)}
                    placeholder="용도를 입력하세요"
                  />
                ) : null}
              </div>
              <div>
                <Label className="text-xs text-gray-600">연결할 지원금 수입 (선택)</Label>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-1">
                  입금 완료된 관 지원금 수입만 표시됩니다. 목록이 비면 「수입 등록」 후 입금 확인하세요.
                </p>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={relatedFundIncomeId}
                  onChange={(e) => setRelatedFundIncomeId(e.target.value)}
                >
                  <option value="">연결 안 함</option>
                  {subsidyPaidIncomeOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">재원·근거 메모 (선택)</Label>
                <Input
                  className="mt-1"
                  value={relatedFundSource}
                  onChange={(e) => setRelatedFundSource(e.target.value)}
                  placeholder="예: 2025 청소년 리그 보조금"
                />
              </div>
            </>
          ) : null}
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
            <p className="font-medium text-amber-950">동일한 영수증으로 보이는 지출이 이미 있습니다.</p>
            <ul className="mt-2 list-disc pl-4 text-amber-900 text-xs space-y-1">
              {duplicateMatches.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {d.occurredAt?.slice(0, 10) ?? "—"} · {d.amount.toLocaleString("ko-KR")}원
                  {d.merchantName ? ` · ${d.merchantName}` : ""}
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
          <Button type="button" onClick={() => void submit()} disabled={saving || receiptAnalyzing}>
            {saving ? "저장 중…" : "지출 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
