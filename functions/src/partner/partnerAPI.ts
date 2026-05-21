/**
 * 🔥 파트너 API 엔드포인트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 매물 등록
 * - 재고 연동
 * - 예약 관리
 * - 광고 관리
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { verifyAPIKey, recordAPICall } from "./apiAuth";
import { db, FieldValue } from "../firebase";
import { broadcastWebhook } from "./webhooks";

/**
 * 파트너 매물 등록 API
 */
export const partnerCreateItem = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { apiKey, itemData } = request.data;

    if (!apiKey) {
      throw new HttpsError("unauthenticated", "API 키가 필요합니다.");
    }

    // 🔥 API 키 검증
    const { valid, partner } = await verifyAPIKey(apiKey, ["WRITE_ITEM"]);

    if (!valid || !partner) {
      throw new HttpsError("permission-denied", "유효하지 않은 API 키입니다.");
    }

    try {
      // 🔥 매물 등록
      const itemRef = await db.collection("market").add({
        ...itemData,
        partnerId: partner.id,
        partnerName: partner.name,
        createdAt: FieldValue.serverTimestamp(),
        status: "open",
      });

      // 🔥 API 호출 기록
      await recordAPICall(partner.id, "createItem");

      // 🔥 웹훅 전송
      await broadcastWebhook({
        type: "ITEM_CREATED",
        data: { itemId: itemRef.id, ...itemData },
        timestamp: new Date(),
      });

      logger.info("[partnerCreateItem] 매물 등록 완료:", {
        partnerId: partner.id,
        itemId: itemRef.id,
      });

      return {
        success: true,
        itemId: itemRef.id,
      };
    } catch (error: any) {
      logger.error("[partnerCreateItem] 매물 등록 실패:", {
        partnerId: partner.id,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "매물 등록 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 파트너 거래 조회 API
 */
export const partnerGetTrades = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { apiKey, filters } = request.data;

    if (!apiKey) {
      throw new HttpsError("unauthenticated", "API 키가 필요합니다.");
    }

    // 🔥 API 키 검증
    const { valid, partner } = await verifyAPIKey(apiKey, ["READ_TRADE"]);

    if (!valid || !partner) {
      throw new HttpsError("permission-denied", "유효하지 않은 API 키입니다.");
    }

    try {
      let query = db.collection("trades").limit(100);

      // 🔥 필터 적용
      if (filters?.status) {
        query = query.where("status", "==", filters.status);
      }

      if (filters?.partnerId && filters.partnerId === partner.id) {
        // 파트너 자신의 거래만 조회
        query = query.where("partnerId", "==", partner.id);
      }

      const tradesSnap = await query.get();
      const trades = tradesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔥 API 호출 기록
      await recordAPICall(partner.id, "getTrades");

      return {
        success: true,
        trades,
        count: trades.length,
      };
    } catch (error: any) {
      logger.error("[partnerGetTrades] 거래 조회 실패:", {
        partnerId: partner.id,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "거래 조회 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 파트너 등록 API
 */
export const registerPartnerCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { name, type, scopes, webhookUrl } = request.data;

    if (!name || !type || !scopes || !Array.isArray(scopes)) {
      throw new HttpsError(
        "invalid-argument",
        "name, type, scopes가 필요합니다."
      );
    }

    try {
      const { partnerId, apiKey, apiSecret } = await registerPartner(
        name,
        type,
        scopes,
        webhookUrl
      );

      return {
        success: true,
        partnerId,
        apiKey,
        apiSecret, // ⚠️ 이 시점에서만 반환 (나중에 조회 불가)
      };
    } catch (error: any) {
      logger.error("[registerPartner] 파트너 등록 실패:", {
        name,
        type,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "파트너 등록 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
