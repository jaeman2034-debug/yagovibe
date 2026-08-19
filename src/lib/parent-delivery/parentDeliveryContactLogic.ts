import type {
  ParentDeliveryConsentMethod,
  ParentDeliveryContact,
} from "@/lib/parent-delivery/parentDeliveryTypes";
import { resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";

export type { ParentDeliveryConsentMethod };

export type ParentDeliveryContactInput = {
  parentName?: string;
  parentPhone: string;
  parentKakaoId?: string;
  parentConsent: boolean;
};

/** Empty playerId → invalid 3-segment Firestore path; always resolve to non-empty doc id. */
export function resolveParentDeliveryContactDocId(
  playerId: string | undefined,
  displayName: string
): string {
  const trimmed = playerId?.trim();
  if (trimmed) return trimmed;
  return resolveGrowthPlayerIdForSession({ displayName: displayName.trim() });
}

export function normalizeKoreanMobilePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("82")) {
    local = local.slice(2);
    if (local.startsWith("0")) local = local.slice(1);
  }
  if (local.startsWith("0")) local = local.slice(1);

  if (!/^1\d{8,9}$/.test(local)) return null;
  return `+82${local}`;
}

export function formatPhoneForDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const local = digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
  if (local.length === 11) {
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return e164;
}

export function maskPhoneForDisplay(e164: string): string {
  const display = formatPhoneForDisplay(e164);
  return display.replace(/(\d{3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
}

export function validateParentDeliveryContactInput(
  input: ParentDeliveryContactInput
): { ok: true } | { ok: false; error: string } {
  const phone = normalizeKoreanMobilePhone(input.parentPhone);
  if (!phone) {
    return { ok: false, error: "올바른 휴대폰 번호를 입력해 주세요. (010-XXXX-XXXX)" };
  }
  if (input.parentConsent && !input.parentName?.trim()) {
    return { ok: false, error: "발송 동의 시 학부모 이름을 입력해 주세요." };
  }
  if (!input.parentConsent) {
    return { ok: false, error: "알림톡 발송을 위해 학부모 동의가 필요합니다." };
  }
  return { ok: true };
}

export function canSendParentDeliveryAlimtalk(contact: ParentDeliveryContact | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!contact) return { allowed: false, reason: "contact_missing" };
  if (!contact.parentConsent) return { allowed: false, reason: "consent_required" };
  if (!contact.parentPhone?.trim()) return { allowed: false, reason: "phone_missing" };
  const normalized = normalizeKoreanMobilePhone(contact.parentPhone);
  if (!normalized) return { allowed: false, reason: "phone_invalid" };
  return { allowed: true };
}

export function describeParentDeliveryContactStatus(
  contact: ParentDeliveryContact | null
): string {
  if (!contact?.parentPhone) return "학부모 연락처 미등록";
  if (!contact.parentConsent) return "발송 동의 필요";
  if (contact.parentConsentAt) {
    return `동의 완료 · ${new Date(contact.parentConsentAt).toLocaleDateString("ko-KR")}`;
  }
  return "동의 완료";
}
