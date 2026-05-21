/**
 * 아바타 XP 부여 (Admin SDK 전용). xpLogs 멱등 + avatars.progression 갱신.
 * 클라이언트 직접 쓰기 없음 — 트리거·Callable 내부에서만 호출.
 */

import { createHash } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { levelFromTotalXp, xpAmountForSource, type AvatarXpSource } from "./avatarXpConfig";
import { processBadgesAfterXpGrant } from "./badgeUnlockEngine";

export interface GrantAvatarXpParams {
  uid: string;
  source: AvatarXpSource;
  idempotencyKey: string;
  context?: Record<string, unknown>;
}

export interface GrantAvatarXpResult {
  ok: boolean;
  skipped?: boolean;
  noAvatar?: boolean;
  newXp?: number;
  newLevel?: number;
  error?: string;
}

function xpLogDocId(uid: string, idempotencyKey: string): string {
  const h = createHash("sha256").update(`${uid}\0${idempotencyKey}`).digest("hex").slice(0, 40);
  return `v1_${h}`;
}

function isNonEmptyUid(uid: unknown): uid is string {
  return typeof uid === "string" && uid.trim().length >= 10;
}

/**
 * 단일 트랜잭션: xpLogs 멱등 생성 + avatars progression.xp / level 갱신.
 */
export async function grantAvatarXp(
  db: Firestore,
  params: GrantAvatarXpParams,
): Promise<GrantAvatarXpResult> {
  const { source, idempotencyKey, context } = params;
  const uid = typeof params.uid === "string" ? params.uid.trim() : "";

  if (!isNonEmptyUid(uid)) {
    return { ok: false, error: "invalid_uid" };
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length > 800) {
    return { ok: false, error: "invalid_idempotency_key" };
  }

  const amount = xpAmountForSource(source);
  if (amount == null || amount <= 0) {
    return { ok: false, error: "invalid_source" };
  }

  const logRef = db.collection("xpLogs").doc(xpLogDocId(uid, idempotencyKey));
  const avatarRef = db.doc(`avatars/${uid}`);

  try {
    const out = await db.runTransaction(async (tx) => {
      const logSnap = await tx.get(logRef);
      if (logSnap.exists) {
        return { type: "skipped" as const };
      }

      const avSnap = await tx.get(avatarRef);
      if (!avSnap.exists) {
        return { type: "no_avatar" as const };
      }

      const av = avSnap.data() as Record<string, unknown>;
      const prog = (av.progression as Record<string, unknown> | undefined) || {};
      const currentXp = Math.max(0, Math.floor(Number(prog.xp ?? 0) || 0));
      const staminaRaw = prog.stamina;
      const stamina =
        typeof staminaRaw === "number" && Number.isFinite(staminaRaw)
          ? staminaRaw
          : 100;

      const newXp = currentXp + amount;
      const newLevel = levelFromTotalXp(newXp);

      tx.set(logRef, {
        schemaVersion: 1,
        uid,
        deltaXp: amount,
        channel: "activity",
        sourceKind: source,
        idempotencyKey,
        context: context && typeof context === "object" ? context : {},
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(avatarRef, {
        "progression.xp": newXp,
        "progression.level": newLevel,
        "progression.stamina": stamina,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { type: "ok" as const, newXp, newLevel };
    });

    if (out.type === "skipped") {
      logger.info("[grantAvatarXp] idempotent skip", { uid, source, idempotencyKey });
      return { ok: true, skipped: true };
    }
    if (out.type === "no_avatar") {
      logger.info("[grantAvatarXp] no_avatar_skip", {
        missing_avatar_telemetry: true,
        uid,
        source,
        idempotencyKey,
      });
      return { ok: false, noAvatar: true };
    }
    logger.info("[grantAvatarXp] granted", {
      uid,
      source,
      amount,
      newXp: out.newXp,
      newLevel: out.newLevel,
      ...(context && typeof context === "object" && typeof (context as { telemetry?: unknown }).telemetry === "string"
        ? { telemetry: (context as { telemetry: string }).telemetry }
        : {}),
    });
    try {
      await processBadgesAfterXpGrant(db, uid, source, context);
    } catch (be) {
      logger.warn("[grantAvatarXp] badge unlock failed (xp already committed)", {
        uid,
        source,
        err: be instanceof Error ? be.message : String(be),
      });
    }
    return { ok: true, newXp: out.newXp, newLevel: out.newLevel };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[grantAvatarXp] failed", { uid, source, idempotencyKey, msg });
    return { ok: false, error: msg };
  }
}
