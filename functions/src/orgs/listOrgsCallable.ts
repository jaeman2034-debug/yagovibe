import * as admin from "firebase-admin";
import { FieldPath, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-northeast3";

const MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

/** Callable 응답은 JSON 직렬화 가능해야 함 — Timestamp 등 제거 */
function deepPlain(input: unknown): unknown {
  if (input instanceof Timestamp) {
    return input.toMillis();
  }
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((v) => deepPlain(v));
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = deepPlain(v);
    }
    return out;
  }
  return input;
}

function orgPayload(id: string, data: DocumentData) {
  const plain = deepPlain(data) as Record<string, unknown>;
  return { id, ...plain };
}

/**
 * 조직 목록 (Callable)
 * - 플랫폼 관리자: `orgs` 전체
 * - 그 외 로그인 사용자: `members.{uid}.role` 이 OWNER / ADMIN / MEMBER 인 문서만
 *
 * 반환 형식은 HTTP listOrgsHttp 와 동일: `{ items: [{ id, ...data }] }`
 */
export const listOrgs = onCall({ region: REGION, cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;
  const token = request.auth.token as Record<string, unknown>;

  let useFullList = false;
  try {
    await assertPlatformAdmin(uid, token);
    useFullList = true;
  } catch {
    useFullList = false;
  }

  try {
    if (useFullList) {
      const qs = await db.collection("orgs").get();
      const items = qs.docs.map((doc) => orgPayload(doc.id, doc.data()));
      logger.info("listOrgs: full list", { count: items.length, uid });
      return { items: items ?? [] };
    }

    const rolePath = new FieldPath("members", uid, "role");
    const snap = await db.collection("orgs").where(rolePath, "in", [...MEMBER_ROLES]).get();
    const items = snap.docs.map((doc) => orgPayload(doc.id, doc.data()));
    logger.info("listOrgs: membership filter", { count: items.length, uid });
    return { items: items ?? [] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("listOrgs failed", { uid, msg });
    throw new HttpsError("internal", `조직 목록 조회 실패: ${msg}`);
  }
});
