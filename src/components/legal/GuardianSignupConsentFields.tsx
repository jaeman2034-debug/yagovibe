import { SIGNUP_GUARDIAN_CONSENT } from "@/lib/legal/consentCopy";
import { LegalPolicyFooterLinks } from "@/components/legal/LegalPolicyFooterLinks";

export type GuardianSignupConsentState = {
  isGuardianSignup: boolean;
  isLegalGuardian: boolean;
  agreedChildAiProcessing: boolean;
};

type Props = {
  value: GuardianSignupConsentState;
  onChange: (next: GuardianSignupConsentState) => void;
  disabled?: boolean;
};

export function isGuardianSignupConsentComplete(state: GuardianSignupConsentState): boolean {
  if (!state.isGuardianSignup) return true;
  return state.isLegalGuardian && state.agreedChildAiProcessing;
}

export function GuardianSignupConsentFields({ value, onChange, disabled }: Props) {
  const set = (patch: Partial<GuardianSignupConsentState>) => onChange({ ...value, ...patch });

  return (
    <div className="w-full max-w-md space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-left">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={value.isGuardianSignup}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
          onChange={(e) =>
            set({
              isGuardianSignup: e.target.checked,
              isLegalGuardian: false,
              agreedChildAiProcessing: false,
            })
          }
        />
        <span>{SIGNUP_GUARDIAN_CONSENT.isGuardianLabel}</span>
      </label>

      {value.isGuardianSignup ? (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={value.isLegalGuardian}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
              onChange={(e) => set({ isLegalGuardian: e.target.checked })}
            />
            <span>{SIGNUP_GUARDIAN_CONSENT.legalGuardian}</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={value.agreedChildAiProcessing}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
              onChange={(e) => set({ agreedChildAiProcessing: e.target.checked })}
            />
            <span>{SIGNUP_GUARDIAN_CONSENT.aiDataProcessing}</span>
          </label>
        </div>
      ) : null}

      <LegalPolicyFooterLinks className="border-t border-gray-200 pt-3" />
    </div>
  );
}
