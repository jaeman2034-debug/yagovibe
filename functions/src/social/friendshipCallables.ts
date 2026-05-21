/**
 * PR-8A — 친구 관계 Callable (Admin 쓰기). 클라는 friendships 직접 쓰기 불가.
 * @see docs/architecture/pr-8-social-seed.md
 *
 * 보안: friendshipId·users[]는 항상 서버에서 canonical 재계산. 클라 입력은 신뢰하지 않음.
 * 열거 방지: 동일한 사용자 대면 메시지로 실패 이유를 세분화하지 않음(로그에만 상세 코드).
 */

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { ensureFirebaseAdminApp } from "../lib/ensureFirebaseAdminApp";

ensureFirebaseAdminApp();
const db = getFirestore();

const REGION = "asia-northeast3";
const SCHEMA_VERSION = 1;

/** 클라/사용자 노출용 — 원인별 문구 분리 금지(열거·프로빙 완화) */
const MSG_FRIENDSHIP_GENERIC = "요청을 처리할 수 없습니다.";
const MSG_ACTION_DENIED = "이 작업을 수행할 수 없습니다.";

function sortedPair(a: string, b: string): [string, string] {
  const x = a.trim();
  const y = b.trim();
  return x < y ? [x, y] : [y, x];
}

function friendshipDocId(uidA: string, uidB: string): string {
  const [u1, u2] = sortedPair(uidA, uidB);
  return `${u1}_${u2}`;
}

function isLikelyUid(s: string): boolean {
  const t = s.trim();
  return t.length >= 10 && t.length <= 128 && t !== "";
}

/** 문서의 users가 (uidA, uidB) 쌍의 canonical 정렬과 일치하는지 */
function assertUsersCanonical(
  d: Record<string, unknown>,
  uidA: string,
  uidB: string,
  logKey: string,
  logFields: Record<string, unknown>,
): void {
  const expected = sortedPair(uidA, uidB);
  const u = d.users;
  if (!Array.isArray(u) || u.length !== 2 || u[0] !== expected[0] || u[1] !== expected[1]) {
    logger.warn(`[friendship] ${logKey}_users_mismatch`, { ...logFields, expected, got: u });
    throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
  }
}

export type RequestFriendshipResponse = {
  ok: boolean;
  status?: "pending_created" | "pending_existing" | "accepted_already" | "pending_incoming_use_accept";
  reason?: string;
};

/**
 * 내가 targetUid에게 친구 요청. 이미 accepted면 idempotent 성공.
 * pending이고 내가 수신자면 acceptFriendship 사용 유도.
 * 모든 분기는 runTransaction으로 직렬화(동시 A↔B 요청 경합 완화).
 */
