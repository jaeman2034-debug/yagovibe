/**
 * 협회 매니저 전용 — 현재 화면 필터와 동일한 원장 샘플·집계로 한국어 회계 요약 (OpenAI)
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
  stats: AccountingSummaryStatsWire;
  transactions: AccountingSummaryTxWire[];
  comparison?: AccountingComparisonStatsWire | null;
  signals?: AccountingSignalsWire | null;
};

export async function handleSummarizeFederationAccounting(req: {
  data: RequestData;
  auth?: { uid?: string };
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug is required");

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
    "확정 집계(화면과 동일하게 클라이언트에서 계산됨. 이 숫자를 우선 신뢰):",
    JSON.stringify(stats),
  ];

  if (signals && typeof signals === "object") {
    userContentParts.push("", "데이터 기반 신호(클라이언트 산출, 요약 시 반영):", JSON.stringify(signals));
  }

  if (comparison && typeof comparison.label === "string") {
    userContentParts.push(
      "",
      `비교 기간 집계(동일 필터·범위로 이전 월 또는 전년을 클라이언트가 원장에서 재계산): ${comparison.label}`,
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
    `거래 내역 샘플(최대 ${transactions.length}건, 전체 건수는 집계의 rowCount):`,
    JSON.stringify(transactions)
  );
  const userContent = userContentParts.join("\n");

  const ah = stats.anomalyHints;
  const anomalyHintCount = ah && Array.isArray(ah.items) ? ah.items.length : 0;
  logger.info("[summarizeFederationAccounting] request", {
    federationSlug,
    rowSample: transactions.length,
    rowCount: stats.rowCount,
    hasSignals: Boolean(signals),
    anomalyHintCount,
  });

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "당신은 스포츠 협회 사무국의 회계·운영 분석가입니다. 제공된 집계 JSON과 거래 샘플만 근거로 한국어로 작성하세요.\n" +
            "signals 블록이 있으면 이상 탐지·Top 항목·신뢰도는 그 값을 우선 반영하고, LLM이 임의로 이상 여부를 바꾸지 마세요.\n" +
            "1) 먼저 현재 기간 요약(총 수입·총 지출·순이익/잔액, 주요 수입 출처·지출 카테고리).\n" +
            "2) 비교 기간 집계가 함께 주어지면: 수입·지출·잔액의 증감(금액과 가능하면 %)을 짧게 서술하고, 샘플·카테고리 분포에 근거할 때만 변동 원인 후보를 제시하세요. 비교 데이터가 없거나 거래가 거의 없으면 비교 문단은 생략.\n" +
            "3) signals.anomalyExpenseSpike가 true이면 지출 급증 가능성을 한 줄로 언급; false면 과장하지 않음. 샘플에 드러난 이상 패턴(특정 카테고리 집중 등)이 있으면 한 줄 경고성 인사이트로.\n" +
            "4) trustLevel이 low/medium이면 해석 한계를 한 문장으로.\n" +
            "5) 집계 JSON에 expenseEntryBreakdown이 있으면, 지출 건수 중 영수증(AI) 등록·수기·이미지 URL 보유 건수를 숫자로 짧게 언급하고, avgAmountReceiptAi·avgAmountManual이 모두 있으면 건당 평균 금액 차이를 한 문장으로만 비교하세요(이상 징후 가능할 때만, 임의 추측 금지).\n" +
            "6) 집계 JSON에 anomalyHints가 있고 items 배열이 비어 있지 않으면: countsByKind가 있으면 고액 건수·반복 상호 그룹 수·카테고리 급증 수를 한 문장으로 압축해 먼저 언급할 수 있습니다(0인 유형은 생략). 이어서 세부는 items에서 severity가 high인 것 위주로 1~2문장만 보강하고, 각 항목의 kind·severity·제공된 숫자·날짜·상호명만 근거로 쓰세요. 같은 내용을 항목마다 반복해 장황하게 쓰지 마세요. anomalyHints가 없거나(null)이면 이상 힌트 문단은 쓰지 마세요.\n" +
            "추측·과장 금지. 금액은 원과 만/억 병행 가능. 마크다운 코드펜스 없이 제목 한 줄 후 불릿·짧은 문단.",
        },
        { role: "user", content: userContent },
      ],
    });
    const summary = (res.choices[0]?.message?.content || "").trim();
    if (!summary) return { ok: false, error: "요약 결과가 비었습니다." };
    return { ok: true, summary };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[summarizeFederationAccounting] OpenAI error", e);
    return { ok: false, error: msg };
  }
}
