/** Parent Delivery v2 — types (Mock Provider · v2.1 = AlimTalk) */

export const PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION = 1 as const;
export const PARENT_DELIVERY_LOG_SCHEMA_VERSION = 1 as const;
export const PARENT_DELIVERY_CONTACT_SCHEMA_VERSION = 1 as const;

export type ParentDeliverySendChannel = "manual" | "kakao" | "sms" | "email";

export type ParentDeliveryLogStatus = "queued" | "sent" | "failed";

export type ParentDeliverySettings = {
  schemaVersion: typeof PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION;
  autoSendEnabled: boolean;
  sendChannel: ParentDeliverySendChannel;
  updatedAt: number;
  updatedByUid: string;
};

/** Spec: teams/{teamId}/players/{playerId} — 구현: parentDeliveryContacts (staff write) */
export type ParentDeliveryConsentMethod = "verbal_coach" | "sms_otp" | "in_app";

export type ParentDeliveryContact = {
  schemaVersion: typeof PARENT_DELIVERY_CONTACT_SCHEMA_VERSION;
  playerId: string;
  parentName?: string;
  parentPhone?: string;
  parentKakaoId?: string;
  parentConsent: boolean;
  parentConsentAt?: number | null;
  /** v2.1 G3 — 최초 1회 동의 기록 */
  consentMethod?: ParentDeliveryConsentMethod;
  consentRecordedByUid?: string;
  updatedAt: number;
  updatedByUid: string;
};

export type ParentDeliveryLog = {
  schemaVersion: typeof PARENT_DELIVERY_LOG_SCHEMA_VERSION;
  deliveryId: string;
  teamId: string;
  playerId: string;
  sessionId: string;
  channel: ParentDeliverySendChannel;
  status: ParentDeliveryLogStatus;
  shareUrl: string;
  sentAt: number | null;
  error: string | null;
  triggeredByUid: string;
  createdAt: number;
  /** Mock v2 — 실제 API 연동 시 provider message id */
  provider?: "mock" | "kakao_alimtalk";
  providerMessageId?: string;
};

export const DEFAULT_PARENT_DELIVERY_SETTINGS: ParentDeliverySettings = {
  schemaVersion: PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION,
  autoSendEnabled: false,
  sendChannel: "manual",
  updatedAt: 0,
  updatedByUid: "",
};
