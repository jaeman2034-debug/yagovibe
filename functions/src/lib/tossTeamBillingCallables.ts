import { randomBytes, createHash } from "crypto";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import {
  clearReRegisterAttributionProfileFields,
  resolveValidatedBillingReRegisterAttribution,
} from "./billingReRegisterAttribution";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = "asia-northeast3" as const;
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

function requireAuthUid(request: { auth?: { uid?: string } | null }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  return uid;
}

function requireTossSecret() {
  if (!TOSS_SECRET_KEY) {
    throw new HttpsError("failed-precondition", "TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }
}

async function ensureActiveTeamMember(teamId: string, uid: string) {
  const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || memberSnap.data()?.status !== "active") {
    throw new HttpsError("permission-denied", "팀 활성 멤버만 이용할 수 있습니다.");
  }
}

function newCustomerKey(uid: string): string {
  const rand = randomBytes(24).toString("hex");
  const h = createHash("sha256").update(`${uid}:${rand}`, "utf8").digest("hex").slice(0, 24);
  return `yago_${h}`;
}

type TossBillingIssueResponse = {
  billingKey?: string;
  card?: { issuerCode?: string; number?: string; cardType?: string };
  cardCompany?: string;
  cardNumber?: string;
  method?: string;
};

/**
 * 자동결제 카드 등록 전: customerKey 발급 + 프로필(pending) 기록.
 * 클라이언트는 Toss 위젯/리다이렉트에 이 customerKey를 사용한다.
 */
export const tossTeamBillingPrepare = onCall({ region: REGION, cors: true, timeoutSeconds: 30 }, async (request) => {
  const uid = requireAuthUid(request);
  const teamId = String(request.data?.teamId || "");
  const origin = String(request.data?.origin || "").replace(/\/$/, "");
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
  if (!origin || !/^https?:\/\//i.test(origin)) {
    throw new HttpsError("invalid-argument", "origin(http(s)://…)이 필요합니다.");
  }

  await ensureActiveTeamMember(teamId, uid);

  const customerKey = newCustomerKey(uid);
  const successUrl = `${origin}/team/${encodeURIComponent(teamId)}/billing/success`;
  const failUrl = `${origin}/team/${encodeURIComponent(teamId)}/billing/fail`;
  const profileRef = db.doc(`teams/${teamId}/billingProfiles/${uid}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await profileRef.set(
    {
      uid,
      teamId,
      customerKey,
      billingMethod: "toss_card",
      status: "pending_registration",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  logger.info("[tossTeamBillingPrepare]", { teamId, uid });
  return { customerKey, teamId, successUrl, failUrl };
});

/**
 * 카드 인증 후 authKey 로 빌링키 발급 — billingSecrets 에만 원문 저장, 프로필에는 마스킹 메타만.
 */
export const tossTeamBillingConfirm = onCall({ region: REGION, cors: true, timeoutSeconds: 60 }, async (request) => {
  const uid = requireAuthUid(request);
  const teamId = String(request.data?.teamId || "");
  const authKey = String(request.data?.authKey || "");
  const customerKey = String(request.data?.customerKey || "");
  const feeAttributionNotificationId = request.data?.feeAttributionNotificationId;

  if (!teamId || !authKey || !customerKey) {
    throw new HttpsError("invalid-argument", "teamId, authKey, customerKey가 필요합니다.");
  }

  await ensureActiveTeamMember(teamId, uid);

  const profileRef = db.doc(`teams/${teamId}/billingProfiles/${uid}`);
  const profileSnap = await profileRef.get();
  const prev = profileSnap.data() || {};
  if (String(prev.customerKey || "") !== customerKey) {
    throw new HttpsError("failed-precondition", "customerKey가 일치하지 않습니다. 등록을 다시 시작하세요.");
  }

  requireTossSecret();

  const res = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authKey, customerKey }),
  });

  const text = await res.text();
  const json = (text ? JSON.parse(text) : {}) as TossBillingIssueResponse & {
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    logger.error("[tossTeamBillingConfirm] Toss 실패", { status: res.status, code: json.code, message: json.message });
    throw new HttpsError("internal", json.message || "빌링키 발급에 실패했습니다.", { code: json.code });
  }

  const billingKey = String(json.billingKey || "");
  if (!billingKey) {
    throw new HttpsError("internal", "빌링키가 응답에 없습니다.");
  }

  const cardNumber = json.card?.number || json.cardNumber || "";
  const masked = cardNumber ? cardNumber.replace(/\s/g, "").slice(-6) : undefined;

  const secretRef = db.doc(`teams/${teamId}/billingSecrets/${uid}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await secretRef.set(
    {
      uid,
      teamId,
      customerKey,
      billingKey,
      updatedAt: now,
    },
    { merge: true }
  );

  await profileRef.set(
    {
      uid,
      teamId,
      customerKey,
      billingKeyMasked: masked ? `****${masked}` : null,
      cardIssuerCode: json.card?.issuerCode || null,
      billingMethod: "toss_card",
      status: "active",
      agreedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const validatedAttr = await resolveValidatedBillingReRegisterAttribution(
    db,
    uid,
    teamId,
    feeAttributionNotificationId
  );
  if (typeof feeAttributionNotificationId === "string" && feeAttributionNotificationId.trim()) {
    if (validatedAttr) {
      await profileRef.set(
        {
          reRegisterAttributionExperiment: validatedAttr.experiment,
          reRegisterAttributionVariant: validatedAttr.variant,
          reRegisterAttributionNotificationId: validatedAttr.attributionNotificationId,
          updatedAt: now,
        },
        { merge: true }
      );
    } else {
      await profileRef.set(clearReRegisterAttributionProfileFields(), { merge: true });
    }
  }

  logger.info("[tossTeamBillingConfirm] ok", { teamId, uid });
  return { ok: true, billingKeyMasked: masked ? `****${masked}` : null };
});

/** 자동결제 수단 해지 — 빌링키는 Toss API로 무효화 시도 후 로컬 삭제 */
export const tossTeamBillingRevoke = onCall({ region: REGION, cors: true, timeoutSeconds: 30 }, async (request) => {
  const uid = requireAuthUid(request);
  const teamId = String(request.data?.teamId || "");
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  await ensureActiveTeamMember(teamId, uid);

  const secretRef = db.doc(`teams/${teamId}/billingSecrets/${uid}`);
  const secretSnap = await secretRef.get();
  const billingKey = secretSnap.exists ? String(secretSnap.data()?.billingKey || "") : "";

  if (billingKey) {
    requireTossSecret();
    const res = await fetch(`https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
      },
    });
    if (!res.ok) {
      const t = await res.text();
      logger.warn("[tossTeamBillingRevoke] Toss DELETE 비정상", { status: res.status, body: t.slice(0, 500) });
    }
  }

  await secretRef.delete().catch(() => {});

  const profileRef = db.doc(`teams/${teamId}/billingProfiles/${uid}`);
  await profileRef.set(
    {
      status: "revoked",
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reRegisterAttributionExperiment: admin.firestore.FieldValue.delete(),
      reRegisterAttributionVariant: admin.firestore.FieldValue.delete(),
      reRegisterAttributionNotificationId: admin.firestore.FieldValue.delete(),
    },
    { merge: true }
  );

  return { ok: true };
});
