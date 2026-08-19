/**
 * Sprint 3-1 — Operations observability (read-model helpers).
 * No live send · no SoT writes · extend existing Admin / Ops Center only.
 */

import type { OpsNotificationRow, OpsReservationRow } from "@/lib/federation/opsCenterTypes";
import type { OpsProviderLog } from "@/lib/federation/opsProviderLogTypes";
import { resolveVenueOpsStage } from "@/lib/federation/venueReservationOpsStatus";
import { getBrandingSource, getAiSkipped } from "@/lib/team/resolveTeamPublicProfile";

/** Queue monitor statuses (Sprint 3-1) */
export type OpsQueueMonitorStatus =
  | "queued"
  | "processing"
  | "dry_run"
  | "succeeded"
  | "failed"
  | "retrying"
  | "dead_letter";

export const OPS_QUEUE_MONITOR_STATUSES: OpsQueueMonitorStatus[] = [
  "queued",
  "processing",
  "dry_run",
  "succeeded",
  "failed",
  "retrying",
  "dead_letter",
];

export function opsQueueMonitorLabel(s: OpsQueueMonitorStatus): string {
  switch (s) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "dry_run":
      return "Dry Run";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "retrying":
      return "Retrying";
    case "dead_letter":
      return "Dead Letter";
    default:
      return s;
  }
}

/**
 * Map existing notification row → monitor status.
 * liveSendEnabled is false globally → stub/dry-run provider rows surface as Dry Run.
 */
export function resolveOpsQueueMonitorStatus(
  row: Pick<
    OpsNotificationRow,
    "status" | "deliveryStatus" | "retryCount" | "provider" | "success" | "errorCode"
  >,
  opts?: { providerDryRun?: boolean; liveSendEnabled?: boolean }
): OpsQueueMonitorStatus {
  const live = opts?.liveSendEnabled === true;
  const failed = row.status === "sms_failed" || row.deliveryStatus === "failed";
  const delivered = row.status === "sms_sent" || row.deliveryStatus === "delivered";
  const sending = row.status === "sending" || row.deliveryStatus === "sending";
  const queued =
    row.status === "queued" ||
    row.status === "queued_sms_pending" ||
    row.deliveryStatus === "queued";

  if (row.retryCount >= 5 && failed) return "dead_letter";
  if (row.deliveryStatus === "retry" || (row.retryCount > 0 && queued && !failed)) {
    return "retrying";
  }
  if (sending) return "processing";
  if (failed) return "failed";

  // Sprint 2-4 HOLD: non-live pipeline surfaces as Dry Run (incl. stub success)
  if (!live || opts?.providerDryRun) {
    if (delivered || queued || row.success === true) return "dry_run";
    return "dry_run";
  }

  if (delivered) return "succeeded";
  if (queued) return "queued";
  return "queued";
}

export function countQueueMonitorStatuses(
  rows: OpsNotificationRow[],
  opts?: { liveSendEnabled?: boolean; dryRunLogIds?: Set<string> }
): Record<OpsQueueMonitorStatus, number> {
  const out: Record<OpsQueueMonitorStatus, number> = {
    queued: 0,
    processing: 0,
    dry_run: 0,
    succeeded: 0,
    failed: 0,
    retrying: 0,
    dead_letter: 0,
  };
  for (const row of rows) {
    const s = resolveOpsQueueMonitorStatus(row, {
      liveSendEnabled: opts?.liveSendEnabled,
      providerDryRun: opts?.dryRunLogIds?.has(row.id),
    });
    out[s] += 1;
  }
  return out;
}

export type VenueTimelineStepId =
  | "reservation_created"
  | "claim_submitted"
  | "payment_confirmed"
  | "finalized";

export type VenueTimelineStep = {
  id: VenueTimelineStepId;
  label: string;
  done: boolean;
  current: boolean;
};

/** Derive venue ops timeline from reservation 3-axis fields (no extra writes). */
export function buildVenueOpsTimelineFromReservation(
  r: Pick<OpsReservationRow, "paymentStatus" | "paymentClaimStatus" | "confirmStatus">
): VenueTimelineStep[] {
  const stage = resolveVenueOpsStage({
    paymentStatus: r.paymentStatus,
    paymentClaimStatus: r.paymentClaimStatus,
    confirmStatus: r.confirmStatus,
  });
  const claimed =
    r.paymentClaimStatus === "REQUESTED" ||
    stage === "CLAIMED" ||
    stage === "PAYMENT_CONFIRMED" ||
    stage === "FINALIZED";
  const confirmed = stage === "PAYMENT_CONFIRMED" || stage === "FINALIZED";
  const finalized = stage === "FINALIZED";

  const current: VenueTimelineStepId = finalized
    ? "finalized"
    : confirmed
      ? "payment_confirmed"
      : claimed
        ? "claim_submitted"
        : "reservation_created";

  return [
    {
      id: "reservation_created",
      label: "예약 신청/배정",
      done: true,
      current: current === "reservation_created",
    },
    {
      id: "claim_submitted",
      label: "Claim",
      done: claimed,
      current: current === "claim_submitted",
    },
    {
      id: "payment_confirmed",
      label: "Payment Confirmed",
      done: confirmed,
      current: current === "payment_confirmed",
    },
    {
      id: "finalized",
      label: "Finalized",
      done: finalized,
      current: current === "finalized",
    },
  ];
}

