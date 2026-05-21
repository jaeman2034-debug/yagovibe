/**
 * Stripe Checkout(구독) 세션 생성 — 팀 대표(ownerUid)만 호출 가능.
 *
 * 키: `STRIPE_SECRET_KEY_V2`(Secret Manager, 웹훅과 동일) — 로컬은 `functions/.env`의 `STRIPE_SECRET_KEY` 폴백.
 * 기타: APP_URL, STRIPE_PRICE_BASIC / STRIPE_PRICE_PRO
 */
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import { resolvePlanFromStripePriceId } from "../lib/teamPlan";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STRIPE_SECRET_KEY_V2 = defineSecret("STRIPE_SECRET_KEY_V2");

const ERROR_LOG_RAW_MAX = 4000;

/** Stripe/Firestore 등 unknown 에러를 로그에 남길 때 (비밀 값은 넣지 말 것) */
function serializeErrorForLog(err: unknown): string {
  if (err == null) return String(err);
  if (typeof err !== "object") return String(err);
  try {
    const keys = Object.getOwnPropertyNames(err);
    const raw = JSON.stringify(err, keys);
    return raw.length > ERROR_LOG_RAW_MAX
      ? `${raw.slice(0, ERROR_LOG_RAW_MAX)}…[truncated]`
      : raw;
  } catch {
    try {
      return String(err);
    } catch {
      return "[unserializable]";
    }
  }
}

function logCheckoutFailure(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : undefined;
  const stack = err instanceof Error ? err.stack : undefined;
  const raw = serializeErrorForLog(err);
  logger.error(`[createCheckoutSession] ${scope}`, { message, name, stack, raw, ...extra });
}

function getStripe(): Stripe {
  const rawV2 = String(STRIPE_SECRET_KEY_V2.value() || "").trim();
  const rawEnv = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const isLooksLikeStripeKey = (v: string) => /^sk_(test|live)_[A-Za-z0-9]+$/.test(v);
  const v2Valid = isLooksLikeStripeKey(rawV2);
  const envValid = isLooksLikeStripeKey(rawEnv);
  const key = v2Valid ? rawV2 : envValid ? rawEnv : rawV2 || rawEnv || "";
  if (!key) {
    throw new HttpsError(
      "failed-precondition",
      "결제(Stripe)가 아직 설정되지 않았습니다. Secret `STRIPE_SECRET_KEY_V2` 또는 `STRIPE_SECRET_KEY`를 확인해 주세요."
    );
  }
  if (!v2Valid && rawV2) {
    logger.error("[createCheckoutSession] invalid STRIPE_SECRET_KEY_V2 format", {
      length: rawV2.length,
      hasCR: rawV2.includes("\r"),
      hasLF: rawV2.includes("\n"),
      hasSpace: rawV2.includes(" "),
      startsWithSk: rawV2.startsWith("sk_"),
    });
  }
  // defineSecret 은 process.env.STRIPE_SECRET_KEY_V2 가 아니라 .value() 로만 주입됨 — `!!process.env.STRIPE_SECRET_KEY_V2` 는 오해 소지
  logger.info("[createCheckoutSession] stripe init (no secrets logged)", {
    stripeKeyFrom: v2Valid
      ? "STRIPE_SECRET_KEY_V2"
      : envValid
        ? "STRIPE_SECRET_KEY_env"
        : rawV2
          ? "STRIPE_SECRET_KEY_V2_invalid"
          : rawEnv
            ? "STRIPE_SECRET_KEY_env_invalid"
            : "none",
    keyMode: key.startsWith("sk_live") ? "live" : key.startsWith("sk_test") ? "test" : "unknown",
  });
  if (!isLooksLikeStripeKey(key)) {
    throw new HttpsError(
      "failed-precondition",
      "Stripe Secret Key 형식이 올바르지 않습니다. Secret 값을 다시 확인해 주세요."
    );
  }
  return new Stripe(key, {
    typescript: true,
    // 연결 지연·TLS 이슈 시 기본보다 명확히 구분 (Stripe SDK 가 "connection" 으로 묶는 경우 완화)
    timeout: 30_000,
    maxNetworkRetries: 2,
  });
}

function toHttpsFromStripeContext(context: string, e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  const code =
    e && typeof e === "object" && "code" in e
      ? String((e as { code?: string }).code || "")
      : "";
  const type =
    e && typeof e === "object" && "type" in e
      ? String((e as { type?: string }).type || "")
      : "";
  logCheckoutFailure(`${context} (Stripe/context)`, e, { type, code });
  throw new HttpsError("failed-precondition", `${context}: ${msg}`);
}

