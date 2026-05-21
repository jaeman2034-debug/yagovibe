import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertPlatformAdmin } from "../lib/assertPlatformAdmin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-northeast3";

const MAX_NAME_LEN = 120;

type CreateOrgRequest = { name?: string };

/**
 * 플랫폼 관리자 전용: `orgs/{orgId}` 생성 + 생성자 OWNER 멤버십
 */
export const createOrg = onCall({ region: REGION, cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = request.auth.uid;
  await assertPlatformAdmin(uid, request.auth.token as Record<string, unknown>);

  const raw = (request.data as CreateOrgRequest)?.name;
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) {
    throw new HttpsError("invalid-argument", "조직 이름(name)이 필요합니다.");
  }
  if (name.length > MAX_NAME_LEN) {
    throw new HttpsError("invalid-argument", `조직 이름은 ${MAX_NAME_LEN}자 이하여야 합니다.`);
  }

  const orgRef = db.collection("orgs").doc();
  const orgId = orgRef.id;

  const payload = {
    id: orgId,
    name,
    ownerUid: uid,
    planId: "free",
    members: {
      [uid]: {
        role: "OWNER",
        joinedAt: FieldValue.serverTimestamp(),
      },
    },
    billing: {
      status: "trial",
      plan: "free",
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await orgRef.set(payload);
  logger.info("createOrg: created", { orgId, uid, name });

  return { orgId };
});