export const requestFriendship = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<RequestFriendshipResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (request.data as { targetUid?: unknown })?.targetUid;
    const targetUid = typeof raw === "string" ? raw.trim() : "";
    if (!isLikelyUid(targetUid)) {
      throw new HttpsError("invalid-argument", "targetUid가 올바르지 않습니다.");
    }
    if (targetUid === uid) {
      throw new HttpsError("invalid-argument", "자기 자신에게 친구 요청할 수 없습니다.");
    }

    const fid = friendshipDocId(uid, targetUid);
    const ref = db.doc(`friendships/${fid}`);
    const users = sortedPair(uid, targetUid);

    try {
      const out = await db.runTransaction(async (tx) => {
        if (ref.id !== fid) {
          logger.error("[requestFriendship] ref_id_mismatch", { refId: ref.id, fid });
          throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
        }

        const snap = await tx.get(ref);
        if (!snap.exists) {
          const targetProfile = await tx.get(db.doc(`users/${targetUid}`));
          if (!targetProfile.exists) {
            logger.warn("[requestFriendship] peer_missing", { uid, targetUid });
            throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
          }
          tx.set(ref, {
            schemaVersion: SCHEMA_VERSION,
            users,
            requesterUid: uid,
            addresseeUid: targetUid,
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          return { type: "pending_created" as const };
        }

        const d = snap.data() as Record<string, unknown>;
        assertUsersCanonical(d, uid, targetUid, "requestFriendship", { uid, targetUid, fid });

        const status = String(d.status ?? "");
        if (status === "accepted") {
          return { type: "accepted_already" as const };
        }
        if (status === "blocked") {
          logger.info("[requestFriendship] blocked_short_circuit", { uid, targetUid });
          return { type: "blocked" as const };
        }
        if (status === "pending") {
          if (d.requesterUid === uid) {
            return { type: "pending_existing" as const };
          }
          if (d.addresseeUid === uid) {
            return { type: "pending_incoming_use_accept" as const };
          }
        }
        logger.warn("[requestFriendship] invalid_state", { uid, targetUid, status, fid });
        return { type: "invalid_state" as const };
      });

      if (out.type === "blocked") {
        return { ok: false, reason: "friendship_blocked" };
      }
      if (out.type === "pending_incoming_use_accept") {
        return { ok: false, status: "pending_incoming_use_accept", reason: "use_accept" };
      }
      if (out.type === "invalid_state") {
        throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
      }

      logger.info("[requestFriendship]", { uid, targetUid, result: out.type });
      return {
        ok: true,
        status:
          out.type === "pending_created"
            ? "pending_created"
            : out.type === "pending_existing"
              ? "pending_existing"
              : "accepted_already",
      };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[requestFriendship] failed", { uid, targetUid, err: String(e) });
      throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
    }
  },
);

export type AcceptFriendshipResponse = { ok: boolean; reason?: string };

