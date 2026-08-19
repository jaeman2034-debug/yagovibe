import { createHash, randomUUID } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import type {
  KakaoAlimTalkProvider,
  KakaoAlimTalkSendResult,
} from "../lib/kakao/kakaoAlimTalkProvider";
import {
  normalizeNcpRecipient,
  readNcpAlimTalkConfig,
  renderNcpAlimTalkContent,
} from "../lib/kakao/ncpAlimTalkProvider";
import { resolveAlimTalkTemplateCode } from "../lib/kakao/alimtalkTemplates";

const FEDERATION_SLUG = "nowon-football";
export const CANARY_SEND_ROLES = ["chairman", "manager"] as const;
export const CANARY_SCOPE_EXCLUDED_ROLES = ["coach"] as const;
const PROVIDER = "kakao_ncp";
const LEASE_DURATION_MS = 2 * 60 * 1000;

export const RA_CANARY_FORBIDDEN_RESERVATION_IDS = new Set([
  "slot_nowon-suraksan_2026-09-03_1000",
  "slot_nowon-suraksan_2026-09-04_1000",
  "slot_nowon-suraksan_2026-09-07_1000",
  "canary-test-20260902-1900-v1",
]);

export const RA_CANARY_FORBIDDEN_BOOKING_DATES = new Set(["2026-08-26", "2026-09-07"]);

export const CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES = [
  "teamName",
  "venueName",
  "date",
  "time",
  "amount",
  "accountNumber",
] as const;

export type CanonicalReservationAssignedTemplateVariables = Record<
  (typeof CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES)[number],
  string
>;

export type ControlledCanaryAttemptState =
  | "pending"
  | "attempting"
  | "provider_accepted"
  | "explicit_failed"
  | "unknown_outcome"
  | "reconciled_sent";

export type ControlledCanaryNotification = {
  id: string;
  recipientPhone: string;
  recipientRole: string;
  templateKey: string;
  templateId: string;
  federationSlug: string;
  reservationId: string;
  raw: Record<string, unknown>;
};

export type ControlledCanaryTarget = ControlledCanaryNotification & {
  role: (typeof CANARY_SEND_ROLES)[number];
  recipientSha256: string;
  requestEvidenceHash: string;
};

export type ControlledCanaryExcludedNotification = {
  role: string;
  notificationId: string;
  reason: "CANARY_SCOPE_EXCLUDED";
};

export type ControlledCanaryReservationSnapshot = {
  pricingStatus: string;
  totalAmount: number | null;
  baseAmount: number | null;
  lightingAmount: number | null;
  pricingPolicyId: string | null;
  pricingPolicyVersion: unknown;
  pricingSnapshot: Record<string, unknown> | null;
  venueName: string | null;
  bookingDate: string | null;
  time: string | null;
  teamName: string | null;
};

export type ControlledCanaryRequest = {
  auth?: { uid?: string; token?: Record<string, unknown> };
  data?: unknown;
};

export type ControlledCanaryStore = {
  reservationExists(federationSlug: string, reservationId: string): Promise<boolean>;
  readReservation(
    federationSlug: string,
    reservationId: string
  ): Promise<ControlledCanaryReservationSnapshot | null>;
  readInvocationGuard(
    federationSlug: string,
    reservationId: string
  ): Promise<{ exists: boolean; invocationId?: string }>;
  findReservationNotifications(
    federationSlug: string,
    reservationId: string
  ): Promise<ControlledCanaryNotification[]>;
  createInvocation(input: {
    federationSlug: string;
    reservationId: string;
    invocationId: string;
    createdBy: string;
    templateCode: string;
    targets: ControlledCanaryTarget[];
    provider: string;
  }): Promise<{ created: true } | { created: false; invocationId: string }>;
  claimAttempt(input: {
    federationSlug: string;
    invocationId: string;
    notificationId: string;
    leaseOwner: string;
    now: Date;
    leaseDurationMs: number;
  }): Promise<{ claimed: true; attemptId: string; attemptedAt: Date } | { claimed: false; state: string }>;
  completeAttempt(input: {
    federationSlug: string;
    invocationId: string;
    notificationId: string;
    state: "provider_accepted" | "explicit_failed";
    result: KakaoAlimTalkSendResult;
    completedAt: Date;
  }): Promise<void>;
  markExpiredAttemptsUnknown(input: {
    federationSlug: string;
    invocationId: string;
    now: Date;
  }): Promise<number>;
};

