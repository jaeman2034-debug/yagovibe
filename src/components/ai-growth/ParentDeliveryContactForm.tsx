import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  describeParentDeliveryContactStatus,
  maskPhoneForDisplay,
} from "@/lib/parent-delivery/parentDeliveryContactLogic";
import { useParentDeliveryContact } from "@/hooks/useParentDeliveryContact";

export type ParentDeliveryContactFormProps = {
  teamId: string;
  playerId: string;
  playerName: string;
  className?: string;
};

/** v2.1 Phase A — 학부모 연락처 · 최초 1회 발송 동의 */
export function ParentDeliveryContactForm({
  teamId,
  playerId,
  playerName,
  className,
}: ParentDeliveryContactFormProps) {
  const { contact, loading, saving, save, initialForm, consentLocked, rosterPlayerSelected } =
    useParentDeliveryContact(teamId, playerId, playerName);

  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentConsent, setParentConsent] = useState(false);

  useEffect(() => {
    setParentName(initialForm.parentName);
    setParentPhone(initialForm.parentPhone);
    setParentConsent(initialForm.parentConsent);
  }, [initialForm.parentName, initialForm.parentPhone, initialForm.parentConsent]);

  async function handleSave() {
    try {
      await save({
        parentName,
        parentPhone,
        parentConsent: consentLocked ? true : parentConsent,
      });
      toast.success("학부모 연락처·동의 정보를 저장했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했어요.");
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-white/80 px-3 py-2.5",
        className
      )}
      data-testid="parent-delivery-contact-form"
    >
      <div className="flex items-start gap-2">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-emerald-950">학부모 연락처 · 발송 동의</p>
          <p className="text-[10px] text-emerald-800">
            {playerName} 선수 · v2.1 알림톡 준비 ·{" "}
            {loading ? "불러오는 중…" : describeParentDeliveryContactStatus(contact)}
          </p>
          {!rosterPlayerSelected ? (
            <p className="mt-1 text-[10px] font-medium text-amber-800">
              아카데미 명단에서 선수를 선택하면 연락처가 선수별로 저장됩니다.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <label className="block text-[10px] font-semibold text-emerald-900">
          학부모 이름
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-emerald-200 px-2 py-1.5 text-xs"
            placeholder="예: 김학부"
            value={parentName}
            disabled={loading || saving}
            data-testid="parent-delivery-contact-name"
            onChange={(e) => setParentName(e.target.value)}
          />
        </label>
        <label className="block text-[10px] font-semibold text-emerald-900">
          휴대폰 번호
          <input
            type="tel"
            className="mt-1 w-full rounded-md border border-emerald-200 px-2 py-1.5 text-xs"
            placeholder="010-1234-5678"
            value={parentPhone}
            disabled={loading || saving}
            data-testid="parent-delivery-contact-phone"
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </label>
      </div>

      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[10px] text-emerald-900">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 rounded border-emerald-300"
          checked={consentLocked ? true : parentConsent}
          disabled={loading || saving || consentLocked}
          data-testid="parent-delivery-contact-consent"
          onChange={(e) => setParentConsent(e.target.checked)}
        />
        <span>
          <strong>학부모 발송 동의</strong> — 성장 리포트 알림톡 수신에 동의했음을 코치가
          확인했습니다. (최초 1회 · 변경 불가)
          {contact?.parentConsentAt ? (
            <span className="mt-0.5 block text-emerald-700">
              동의일: {new Date(contact.parentConsentAt).toLocaleString("ko-KR")}
              {contact.parentPhone ? ` · ${maskPhoneForDisplay(contact.parentPhone)}` : ""}
            </span>
          ) : null}
        </span>
      </label>

      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 border-emerald-300 text-[10px] text-emerald-900"
          disabled={loading || saving}
          data-testid="parent-delivery-contact-save"
          onClick={() => void handleSave()}
        >
          {saving ? "저장 중…" : "연락처 저장"}
        </Button>
      </div>
    </div>
  );
}
