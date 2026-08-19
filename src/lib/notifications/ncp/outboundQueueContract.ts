/**
 * Sprint 2-4 PREP — Outbound notification queue contract + retry policy.
 * Pure builders only — does not write Firestore or call NCP/SENS/Solapi.
 *
 * Existing runtime may still use root `notifications` + processOutboundQueueItem.
 * This contract is the target shape for NCP GO wiring.
 */

import type { AlimTalkTemplateId } from "@/lib/notifications/kakao/templates";
import type { PlatformNotifyEventId } from "@/lib/notifications/ncp/platformNotifyEvents";
import {
  getTemplateBinding,
  type NotifyChannelKind,
} from "@/lib/notifications/ncp/templateIdMap";

export type OutboundJobStatus =
  | "queued"
  | "processing"
  | "sent"
  | "failed"
  | "dead"
  | "skipped";

export type OutboundNotifyJob = {
  schemaVersion: 1;
  /** Stable idempotency key — must be unique per logical send */
  dedupeKey: string;
  eventId: PlatformNotifyEventId;
  alimTalkTemplateId: AlimTalkTemplateId;
  channelPreference: NotifyChannelKind[];
  /** Channel selected for this attempt */
  activeChannel: NotifyChannelKind;
  recipient: {
    uid?: string | null;
    phoneE164?: string | null;
    email?: string | null;
  };
  variables: Record<string, string>;
  link?: string | null;
  federationSlug?: string | null;
  teamId?: string | null;
  reservationId?: string | null;
  status: OutboundJobStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAtMs: number | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  createdAtMs: number;
  /** Live send forbidden until GO flag */
  liveSendEnabled: false;
};

export type OutboundRetryPolicy = {
  maxAttempts: number;
  /** Base delay seconds for attempt 1 → 2 */
  baseDelaySec: number;
  /** Exponential factor */
  factor: number;
  /** Cap delay seconds */
  maxDelaySec: number;
  retryableErrorCodes: string[];
  nonRetryableErrorCodes: string[];
};

/** Design LOCK — adjust only with PM GO after NCP reply */
export const OUTBOUND_RETRY_POLICY: OutboundRetryPolicy = {
  maxAttempts: 5,
  baseDelaySec: 60,
  factor: 2,
  maxDelaySec: 3600,
  retryableErrorCodes: [
    "NETWORK",
    "TIMEOUT",
    "HTTP_429",
    "HTTP_500",
    "HTTP_502",
    "HTTP_503",
    "PROVIDER_UNAVAILABLE",
  ],
  nonRetryableErrorCodes: [
    "INVALID_PHONE",
    "INVALID_EMAIL",
    "TEMPLATE_PENDING",
    "TEMPLATE_REJECTED",
    "UNSUBSCRIBED",
    "SENS_NOT_CONFIGURED",
    "NCP_HOLD",
    "LIVE_SEND_DISABLED",
  ],
};

export function computeRetryDelaySec(
  attemptsAfterFailure: number,
  policy: OutboundRetryPolicy = OUTBOUND_RETRY_POLICY
): number {
  const n = Math.max(1, attemptsAfterFailure);
  const raw = policy.baseDelaySec * Math.pow(policy.factor, n - 1);
  return Math.min(policy.maxDelaySec, Math.floor(raw));
}

export function isRetryableErrorCode(
  code: string | null | undefined,
  policy: OutboundRetryPolicy = OUTBOUND_RETRY_POLICY
): boolean {
  if (!code) return true;
  if (policy.nonRetryableErrorCodes.includes(code)) return false;
  if (policy.retryableErrorCodes.includes(code)) return true;
  // Unknown → retry cautiously up to maxAttempts
  return true;
}

export type BuildOutboundJobInput = {
  eventId: PlatformNotifyEventId;
  dedupeKey: string;
  recipient: OutboundNotifyJob["recipient"];
  variables?: Record<string, string>;
  link?: string | null;
  federationSlug?: string | null;
  teamId?: string | null;
  reservationId?: string | null;
  nowMs?: number;
};

/**
 * Build a queued job in HOLD mode (liveSendEnabled always false).
 * Does not persist — caller may write later when NCP GO.
 */
export function buildOutboundNotifyJob(input: BuildOutboundJobInput): OutboundNotifyJob {
  const binding = getTemplateBinding(input.eventId);
  const preference = binding.channelPreference;
  const activeChannel = preference[0] || "app";
  const now = typeof input.nowMs === "number" ? input.nowMs : Date.now();

  return {
    schemaVersion: 1,
    dedupeKey: input.dedupeKey.trim(),
    eventId: input.eventId,
    alimTalkTemplateId: binding.alimTalkTemplateId,
    channelPreference: [...preference],
    activeChannel,
    recipient: {
      uid: input.recipient.uid ?? null,
      phoneE164: input.recipient.phoneE164 ?? null,
      email: input.recipient.email ?? null,
    },
    variables: { ...(input.variables || {}) },
    link: input.link ?? null,
    federationSlug: input.federationSlug ?? null,
    teamId: input.teamId ?? null,
    reservationId: input.reservationId ?? null,
    status: "queued",
    attempts: 0,
    maxAttempts: OUTBOUND_RETRY_POLICY.maxAttempts,
    nextRetryAtMs: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAtMs: now,
    liveSendEnabled: false,
  };
}

export type ApplyFailureResult = {
  job: OutboundNotifyJob;
  willRetry: boolean;
  nextChannel: NotifyChannelKind | null;
};

/**
 * Apply a failed attempt: increment attempts, schedule retry or mark dead,
 * optionally advance to next fallback channel when non-retryable on current.
 */
export function applyOutboundFailure(
  job: OutboundNotifyJob,
  errorCode: string,
  errorMessage?: string,
  nowMs: number = Date.now(),
  policy: OutboundRetryPolicy = OUTBOUND_RETRY_POLICY
): ApplyFailureResult {
  const attempts = job.attempts + 1;
  const retryable = isRetryableErrorCode(errorCode, policy);
  const underMax = attempts < policy.maxAttempts;

  if (retryable && underMax) {
    const delaySec = computeRetryDelaySec(attempts, policy);
    return {
      willRetry: true,
      nextChannel: job.activeChannel,
      job: {
        ...job,
        attempts,
        status: "failed",
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage ?? null,
        nextRetryAtMs: nowMs + delaySec * 1000,
      },
    };
  }

  // Channel fallback (prep): move to next preference when current channel hard-fails
  const idx = job.channelPreference.indexOf(job.activeChannel);
  const nextChannel =
    idx >= 0 && idx < job.channelPreference.length - 1
      ? job.channelPreference[idx + 1]
      : null;

  if (nextChannel && underMax) {
    return {
      willRetry: true,
      nextChannel,
      job: {
        ...job,
        attempts,
        activeChannel: nextChannel,
        status: "queued",
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage ?? null,
        nextRetryAtMs: nowMs + policy.baseDelaySec * 1000,
      },
    };
  }

  return {
    willRetry: false,
    nextChannel: null,
    job: {
      ...job,
      attempts,
      status: "dead",
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage ?? null,
      nextRetryAtMs: null,
    },
  };
}

/** Guard used by future live senders — always false in Sprint 2-4 prep. */
export function assertLiveSendAllowed(job: OutboundNotifyJob): {
  ok: false;
  code: "LIVE_SEND_DISABLED" | "NCP_HOLD";
} {
  void job;
  return { ok: false, code: "LIVE_SEND_DISABLED" };
}
