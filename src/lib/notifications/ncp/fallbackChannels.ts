/**
 * Sprint 2-4 PREP — SMS / Email fallback interfaces (no live send).
 * Real SENS / SMTP = HOLD.
 */

import type { NotifyChannelKind } from "@/lib/notifications/ncp/templateIdMap";
import type { OutboundNotifyJob } from "@/lib/notifications/ncp/outboundQueueContract";

export type FallbackSendResult = {
  channel: NotifyChannelKind;
  dryRun: true;
  ok: boolean;
  skipped: boolean;
  errorCode?: string;
  errorMessage?: string;
  /** Preview body for ops/debug — never transmitted in prep */
  previewBody?: string;
};

export interface NotifyFallbackChannel {
  readonly channel: NotifyChannelKind;
  /** Always dry-run in Sprint 2-4 */
  sendDryRun(job: OutboundNotifyJob): Promise<FallbackSendResult>;
}

function previewFromJob(job: OutboundNotifyJob): string {
  const vars = job.variables;
  const bits = [
    `[dry-run ${job.eventId}]`,
    vars.team ? `team=${vars.team}` : "",
    vars.venue ? `venue=${vars.venue}` : "",
    vars.reservationNo ? `code=${vars.reservationNo}` : "",
    job.link ? `link=${job.link}` : "",
  ].filter(Boolean);
  return bits.join(" · ");
}

export class SmsFallbackChannelStub implements NotifyFallbackChannel {
  readonly channel: NotifyChannelKind = "sms";

  async sendDryRun(job: OutboundNotifyJob): Promise<FallbackSendResult> {
    const phone = String(job.recipient.phoneE164 || "").replace(/\D/g, "");
    if (!phone) {
      return {
        channel: "sms",
        dryRun: true,
        ok: false,
        skipped: true,
        errorCode: "INVALID_PHONE",
        errorMessage: "SMS dry-run skipped — no phone",
      };
    }
    return {
      channel: "sms",
      dryRun: true,
      ok: true,
      skipped: false,
      previewBody: previewFromJob(job),
      errorCode: "SENS_NOT_CONFIGURED",
      errorMessage: "NCP SENS live send HOLD — dry-run only",
    };
  }
}

export class EmailFallbackChannelStub implements NotifyFallbackChannel {
  readonly channel: NotifyChannelKind = "email";

  async sendDryRun(job: OutboundNotifyJob): Promise<FallbackSendResult> {
    const email = String(job.recipient.email || "").trim();
    if (!email || !email.includes("@")) {
      return {
        channel: "email",
        dryRun: true,
        ok: false,
        skipped: true,
        errorCode: "INVALID_EMAIL",
        errorMessage: "Email dry-run skipped — no email",
      };
    }
    return {
      channel: "email",
      dryRun: true,
      ok: true,
      skipped: false,
      previewBody: previewFromJob(job),
      errorCode: "NCP_HOLD",
      errorMessage: "Email provider HOLD — dry-run only",
    };
  }
}

export class AppFallbackChannelStub implements NotifyFallbackChannel {
  readonly channel: NotifyChannelKind = "app";

  async sendDryRun(job: OutboundNotifyJob): Promise<FallbackSendResult> {
    if (!job.recipient.uid) {
      return {
        channel: "app",
        dryRun: true,
        ok: false,
        skipped: true,
        errorCode: "INVALID_PHONE",
        errorMessage: "App dry-run skipped — no uid (reuse code for missing recipient)",
      };
    }
    return {
      channel: "app",
      dryRun: true,
      ok: true,
      skipped: false,
      previewBody: previewFromJob(job),
    };
  }
}

/** Run dry-run for the job's active channel (prep harness). */
export async function dryRunActiveFallback(
  job: OutboundNotifyJob
): Promise<FallbackSendResult> {
  const channel =
    job.activeChannel === "sms"
      ? new SmsFallbackChannelStub()
      : job.activeChannel === "email"
        ? new EmailFallbackChannelStub()
        : job.activeChannel === "app"
          ? new AppFallbackChannelStub()
          : new SmsFallbackChannelStub(); // kakao_alimtalk → treat as SMS stub path for prep harness

  if (job.activeChannel === "kakao_alimtalk") {
    return {
      channel: "kakao_alimtalk",
      dryRun: true,
      ok: true,
      skipped: false,
      previewBody: previewFromJob(job),
      errorCode: "LIVE_SEND_DISABLED",
      errorMessage: "Kakao/NCP Alimtalk live send HOLD — dry-run only",
    };
  }

  return channel.sendDryRun(job);
}
