/**
 * 🔥 CS 자동 분류 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 분쟁 자동 분류 (정확도 ≥92% 목표)
 * - 템플릿 즉시 발송 (3초 이내)
 * - 고위험만 상담원 연결
 * - 자동 분류 오차 모니터링
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";
import { AUTO_RESPONSE_TEMPLATES } from "./autoResponseV2";

type DisputeType = 
  | "NO_SHOW" 
  | "PRICE_DISAGREEMENT" 
  | "ITEM_CONDITION" 
  | "PAYMENT_ISSUE" 
  | "DELIVERY_ISSUE"
  | "DELIVERY_DELAY"
  | "REFUND_REQUEST"
  | "TRADE_CANCELLATION"
  | "QUALITY_ISSUE"
  | "FRAUD"
  | "ACCOUNT_ABUSE"
  | "OTHER";

// 🔥 분류 정확도 목표 (완전 안정)
const CLASSIFICATION_ACCURACY_TARGET = 0.99; // 99% (98.5% → 99%로 상향)
const TEMPLATE_SEND_TIMEOUT_MS = 3000; // 3초 이내
const HIGH_RISK_THRESHOLD = 0.7; // 고위험 임계값 70%

// 🔥 자동 분류 오차 모니터링
const HUMAN_REVIEW_SAMPLE_RATE = 0.05; // 5% 샘플 휴먼 리뷰
const CLASSIFICATION_ERROR_THRESHOLD = 0.03; // 오차 3% 이상 시 재학습

/**
 * 분쟁 자동 분류 규칙
 */
interface ClassificationRule {
  keywords: string[];
  type: DisputeType;
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    keywords: ["노쇼", "불참", "안나옴", "연락안됨", "약속안지킴"],
    type: "NO_SHOW",
    confidence: 0.95,
    priority: "HIGH",
  },
  {
    keywords: ["가격", "돈", "비싸", "싸", "협의", "가격변경"],
    type: "PRICE_DISAGREEMENT",
    confidence: 0.93,
    priority: "MEDIUM",
  },
  {
    keywords: ["상태", "품질", "손상", "깨짐", "고장", "불량"],
    type: "ITEM_CONDITION",
    confidence: 0.92,
    priority: "MEDIUM",
  },
  {
    keywords: ["결제", "카드", "환불", "입금", "출금", "결제오류"],
    type: "PAYMENT_ISSUE",
    confidence: 0.94,
    priority: "HIGH",
  },
  {
    keywords: ["배송", "택배", "배달", "수령", "미수령"],
    type: "DELIVERY_ISSUE",
    confidence: 0.91,
    priority: "MEDIUM",
  },
  {
    keywords: ["배송지연", "늦음", "늦게", "지연"],
    type: "DELIVERY_DELAY",
    confidence: 0.90,
    priority: "MEDIUM",
  },
  {
    keywords: ["환불", "돌려줘", "돌려달라", "환불요청"],
    type: "REFUND_REQUEST",
    confidence: 0.92,
    priority: "MEDIUM",
  },
  {
    keywords: ["취소", "거래취소", "취소요청"],
    type: "TRADE_CANCELLATION",
    confidence: 0.91,
    priority: "MEDIUM",
  },
  {
    keywords: ["품질", "불량품", "품질문제", "불량"],
    type: "QUALITY_ISSUE",
    confidence: 0.90,
    priority: "MEDIUM",
  },
  {
    keywords: ["사기", "사기당함", "속임수", "기만"],
    type: "FRAUD",
    confidence: 0.98,
    priority: "CRITICAL",
  },
  {
    keywords: ["계정", "남용", "악용", "부정"],
    type: "ACCOUNT_ABUSE",
    confidence: 0.97,
    priority: "CRITICAL",
  },
];

/**
 * 분쟁 자동 분류
 */
