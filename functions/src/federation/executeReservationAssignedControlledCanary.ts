import { createHash, randomUUID } from "node:crypto";
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";
import { NcpAlimTalkProvider } from "../lib/kakao/ncpAlimTalkProvider";
import {
  getNcpAlimTalkRuntimeEnv,
  NCP_ALIMTALK_SECRETS,
} from "../lib/kakao/ncpAlimTalkRuntimeConfig";
import {
  executeReservationAssignedControlledCanaryCore,
  type ControlledCanaryNotification,
  type ControlledCanaryReservationSnapshot,
  type ControlledCanaryStore,
  type ControlledCanaryTarget,
} from "./reservationAssignedControlledCanaryCore";

const REGION = "asia-northeast3";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasProviderEvidence(raw: Record<string, unknown>): boolean {
  return Boolean(
    text(raw.providerMessageId) ||
      text(raw.requestId) ||
      raw.sentAt ||
      raw.completedAt ||
      raw.providerAcceptedAt ||
      raw.canaryInvocationId
  );
}

function invocationRef(
  db: Firestore,
  federationSlug: string,
  invocationId: string
): DocumentReference {
  return db.doc(`federations/${federationSlug}/reservationAssignedCanaryInvocations/${invocationId}`);
}

function attemptRef(
  db: Firestore,
  federationSlug: string,
  invocationId: string,
  notificationId: string
): DocumentReference {
  return invocationRef(db, federationSlug, invocationId).collection("attempts").doc(notificationId);
}

function asNotification(id: string, raw: Record<string, unknown>): ControlledCanaryNotification {
  const payload =
    raw.payload && typeof raw.payload === "object"
      ? (raw.payload as Record<string, unknown>)
      : {};
  return {
    id,
    recipientPhone: text(raw.recipientPhone) || text(payload.recipientPhone),
    recipientRole: text(raw.recipientRole),
    templateKey: text(raw.templateKey),
    templateId: text(raw.alimTalkTemplateId),
    federationSlug: text(raw.federationSlug),
    reservationId: text(payload.reservationId),
    raw,
  };
}

class FirestoreReservationAssignedCanaryStore implements ControlledCanaryStore {
  constructor(private readonly db: Firestore) {}

  async reservationExists(federationSlug: string, reservationId: string): Promise<boolean> {
    const snapshot = await this.db
      .doc(`federations/${federationSlug}/venueReservations/${reservationId}`)
      .get();
    return snapshot.exists;
  }

  async readReservation(
    federationSlug: string,
    reservationId: string
  ): Promise<ControlledCanaryReservationSnapshot | null> {
    const snapshot = await this.db
      .doc(`federations/${federationSlug}/venueReservations/${reservationId}`)
      .get();
    if (!snapshot.exists) return null;
    const raw = snapshot.data() as Record<string, unknown>;
    const pricingSnapshot =
      raw.pricingSnapshot && typeof raw.pricingSnapshot === "object"
        ? (raw.pricingSnapshot as Record<string, unknown>)
        : null;
    const startTime = text(raw.startTime);
    const endTime = text(raw.endTime);
    return {
      pricingStatus: text(raw.pricingStatus),
      totalAmount: typeof raw.totalAmount === "number" ? raw.totalAmount : null,
      baseAmount: typeof raw.baseAmount === "number" ? raw.baseAmount : null,
      lightingAmount: typeof raw.lightingAmount === "number" ? raw.lightingAmount : null,
      pricingPolicyId:
        text(raw.pricingPolicyId) || text(pricingSnapshot?.policyId) || null,
      pricingPolicyVersion:
        pricingSnapshot?.policyVersion ?? pricingSnapshot?.version ?? raw.pricingPolicyVersion ?? null,
      pricingSnapshot,
      venueName: text(raw.venueName) || null,
      bookingDate: text(raw.bookingDate) || null,
      time: startTime && endTime ? `${startTime}~${endTime}` : null,
      teamName: text(raw.teamName) || text(raw.allocatedTeamName) || null,
    };
  }