export type ReservationAssignedControlledCanaryDependencies = {
  store: ControlledCanaryStore;
  assertPlatformAdmin(uid: string, token: Record<string, unknown> | undefined): Promise<void>;
  provider: Pick<KakaoAlimTalkProvider, "sendAlimTalk">;
  runtimeEnv: Record<string, string | undefined>;
  now?: () => Date;
  randomId?: () => string;
  afterProviderCallBeforeEvidenceWrite?: (target: ControlledCanaryTarget) => Promise<void>;
};

export type ControlledCanaryLiveResult = {
  dryRun: false;
  invocationId: string;
  reservationId: string;
  targetCount: 2;
  states: Array<{ notificationId: string; role: string; state: ControlledCanaryAttemptState }>;
};

export type ControlledCanaryDryRunResult = {
  dryRun: true;
  reservationId: string;
  rolesSelected: Array<(typeof CANARY_SEND_ROLES)[number]>;
  recipientCount: 2;
  recipients: Array<{
    role: (typeof CANARY_SEND_ROLES)[number];
    notificationId: string;
    phonePresent: boolean;
    phoneSha256: string;
  }>;
  excludedRoles: ControlledCanaryExcludedNotification[];
  templateId: "RESERVATION_APPROVED";
  templateCode: string;
  renderedVariableNames: string[];
  venueName: string;
  amount: string;
  pricingStatus: string;
  pricingPolicyId: string | null;
  pricingPolicyVersion: unknown;
  provider: typeof PROVIDER;
  providerConfigPresent: boolean;
  secretPresence: {
    NCP_ACCESS_KEY: boolean;
    NCP_SECRET_KEY: boolean;
    NCP_SENS_SERVICE_ID: boolean;
    NCP_KAKAO_PLUS_FRIEND_ID: boolean;
    KAKAO_TEMPLATE_RESERVATION_APPROVED: boolean;
  };
  sendEligible: boolean;
  guardEligible: boolean;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dataOf(raw: Record<string, unknown>): Record<string, unknown> {
  return raw.payload && typeof raw.payload === "object"
    ? (raw.payload as Record<string, unknown>)
    : {};
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasPriorProviderEvidence(raw: Record<string, unknown>): boolean {
  return Boolean(
    stringValue(raw.providerMessageId) ||
      stringValue(raw.requestId) ||
      raw.sentAt ||
      raw.completedAt ||
      raw.providerAcceptedAt ||
      raw.canaryInvocationId
  );
}

function canonicalRequestEvidenceHash(input: {
  federationSlug: string;
  reservationId: string;
  notificationId: string;
  role: string;
  templateCode: string;
  recipientSha256: string;
}): string {
  return hash(
    JSON.stringify({
      federationSlug: input.federationSlug,
      reservationId: input.reservationId,
      notificationId: input.notificationId,
      role: input.role,
      templateCode: input.templateCode,
      recipientSha256: input.recipientSha256,
      provider: PROVIDER,
    })
  );
}

export function assertReservationEligibleForCanary(input: {
  reservationId: string;
  bookingDate?: string | null;
}): void {
  if (RA_CANARY_FORBIDDEN_RESERVATION_IDS.has(input.reservationId)) {
    throw new HttpsError("failed-precondition", "RA_CANARY_RESERVATION_FORBIDDEN");
  }
  if (input.bookingDate && RA_CANARY_FORBIDDEN_BOOKING_DATES.has(input.bookingDate)) {
    throw new HttpsError("failed-precondition", "RA_CANARY_RESERVATION_FORBIDDEN");
  }
}

function validateQuotedReservationPricing(
  reservation: ControlledCanaryReservationSnapshot | null
): ControlledCanaryReservationSnapshot {
  if (!reservation) {
    throw new HttpsError("not-found", "RA_CANARY_RESERVATION_NOT_FOUND");
  }
  if (reservation.pricingStatus !== "QUOTED") {
    throw new HttpsError("failed-precondition", "RA_CANARY_PRICING_NOT_QUOTED");
  }
  if (
    typeof reservation.totalAmount !== "number" ||
    !Number.isFinite(reservation.totalAmount) ||
    reservation.totalAmount <= 0
  ) {
    throw new HttpsError("failed-precondition", "RA_CANARY_AUTHORITATIVE_AMOUNT_REQUIRED");
  }
  if (!reservation.pricingSnapshot || !reservation.pricingPolicyId) {
    throw new HttpsError("failed-precondition", "RA_CANARY_PRICING_SNAPSHOT_REQUIRED");
  }
  return reservation;
}

function assessProviderConfig(runtimeEnv: Record<string, string | undefined>): {
  providerConfigPresent: boolean;
  secretPresence: ControlledCanaryDryRunResult["secretPresence"];
} {
  const secretPresence = {
    NCP_ACCESS_KEY: Boolean(stringValue(runtimeEnv.NCP_ACCESS_KEY)),
    NCP_SECRET_KEY: Boolean(stringValue(runtimeEnv.NCP_SECRET_KEY)),
    NCP_SENS_SERVICE_ID: Boolean(stringValue(runtimeEnv.NCP_SENS_SERVICE_ID)),
    NCP_KAKAO_PLUS_FRIEND_ID: Boolean(stringValue(runtimeEnv.NCP_KAKAO_PLUS_FRIEND_ID)),
    KAKAO_TEMPLATE_RESERVATION_APPROVED: Boolean(
      stringValue(runtimeEnv.KAKAO_TEMPLATE_RESERVATION_APPROVED)
    ),
  };
  return {
    providerConfigPresent: readNcpAlimTalkConfig(runtimeEnv) != null,
    secretPresence,
  };
}

export function buildCanonicalReservationAssignedTemplateVariables(
  target: Pick<ControlledCanaryTarget, "raw">
): CanonicalReservationAssignedTemplateVariables {
  const payload = dataOf(target.raw);
  return {
    teamName: stringValue(target.raw.teamName),
    venueName: stringValue(payload.venueName),
    date: stringValue(payload.bookingDate),
    time: stringValue(payload.time),
    amount: stringValue(payload.amount),
    accountNumber: stringValue(payload.accountNumber),
  };
}

export function renderCanonicalReservationAssignedTemplate(
  target: Pick<ControlledCanaryTarget, "raw">,
  templateCode: string
): {
  templateVariables: CanonicalReservationAssignedTemplateVariables;
  content: string;
  renderedVariableNames: string[];
  venueName: string;
  amount: string;
  contentFingerprint: string;
} {
  const templateVariables = buildCanonicalReservationAssignedTemplateVariables(target);
  const rendered = renderNcpAlimTalkContent("RESERVATION_APPROVED", templateCode, templateVariables);
  if (!rendered.content || rendered.errorCode) {
    throw new HttpsError("failed-precondition", rendered.errorCode || "RA_CANARY_TEMPLATE_RENDER_FAILED");
  }
  return {
    templateVariables,
    content: rendered.content,
    renderedVariableNames: [...CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES],
    venueName: templateVariables.venueName,
    amount: templateVariables.amount,
    contentFingerprint: hash(rendered.content),
  };
}

function renderTargetTemplate(
  target: ControlledCanaryTarget,
  templateCode: string
): { venueName: string; amount: string; renderedVariableNames: string[] } {
  const rendered = renderCanonicalReservationAssignedTemplate(target, templateCode);
  return {
    venueName: rendered.venueName,
    amount: rendered.amount,
    renderedVariableNames: rendered.renderedVariableNames,
  };
}

export function resolveExactReservationAssignedCanaryTargets(input: {
  federationSlug: string;
  reservationId: string;
  templateCode: string;
  notifications: ControlledCanaryNotification[];
}): {
  targets: ControlledCanaryTarget[];
  excluded: ControlledCanaryExcludedNotification[];
} {
  if (input.federationSlug !== FEDERATION_SLUG) {
    throw new HttpsError("failed-precondition", "RA_CANARY_FEDERATION_NOT_ALLOWED");
  }
  if (!input.templateCode || input.templateCode === "PENDING") {
    throw new HttpsError("failed-precondition", "RA_CANARY_TEMPLATE_CODE_INVALID");
  }

  const excluded: ControlledCanaryExcludedNotification[] = [];
  const candidates: ControlledCanaryTarget[] = [];

  for (const notification of input.notifications) {
    const raw = notification.raw;
    const payload = dataOf(raw);
    const role = notification.recipientRole;

    if ((CANARY_SCOPE_EXCLUDED_ROLES as readonly string[]).includes(role)) {
      excluded.push({
        role,
        notificationId: notification.id,
        reason: "CANARY_SCOPE_EXCLUDED",
      });
      continue;
    }

    if (!(CANARY_SEND_ROLES as readonly string[]).includes(role)) {
      throw new HttpsError("failed-precondition", "RA_CANARY_ROLE_NOT_ALLOWED");
    }

    const phone = normalizeNcpRecipient(notification.recipientPhone);
    if (
      notification.federationSlug !== input.federationSlug ||
      notification.reservationId !== input.reservationId ||
      stringValue(raw.notificationType) !== "RESERVATION_ASSIGNED" ||
      stringValue(raw.templateKey) !== "RESERVATION_ASSIGNED" ||
      stringValue(raw.alimTalkTemplateId) !== "RESERVATION_APPROVED" ||
      stringValue(payload.reservationId) !== input.reservationId ||
      !phone
    ) {
      throw new HttpsError("failed-precondition", "RA_CANARY_NOTIFICATION_SCOPE_INVALID");
    }
    if (hasPriorProviderEvidence(raw)) {
      throw new HttpsError("already-exists", "RA_CANARY_NOTIFICATION_ALREADY_PROCESSED");
    }

    candidates.push({
      ...notification,
      recipientPhone: phone,
      role: role as (typeof CANARY_SEND_ROLES)[number],
      recipientSha256: hash(phone),
      requestEvidenceHash: canonicalRequestEvidenceHash({
        federationSlug: input.federationSlug,
        reservationId: input.reservationId,
        notificationId: notification.id,
        role,
        templateCode: input.templateCode,
        recipientSha256: hash(phone),
      }),
    });
  }

  const chairman = candidates.filter((target) => target.role === "chairman");
  const manager = candidates.filter((target) => target.role === "manager");

  if (chairman.length !== 1) {
    throw new HttpsError(
      "failed-precondition",
      chairman.length === 0 ? "RA_CANARY_CHAIRMAN_REQUIRED" : "RA_CANARY_DUPLICATE_CHAIRMAN"
    );
  }
  if (manager.length !== 1) {
    throw new HttpsError(
      "failed-precondition",
      manager.length === 0 ? "RA_CANARY_MANAGER_REQUIRED" : "RA_CANARY_DUPLICATE_MANAGER"
    );
  }

  const targets = [chairman[0], manager[0]];
  if (new Set(targets.map((target) => target.id)).size !== targets.length) {
    throw new HttpsError("failed-precondition", "RA_CANARY_EXACT_TWO_RECIPIENTS_REQUIRED");
  }

  return { targets, excluded };
}

export async function executeReservationAssignedControlledCanaryCore(
  request: ControlledCanaryRequest,
  deps: ReservationAssignedControlledCanaryDependencies
): Promise<ControlledCanaryLiveResult | ControlledCanaryDryRunResult> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "관리자 로그인이 필요합니다.");
  const data = (request.data || {}) as Record<string, unknown>;
  const dryRun = data.dryRun === true;
  const federationSlug = stringValue(data.federationSlug);
  const reservationId = stringValue(data.reservationId);
  if (!federationSlug || !reservationId) {
    throw new HttpsError("invalid-argument", "federationSlug와 reservationId가 필요합니다.");
  }

  await deps.assertPlatformAdmin(uid, request.auth?.token);
  if (!(await deps.store.reservationExists(federationSlug, reservationId))) {
    throw new HttpsError("not-found", "RA_CANARY_RESERVATION_NOT_FOUND");
  }

  const reservation = validateQuotedReservationPricing(
    await deps.store.readReservation(federationSlug, reservationId)
  );
  assertReservationEligibleForCanary({
    reservationId,
    bookingDate: reservation.bookingDate,
  });

  const templateCode = resolveAlimTalkTemplateCode("RESERVATION_APPROVED", deps.runtimeEnv);
  const notifications = await deps.store.findReservationNotifications(federationSlug, reservationId);
  const { targets, excluded } = resolveExactReservationAssignedCanaryTargets({
    federationSlug,
    reservationId,
    templateCode,
    notifications,
  });
  const templatePreview = renderTargetTemplate(targets[0], templateCode);
  const providerAssessment = assessProviderConfig(deps.runtimeEnv);
  const guardState = await deps.store.readInvocationGuard(federationSlug, reservationId);

  if (dryRun) {
    return {
      dryRun: true,
      reservationId,
      rolesSelected: ["chairman", "manager"],
      recipientCount: 2,
      recipients: targets.map((target) => ({
        role: target.role,
        notificationId: target.id,
        phonePresent: Boolean(target.recipientPhone),
        phoneSha256: target.recipientSha256,
      })),
      excludedRoles: excluded,
      templateId: "RESERVATION_APPROVED",
      templateCode,
      renderedVariableNames: templatePreview.renderedVariableNames,
      venueName: templatePreview.venueName,
      amount: templatePreview.amount,
      pricingStatus: reservation.pricingStatus,
      pricingPolicyId: reservation.pricingPolicyId,
      pricingPolicyVersion: reservation.pricingPolicyVersion,
      provider: PROVIDER,
      providerConfigPresent: providerAssessment.providerConfigPresent,
      secretPresence: providerAssessment.secretPresence,
      sendEligible:
        providerAssessment.providerConfigPresent &&
        !guardState.exists &&
        templatePreview.venueName.length > 0 &&
        templatePreview.amount.length > 0,
      guardEligible: !guardState.exists,
    };
  }

  if (guardState.exists) {
    throw new HttpsError("already-exists", "RA_CANARY_RESERVATION_ALREADY_CONSUMED");
  }

  const invocationId = (deps.randomId || randomUUID)();
  const invocation = await deps.store.createInvocation({
    federationSlug,
    reservationId,
    invocationId,
    createdBy: uid,
    templateCode,
    targets,
    provider: PROVIDER,
  });
  if (!invocation.created) {
    const existing = invocation as { created: false; invocationId: string };
    await deps.store.markExpiredAttemptsUnknown({
      federationSlug,
      invocationId: existing.invocationId,
      now: (deps.now || (() => new Date()))(),
    });
    throw new HttpsError("already-exists", "RA_CANARY_RESERVATION_ALREADY_CONSUMED");
  }

  const now = deps.now || (() => new Date());
  const states: Array<{ notificationId: string; role: string; state: ControlledCanaryAttemptState }> = [];
  for (const target of targets) {
    const claim = await deps.store.claimAttempt({
      federationSlug,
      invocationId,
      notificationId: target.id,
      leaseOwner: uid,
      now: now(),
      leaseDurationMs: LEASE_DURATION_MS,
    });
    if (!claim.claimed) {
      const blocked = claim as { claimed: false; state: string };
      throw new HttpsError("failed-precondition", `RA_CANARY_ATTEMPT_NOT_PENDING:${blocked.state}`);
    }

    const rendered = renderCanonicalReservationAssignedTemplate(target, templateCode);
    const result = await deps.provider.sendAlimTalk({
      recipientPhone: target.recipientPhone,
      templateId: "RESERVATION_APPROVED",
      templateCode,
      templateVariables: rendered.templateVariables,
      content: rendered.content,
      notificationId: target.id,
      federationSlug,
    });
    await deps.afterProviderCallBeforeEvidenceWrite?.(target);
    const state: "provider_accepted" | "explicit_failed" =
      result.status === "sent" ? "provider_accepted" : "explicit_failed";
    await deps.store.completeAttempt({
      federationSlug,
      invocationId,
      notificationId: target.id,
      state,
      result,
      completedAt: now(),
    });
    states.push({ notificationId: target.id, role: target.role, state });
  }
  return { dryRun: false, invocationId, reservationId, targetCount: 2, states };
}