export type TeamCreationStepId =
  | "team_created"
  | "slug_generated"
  | "branding_started"
  | "branding_completed"
  | "public_home_ready";

export type TeamCreationTimelineStep = {
  id: TeamCreationStepId;
  label: string;
  done: boolean;
  current: boolean;
};

export type TeamObservabilityDoc = {
  id: string;
  name?: string;
  createdAt?: Date | null;
  slug?: string | null;
  slugCreatedAt?: unknown;
  logoUrl?: unknown;
  aiProfile?: unknown;
  coverImageUrl?: unknown;
  heroImage?: unknown;
};

/** Read-only team create funnel from existing team fields. */
export function buildTeamCreationTimeline(
  team: TeamObservabilityDoc
): TeamCreationTimelineStep[] {
  const hasSlug = typeof team.slug === "string" && team.slug.trim().length > 0;
  const hasAi =
    team.aiProfile != null &&
    typeof team.aiProfile === "object" &&
    !Array.isArray(team.aiProfile);
  const source = getBrandingSource(team);
  const skipped = getAiSkipped(team);
  const brandingDone = hasAi && (Boolean(source) || skipped);
  const hasCover = Boolean(
    (typeof team.coverImageUrl === "string" && team.coverImageUrl.trim()) ||
      (typeof team.heroImage === "string" && team.heroImage.trim())
  );
  const publicReady = hasSlug && (brandingDone || hasCover || Boolean(team.logoUrl));

  const steps: TeamCreationTimelineStep[] = [
    { id: "team_created", label: "Team Created", done: true, current: false },
    { id: "slug_generated", label: "Slug Generated", done: hasSlug, current: false },
    { id: "branding_started", label: "Branding Started", done: hasAi, current: false },
    { id: "branding_completed", label: "Branding Completed", done: brandingDone, current: false },
    { id: "public_home_ready", label: "Public Home Ready", done: publicReady, current: false },
  ];
  const currentIdx = steps.findIndex((s) => !s.done);
  const idx = currentIdx === -1 ? steps.length - 1 : currentIdx;
  steps[idx] = { ...steps[idx], current: true };
  return steps;
}

export type OpsObservabilityCards = {
  teamsToday: number;
  reservationsToday: number;
  dryRunNotifications: number;
  brandingSuccessRate: number | null;
  publicHomeReadyRate: number | null;
  queueCounts: Record<OpsQueueMonitorStatus, number>;
};

function isTodaySeoul(d: Date | null | undefined): boolean {
  if (!d) return false;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d) === fmt.format(new Date());
}

export function buildOpsObservabilityCards(input: {
  notifications: OpsNotificationRow[];
  reservations: OpsReservationRow[];
  teams: TeamObservabilityDoc[];
  providerLogs?: OpsProviderLog[];
  liveSendEnabled?: boolean;
}): OpsObservabilityCards {
  const dryRunLogIds = new Set(
    (input.providerLogs || []).filter((l) => l.dryRun).map((l) => l.notificationId || "").filter(Boolean)
  );
  const queueCounts = countQueueMonitorStatuses(input.notifications, {
    liveSendEnabled: input.liveSendEnabled === true,
    dryRunLogIds,
  });

  const dryRunFromLogs = (input.providerLogs || []).filter(
    (l) => l.dryRun && isTodaySeoul(l.createdAt || l.requestAt)
  ).length;
  const dryRunNotifications = Math.max(queueCounts.dry_run, dryRunFromLogs);

  const teamsToday = input.teams.filter((t) => isTodaySeoul(t.createdAt ?? null)).length;
  const reservationsToday = input.reservations.filter((r) =>
    isTodaySeoul(r.createdAt)
  ).length;

  let brandingOk = 0;
  let brandingDen = 0;
  let homeOk = 0;
  for (const t of input.teams) {
    const steps = buildTeamCreationTimeline(t);
    brandingDen += 1;
    if (steps.find((s) => s.id === "branding_completed")?.done) brandingOk += 1;
    if (steps.find((s) => s.id === "public_home_ready")?.done) homeOk += 1;
  }

  return {
    teamsToday,
    reservationsToday,
    dryRunNotifications,
    brandingSuccessRate:
      brandingDen > 0 ? Math.round((brandingOk / brandingDen) * 1000) / 10 : null,
    publicHomeReadyRate:
      input.teams.length > 0 ? Math.round((homeOk / input.teams.length) * 1000) / 10 : null,
    queueCounts,
  };
}