  async readInvocationGuard(
    federationSlug: string,
    reservationId: string
  ): Promise<{ exists: boolean; invocationId?: string }> {
    const guardId = hash(`${federationSlug}:${reservationId}`);
    const snapshot = await this.db
      .doc(`federations/${federationSlug}/reservationAssignedCanaryGuards/${guardId}`)
      .get();
    if (!snapshot.exists) return { exists: false };
    return { exists: true, invocationId: text(snapshot.get("invocationId")) || undefined };
  }

  async findReservationNotifications(
    federationSlug: string,
    reservationId: string
  ): Promise<ControlledCanaryNotification[]> {
    const snapshot = await this.db
      .collection("notifications")
      .where("federationSlug", "==", federationSlug)
      .where("payload.reservationId", "==", reservationId)
      .get();
    return snapshot.docs.map((doc) => asNotification(doc.id, doc.data() as Record<string, unknown>));
  }

  async createInvocation(input: {
    federationSlug: string;
    reservationId: string;
    invocationId: string;
    createdBy: string;
    templateCode: string;
    targets: ControlledCanaryTarget[];
    provider: string;
  }): Promise<{ created: true } | { created: false; invocationId: string }> {
    const guardId = hash(`${input.federationSlug}:${input.reservationId}`);
    const guardRef = this.db.doc(
      `federations/${input.federationSlug}/reservationAssignedCanaryGuards/${guardId}`
    );
    const parentRef = invocationRef(this.db, input.federationSlug, input.invocationId);
    let existingInvocationId = "";
    await this.db.runTransaction(async (tx) => {
      const guard = await tx.get(guardRef);
      if (guard.exists) {
        existingInvocationId = text(guard.get("invocationId"));
        return;
      }
      const freshNotifications = await Promise.all(
        input.targets.map((target) => tx.get(this.db.collection("notifications").doc(target.id)))
      );
      if (
        freshNotifications.some((snapshot, index) => {
          if (!snapshot.exists) return true;
          const fresh = asNotification(snapshot.id, snapshot.data() as Record<string, unknown>);
          const target = input.targets[index];
          return (
            fresh.federationSlug !== input.federationSlug ||
            fresh.reservationId !== input.reservationId ||
            fresh.recipientRole !== target.role ||
            text(fresh.raw.notificationType) !== "RESERVATION_ASSIGNED" ||
            fresh.templateKey !== "RESERVATION_ASSIGNED" ||
            fresh.templateId !== "RESERVATION_APPROVED" ||
            hasProviderEvidence(fresh.raw) ||
            fresh.recipientPhone !== target.recipientPhone
          );
        })
      ) {
        throw new Error("RA_CANARY_TARGET_CHANGED_DURING_SNAPSHOT");
      }
      tx.create(guardRef, {
        invocationId: input.invocationId,
        reservationId: input.reservationId,
        state: "claimed",
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(parentRef, {
        reservationId: input.reservationId,
        notificationIds: input.targets.map((target) => target.id),
        roles: input.targets.map((target) => target.role),
        templateKey: "RESERVATION_ASSIGNED",
        templateCode: input.templateCode,
        provider: input.provider,
        createdBy: input.createdBy,
        createdAt: FieldValue.serverTimestamp(),
        state: "pending",
        maxProviderCalls: 2,
      });
      for (const target of input.targets) {
        tx.create(attemptRef(this.db, input.federationSlug, input.invocationId, target.id), {
          notificationId: target.id,
          role: target.role,
          recipientSha256: target.recipientSha256,
          requestEvidenceHash: target.requestEvidenceHash,
          provider: input.provider,
          state: "pending",
          attemptCount: 0,
          deliveryState: "not_confirmed",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
    return existingInvocationId
      ? { created: false, invocationId: existingInvocationId }
      : { created: true };
  }

  async claimAttempt(input: {
    federationSlug: string;
    invocationId: string;
    notificationId: string;
    leaseOwner: string;
    now: Date;
    leaseDurationMs: number;
  }): Promise<{ claimed: true; attemptId: string; attemptedAt: Date } | { claimed: false; state: string }> {
    const ref = attemptRef(this.db, input.federationSlug, input.invocationId, input.notificationId);
    let outcome: { claimed: true; attemptId: string; attemptedAt: Date } | { claimed: false; state: string } = {
      claimed: false,
      state: "missing",
    };
    await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const raw = snapshot.data() as Record<string, unknown>;
      const state = text(raw.state);
      if (state === "attempting") {
        const leaseExpiresAt = raw.leaseExpiresAt as { toMillis?: () => number } | undefined;
        const expiresAt =
          leaseExpiresAt && typeof leaseExpiresAt.toMillis === "function"
            ? leaseExpiresAt.toMillis()
            : 0;
        if (expiresAt <= input.now.getTime()) {
          tx.update(ref, {
            state: "unknown_outcome",
            unknownOutcomeAt: input.now,
            heldReason: "ATTEMPT_LEASE_EXPIRED",
            leaseOwner: null,
            leaseExpiresAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          outcome = { claimed: false, state: "unknown_outcome" };
          return;
        }
        outcome = { claimed: false, state: "attempting" };
        return;
      }
      if (state !== "pending") {
        outcome = { claimed: false, state };
        return;
      }
      const attemptId = randomUUID();
      tx.update(ref, {
        state: "attempting",
        attemptId,
        attemptCount: Number(raw.attemptCount || 0) + 1,
        attemptedAt: input.now,
        leaseOwner: input.leaseOwner,
        leaseExpiresAt: new Date(input.now.getTime() + input.leaseDurationMs),
        updatedAt: FieldValue.serverTimestamp(),
      });
      outcome = { claimed: true, attemptId, attemptedAt: input.now };
    });
    return outcome;
  }

  async completeAttempt(input: {
    federationSlug: string;
    invocationId: string;
    notificationId: string;
    state: "provider_accepted" | "explicit_failed";
    result: import("../lib/kakao/kakaoAlimTalkProvider").KakaoAlimTalkSendResult;
    completedAt: Date;
  }): Promise<void> {
    await attemptRef(this.db, input.federationSlug, input.invocationId, input.notificationId).update({
      state: input.state,
      providerAccepted: input.state === "provider_accepted",
      providerMessageId: input.result.providerMessageId || null,
      providerRequestId: input.result.requestId || null,
      providerResultCode: input.result.error?.code || "A000",
      completedAt: input.completedAt,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async markExpiredAttemptsUnknown(input: {
    federationSlug: string;
    invocationId: string;
    now: Date;
  }): Promise<number> {
    const parent = invocationRef(this.db, input.federationSlug, input.invocationId);
    const attempts = await parent.collection("attempts").where("state", "==", "attempting").get();
    let marked = 0;
    for (const doc of attempts.docs) {
      await this.db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists || fresh.get("state") !== "attempting") return;
        const lease = fresh.get("leaseExpiresAt") as { toMillis?: () => number } | undefined;
        if (!lease || typeof lease.toMillis !== "function" || lease.toMillis() > input.now.getTime()) return;
        tx.update(doc.ref, {
          state: "unknown_outcome",
          unknownOutcomeAt: input.now,
          heldReason: "ATTEMPT_LEASE_EXPIRED",
          leaseOwner: null,
          leaseExpiresAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        marked += 1;
      });
    }
    return marked;
  }
}

export const executeReservationAssignedControlledCanary = onCall(
  {
    region: REGION,
    timeoutSeconds: 120,
    maxInstances: 1,
    secrets: [...NCP_ALIMTALK_SECRETS],
  },
  async (request) =>
    executeReservationAssignedControlledCanaryCore(request, {
      store: new FirestoreReservationAssignedCanaryStore(getFirestore()),
      assertPlatformAdmin,
      // This is a direct, reservation-scoped NCP adapter. It never reads the
      // generic outbound queue or its global live-send gates.
      provider: new NcpAlimTalkProvider(undefined, undefined, undefined, true),
      runtimeEnv: getNcpAlimTalkRuntimeEnv(),
    })
);