/** pending만 — addressee만 수락. 트랜잭션으로 상태 경합 방지 */
export const acceptFriendship = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<AcceptFriendshipResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (request.data as { otherUid?: unknown })?.otherUid;
    const otherUid = typeof raw === "string" ? raw.trim() : "";
    if (!isLikelyUid(otherUid)) {
      throw new HttpsError("invalid-argument", "otherUid가 올바르지 않습니다.");
    }
    if (otherUid === uid) {
      throw new HttpsError("invalid-argument", "자기 자신을 수락할 수 없습니다.");
    }

    const fid = friendshipDocId(uid, otherUid);
    const ref = db.doc(`friendships/${fid}`);

    try {
      await db.runTransaction(async (tx) => {
        if (ref.id !== fid) {
          logger.error("[acceptFriendship] ref_id_mismatch", { refId: ref.id, fid });
          throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
        }

        const snap = await tx.get(ref);
        if (!snap.exists) {
          logger.info("[acceptFriendship] no_doc", { uid, otherUid });
          throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
        }
        const d = snap.data() as Record<string, unknown>;
        assertUsersCanonical(d, uid, otherUid, "acceptFriendship", { uid, otherUid, fid });

        const inviter = await tx.get(db.doc(`users/${otherUid}`));
        if (!inviter.exists) {
          logger.warn("[acceptFriendship] peer_inviter_missing", { uid, otherUid });
          throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
        }

        if (d.status !== "pending") {
          logger.info("[acceptFriendship] not_pending", { uid, otherUid, status: d.status });
          throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
        }
        if (d.addresseeUid !== uid) {
          logger.info("[acceptFriendship] not_addressee", { uid, otherUid });
          throw new HttpsError("permission-denied", MSG_ACTION_DENIED);
        }
        if (d.requesterUid !== otherUid) {
          logger.warn("[acceptFriendship] requester_mismatch", { uid, otherUid, requesterUid: d.requesterUid });
          throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
        }
        tx.update(ref, {
          status: "accepted",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info("[acceptFriendship]", { uid, otherUid });
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[acceptFriendship] failed", { uid, otherUid, err: String(e) });
      throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
    }
  },
);

export type BlockFriendshipResponse = { ok: boolean; reason?: string };

/** pending | accepted → blocked, 또는 문서 없음 → blocked 생성 (터미널). blocked→* 금지 */
export const blockFriendship = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request): Promise<BlockFriendshipResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const raw = (request.data as { otherUid?: unknown })?.otherUid;
    const otherUid = typeof raw === "string" ? raw.trim() : "";
    if (!isLikelyUid(otherUid)) {
      throw new HttpsError("invalid-argument", "otherUid가 올바르지 않습니다.");
    }
    if (otherUid === uid) {
      throw new HttpsError("invalid-argument", "자기 자신을 차단할 수 없습니다.");
    }

    const fid = friendshipDocId(uid, otherUid);
    const ref = db.doc(`friendships/${fid}`);
    const users = sortedPair(uid, otherUid);

    try {
      await db.runTransaction(async (tx) => {
        if (ref.id !== fid) {
          logger.error("[blockFriendship] ref_id_mismatch", { refId: ref.id, fid });
          throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
        }

        const snap = await tx.get(ref);
        if (!snap.exists) {
          const peer = await tx.get(db.doc(`users/${otherUid}`));
          if (!peer.exists) {
            logger.warn("[blockFriendship] peer_missing_on_create", { uid, otherUid });
            throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
          }
          tx.set(ref, {
            schemaVersion: SCHEMA_VERSION,
            users,
            requesterUid: uid,
            addresseeUid: otherUid,
            status: "blocked",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        const d = snap.data() as Record<string, unknown>;
        assertUsersCanonical(d, uid, otherUid, "blockFriendship", { uid, otherUid, fid });

        if (d.status === "blocked") {
          return;
        }
        if (d.status !== "pending" && d.status !== "accepted") {
          logger.warn("[blockFriendship] bad_status", { uid, otherUid, status: d.status });
          throw new HttpsError("failed-precondition", MSG_FRIENDSHIP_GENERIC);
        }
        tx.update(ref, {
          status: "blocked",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info("[blockFriendship]", { uid, otherUid });
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[blockFriendship] failed", { uid, otherUid, err: String(e) });
      throw new HttpsError("internal", MSG_FRIENDSHIP_GENERIC);
    }
  },
);

export type PreviewFriendInviteResult = {
  ok: boolean;
  displayName?: string;
  photoUrl?: string | null;
};

/**
 * 비로그인 친구 초대 랜딩용 — displayName·공개 프로필 사진만 (PII 최소화).
 */
export const previewFriendInvite = onCall(
  {
    region: REGION,
    cors: true,
    maxInstances: 20,
    invoker: "public",
  },
  async (request): Promise<PreviewFriendInviteResult> => {
    const raw = (request.data as { inviterUid?: unknown })?.inviterUid;
    const inviterUid = typeof raw === "string" ? raw.trim() : "";
    if (!isLikelyUid(inviterUid)) {
      return { ok: false };
    }
    try {
      const userSnap = await db.doc(`users/${inviterUid}`).get();
      if (!userSnap.exists) {
        return { ok: false };
      }
      const ud = userSnap.data() as Record<string, unknown>;
      let displayName = "";
      const avSnap = await db.doc(`avatars/${inviterUid}`).get();
      if (avSnap.exists) {
        const ad = avSnap.data() as Record<string, unknown>;
        displayName = String(ad.displayName ?? "").trim();
      }
      if (!displayName) {
        displayName = String(ud.displayName ?? ud.name ?? "").trim();
      }
      if (!displayName) displayName = "YAGO 사용자";
      const photoUrl =
        typeof ud.photoURL === "string"
          ? ud.photoURL
          : typeof ud.photoUrl === "string"
            ? ud.photoUrl
            : null;
      return { ok: true, displayName, photoUrl };
    } catch (e) {
      logger.warn("[previewFriendInvite] error", { inviterUid, err: String(e) });
      return { ok: false };
    }
  },
);