export const createCheckoutSession = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 60, secrets: [STRIPE_SECRET_KEY_V2] },
  async (request) => {
    try {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const rawTier = String(request.data?.tier || "").trim().toLowerCase();
    const tierInput = rawTier === "basic" || rawTier === "pro" ? rawTier : "";
    const requestedPriceId = String(request.data?.priceId || "").trim();
    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }
    if (teamId.includes("/") || teamId.includes("\\")) {
      throw new HttpsError("invalid-argument", "유효하지 않은 teamId입니다.");
    }
    const tier = tierInput || (!requestedPriceId ? "pro" : "");

    const resolvedPriceId =
      requestedPriceId ||
      (tier === "basic"
        ? String(process.env.STRIPE_PRICE_BASIC || "").trim()
        : tier === "pro"
          ? String(process.env.STRIPE_PRICE_PRO || "").trim()
          : "");
    if (!resolvedPriceId) {
      throw new HttpsError(
        "failed-precondition",
        "Stripe 가격이 설정되지 않았습니다. 요청에 priceId를 넣거나 STRIPE_PRICE_BASIC/PRO(Functions env)를 설정해 주세요."
      );
    }

    // 배포 리비전/런타임 env 확인용 (price id 는 공개 id)
    const envPro = String(process.env.STRIPE_PRICE_PRO || "").trim();
    const envAppUrl = String(process.env.APP_URL || "").trim();
    logger.info("[createCheckoutSession] price + env snapshot", {
      teamId,
      tier,
      clientPriceId: requestedPriceId || null,
      envStripePricePro: envPro || null,
      envStripePriceProEmpty: !envPro,
      resolvedPriceId,
      appUrlSet: Boolean(envAppUrl),
    });

    if (!resolvePlanFromStripePriceId(resolvedPriceId)) {
      throw new HttpsError(
        "invalid-argument",
        "지원하지 않는 요금제입니다. Stripe price id와 STRIPE_PRICE_* 환경변수를 확인해 주세요."
      );
    }

    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }
    const team = teamSnap.data() as Record<string, unknown>;
    const ownerUid = String(team.ownerUid || "").trim();
    if (!ownerUid || ownerUid !== uid) {
      throw new HttpsError("permission-denied", "팀 대표만 플랜 결제를 진행할 수 있습니다.");
    }

    const stripe = getStripe();
    let customerId = typeof team.stripeCustomerId === "string" ? team.stripeCustomerId.trim() : "";
    if (!customerId) {
      const email =
        typeof request.auth.token.email === "string" && request.auth.token.email
          ? request.auth.token.email
          : undefined;
      try {
        const customer = await stripe.customers.create({
          metadata: { teamId, firebaseUid: uid },
          email,
        });
        customerId = customer.id;
      } catch (e) {
        toHttpsFromStripeContext("Stripe Customer 생성(API: customers.create)", e);
      }
      try {
        await teamRef.set(
          { stripeCustomerId: customerId, ...teamDocumentActivityPatch() },
          { merge: true }
        );
      } catch (e) {
        toHttpsFromStripeContext("Firestore 팀 문서에 stripeCustomerId 저장", e);
      }
    }

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
    if (!appUrl) {
      throw new HttpsError("failed-precondition", "APP_URL이 설정되지 않았습니다.");
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        // Stripe가 `{CHECKOUT_SESSION_ID}` 치환 — 웹훅 전에도 세션 검증·분석에 사용 가능
        success_url: `${appUrl}/billing/success?teamId=${encodeURIComponent(teamId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/team/${encodeURIComponent(teamId)}?tab=home&billing=cancel`,
        metadata: { teamId, firebaseUid: uid, userId: uid },
        subscription_data: {
          metadata: { teamId, firebaseUid: uid, userId: uid },
        },
        client_reference_id: teamId,
        allow_promotion_codes: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code || "")
          : "";
      const type =
        e && typeof e === "object" && "type" in e
          ? String((e as { type?: string }).type || "")
          : "";
      logCheckoutFailure("stripe.checkout.sessions.create", e, {
        teamId,
        resolvedPriceId,
        type,
        code,
      });
      // 클라이언트는 INTERNAL(500)만 보이면 원인 추적이 불가 — Stripe 메시지는 그대로 전달
      throw new HttpsError("failed-precondition", `Stripe Checkout: ${msg}`);
    }

    if (!session.url) {
      throw new HttpsError("failed-precondition", "Checkout URL을 받지 못했습니다.");
    }

    return { url: session.url };
    } catch (e: unknown) {
      if (e instanceof HttpsError) {
        throw e;
      }
      logCheckoutFailure("unhandled", e);
      throw new HttpsError(
        "failed-precondition",
        e instanceof Error ? e.message : "결제 세션 생성 중 오류가 발생했습니다."
      );
    }
  }
);
