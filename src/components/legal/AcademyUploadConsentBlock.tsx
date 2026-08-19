import { ACADEMY_UPLOAD_CONSENT } from "@/lib/legal/consentCopy";
import { LegalPolicyFooterLinks } from "@/components/legal/LegalPolicyFooterLinks";
import { cn } from "@/lib/utils";

export type AcademyUploadConsentState = {
  hasUploadRight: boolean;
  agreedAiAnalysis: boolean;
  agreedGuardianConsent: boolean;
};

type Props = {
  value: AcademyUploadConsentState;
  onChange: (next: AcademyUploadConsentState) => void;
  disabled?: boolean;
  className?: string;
};

function ConsentCheckbox({
  id,
  checked,
  disabled,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-200/80 bg-white/90 px-3 py-2 text-sm text-gray-800",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function AcademyUploadConsentBlock({ value, onChange, disabled, className }: Props) {
  const set = (patch: Partial<AcademyUploadConsentState>) => onChange({ ...value, ...patch });

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold text-gray-800">영상 업로드·AI 분석 동의 (필수)</p>
      <ConsentCheckbox
        id="consent-upload-right"
        checked={value.hasUploadRight}
        disabled={disabled}
        label={ACADEMY_UPLOAD_CONSENT.uploadRight}
        onChange={(hasUploadRight) => set({ hasUploadRight })}
      />
      <ConsentCheckbox
        id="consent-ai-analysis"
        checked={value.agreedAiAnalysis}
        disabled={disabled}
        label={ACADEMY_UPLOAD_CONSENT.aiAnalysis}
        onChange={(agreedAiAnalysis) => set({ agreedAiAnalysis })}
      />
      <ConsentCheckbox
        id="consent-guardian"
        checked={value.agreedGuardianConsent}
        disabled={disabled}
        label={ACADEMY_UPLOAD_CONSENT.guardianMinor}
        onChange={(agreedGuardianConsent) => set({ agreedGuardianConsent })}
      />
      <LegalPolicyFooterLinks className="pt-2" />
    </div>
  );
}

export function isAcademyUploadConsentComplete(state: AcademyUploadConsentState): boolean {
  return state.hasUploadRight && state.agreedAiAnalysis && state.agreedGuardianConsent;
}
