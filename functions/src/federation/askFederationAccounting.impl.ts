/**
 * 협회 매니저 전용 — 동일 집계·샘플 범위에서 자연어 질의 응답 (OpenAI)
 */

import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";

import type {
  AccountingComparisonStatsWire,
  AccountingSignalsWire,
  AccountingSummaryStatsWire,
  AccountingSummaryTxWire,
} from "./federationAccountingSignals.types";

function isFederationManagerDoc(doc: Record<string, unknown> | undefined, uid: string): boolean {
  if (!doc || !uid) return false;
  const ownerUid = String(doc.ownerUid || doc.ownerId || "");
  if (ownerUid && ownerUid === uid) return true;
  const adminIds = Array.isArray(doc.adminIds) ? doc.adminIds : [];
  const adminUids = Array.isArray(doc.adminUids) ? doc.adminUids : [];
  const roles = doc.roles as Record<string, unknown> | undefined;
  const roleAdmins = Array.isArray(roles?.admins) ? (roles.admins as unknown[]) : [];
  const roleEditors = Array.isArray(roles?.editors) ? (roles.editors as unknown[]) : [];
  return [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors].includes(uid);
}

type RequestData = {
  federationSlug: string;
  filterContext: string;
  question: string;
  stats: AccountingSummaryStatsWire;
  transactions: AccountingSummaryTxWire[];
  comparison?: AccountingComparisonStatsWire | null;
  signals?: AccountingSignalsWire | null;
};

const MAX_QUESTION = 400;

export async function handleAskFederationAccounting(req: {
  data: RequestData;
  auth?: { uid?: string };
}): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug is required");

  const question = String(req.data?.question || "").trim();
  if (!question) throw new HttpsError("invalid-argument", "질문을 입력해 주세요.");
  if (question.length > MAX_QUESTION) {
    throw new HttpsError("invalid-argument", `질문은 ${MAX_QUESTION}자 이하로 입력해 주세요.`);
  }

  const stats = req.data?.stats;
  if (!stats || typeof stats !== "object") throw new HttpsError("invalid-argument", "stats가 필요합니다.");

  const transactions = Array.isArray(req.data?.transactions) ? req.data.transactions : [];
  if (transactions.length > 280) {
    throw new HttpsError("invalid-argument", "transactions 항목이 너무 많습니다.");
  }

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 사용할 수 있습니다.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OpenAI API 키(OPENAI_API_KEY)가 설정되지 않았습니다." };
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const filterContext = String(req.data?.filterContext || "").trim() || "(필터 정보 없음)";
  const comparison = req.data?.comparison as AccountingComparisonStatsWire | null | undefined;
  const signals = req.data?.signals as AccountingSignalsWire | null | undefined;

  const userContentParts = [
    `필터 맥락: ${filterContext}`,
    "",
    "사용자 질문:",
    question,
    "",
    "확정 집계(화면과 동일, 우선 신뢰):",
    JSON.stringify(stats),
  ];

  if (signals && typeof signals === "object") {
    userContentParts.push("", "데이터 기반 신호(클라이언트 산출, 모델은 이를 우선 반영):", JSON.stringify(signals));
  }

  if (comparison && typeof comparison.label === "string") {
    userContentParts.push(
      "",
      `비교 기간 집계: ${comparison.label}`,
      JSON.stringify({
        income: comparison.income,
        expense: comparison.expense,
        balance: comparison.balance,
        rowCount: comparison.rowCount,
      })
    );
  }

  userContentParts.push(
    "",
    `거래 샘플(최대 ${transactions.length}건, 전체 건수는 집계 rowCount):`,
    JSON.stringify(transactions)
  );

  const userContent = userContentParts.join("\n");

  logger.info("[askFederationAccounting] request", {
    federationSlug,
    qLen: question.length,
    rowSample: transactions.length,
    rowCount: stats.rowCount,
  });

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "당신은 스포츠 협회 사무국의 회계 분석 보조입니다. 오직 제공된 집계 JSON, 비교 집계, 거래 샘플, signals(있을 때)만 근거로 한국어로 답하세요.\n" +
            "- 질문에 직접 답한다. 수치는 원·만 단위 병행 가능.\n" +
            "- 데이터 밖 추측·일반론은 하지 않는다. 근거가 부족하면 '제공된 원장 샘플/집계 범위에서는 확인할 수 없습니다'라고 짧게 말한다.\n" +
            "- signals.anomalyExpenseSpike 등 불리언은 데이터 기반 판정으로 취급하고, 설명할 때 '샘플·집계상 ~로 보입니다' 수준으로만 연결한다.\n" +
            "- 집계에 expenseEntryBreakdown이 있고 질문이 지출 등록 방식·증빙과 관련되면 건수·avgAmountReceiptAi·avgAmountManual 등 제공된 숫자만 인용한다(임의 추정 금지).\n" +
            "- 집계에 anomalyHints가 있고 질문이 지출 이상·반복 결제·카테고리 변동과 관련되면, countsByKind(건수 압축)와 items의 kind·severity·수치만 인용한다. 없는 항목은 만들지 않는다.\n" +
            "- 마크다운 코드펜스 없이 2~6문단 또는 불릿으로 간결히.",
        },
        { role: "user", content: userContent },
      ],
    });
    const answer = (res.choices[0]?.message?.content || "").trim();
    if (!answer) return { ok: false, error: "응답이 비었습니다." };
    return { ok: true, answer };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[askFederationAccounting] OpenAI error", e);
    return { ok: false, error: msg };
  }
}