function classifyDispute(
  title: string,
  description: string
): {
  type: DisputeType;
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  needsHumanReview: boolean;
} {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch: ClassificationRule | null = null;
  let maxConfidence = 0;

  // 🔥 키워드 매칭
  for (const rule of CLASSIFICATION_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      // 🔥 매칭된 키워드 수에 따라 신뢰도 조정
      const matchRatio = matchedKeywords.length / rule.keywords.length;
      const adjustedConfidence = rule.confidence * (0.7 + 0.3 * matchRatio);

      if (adjustedConfidence > maxConfidence) {
        maxConfidence = adjustedConfidence;
        bestMatch = rule;
      }
    }
  }

  // 🔥 분류 실패 시 OTHER
  if (!bestMatch || maxConfidence < 0.7) {
    return {
      type: "OTHER",
      confidence: 0.7,
      priority: "LOW",
      needsHumanReview: true, // 낮은 신뢰도는 휴먼 리뷰 필요
    };
  }

  // 🔥 고위험 판정
  const isHighRisk = bestMatch.priority === "CRITICAL" || bestMatch.priority === "HIGH";
  const needsHumanReview = isHighRisk || maxConfidence < CLASSIFICATION_ACCURACY_TARGET;

  return {
    type: bestMatch.type,
    confidence: maxConfidence,
    priority: bestMatch.priority,
    needsHumanReview,
  };
}

/**
 * 분쟁 생성 시 자동 분류 및 즉시 응답
 */
export const onDisputeAutoClassify = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const startTime = Date.now();

    logger.info("[onDisputeAutoClassify] 분쟁 자동 분류 시작:", { disputeId });

    try {
      // 🔥 이미 분류된 경우 스킵
      if (dispute.type && dispute.type !== "OTHER") {
        logger.info("[onDisputeAutoClassify] 이미 분류됨:", { disputeId, type: dispute.type });
        return;
      }

      const title = dispute.title || "";
      const description = dispute.description || "";

      // 🔥 자동 분류
      const classification = classifyDispute(title, description);

      // 🔥 템플릿 즉시 발송 (3초 이내)
      const template = AUTO_RESPONSE_TEMPLATES[classification.type];
      const responseTime = Date.now() - startTime;

      if (responseTime > TEMPLATE_SEND_TIMEOUT_MS) {
        logger.warn("[onDisputeAutoClassify] 템플릿 발송 지연:", {
          disputeId,
          responseTime,
          threshold: TEMPLATE_SEND_TIMEOUT_MS,
        });
      }

      // 🔥 분쟁 문서 업데이트
      await db.collection("disputes").doc(disputeId).update({
        type: classification.type,
        classificationConfidence: classification.confidence,
        priority: classification.priority,
        autoClassified: true,
        autoClassifiedAt: FieldValue.serverTimestamp(),
        needsHumanReview: classification.needsHumanReview,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 사용자에게 즉시 자동 답변 발송
      await notify(dispute.userId, {
        type: "JOIN_APPROVED", // 임시 타입
        title: "문의 접수 완료",
        body: template.initial,
        postId: dispute.postId || "",
      });

      // 🔥 고위험만 상담원 연결
      if (classification.needsHumanReview) {
        await db.collection("csQueue").add({
          disputeId,
          priority: classification.priority,
          type: classification.type,
          classificationConfidence: classification.confidence,
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
          autoClassified: true,
        });

        logger.info("[onDisputeAutoClassify] 고위험 분쟁 상담원 연결:", {
          disputeId,
          type: classification.type,
          priority: classification.priority,
        });
      }

      // 🔥 5% 샘플 휴먼 리뷰 등록
      if (Math.random() < HUMAN_REVIEW_SAMPLE_RATE) {
        await db.collection("humanReviewQueue").add({
          disputeId,
          autoClassifiedType: classification.type,
          autoClassifiedConfidence: classification.confidence,
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onDisputeAutoClassify] 휴먼 리뷰 샘플 등록:", {
          disputeId,
          autoClassifiedType: classification.type,
        });
      }

      logger.info("[onDisputeAutoClassify] 분쟁 자동 분류 완료:", {
        disputeId,
        type: classification.type,
        confidence: classification.confidence,
        priority: classification.priority,
        responseTime,
        needsHumanReview: classification.needsHumanReview,
      });
    } catch (error: any) {
      logger.error("[onDisputeAutoClassify] 분쟁 자동 분류 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
