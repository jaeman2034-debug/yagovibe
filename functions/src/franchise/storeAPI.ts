/**
 * 🔥 프랜차이즈 지점 API (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지점 등록
 * - 검수/보관/직거래/AS 처리
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import {
  registerStore,
  verifyStore,
  processInspection,
  processStorage,
  processDirectTrade,
  processAS,
} from "./store";

/**
 * 지점 등록 Cloud Function
 */
export const registerStoreCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const ownerId = request.auth?.uid;
    const { name, location, services } = request.data;

    if (!ownerId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!name || !location || !services) {
      throw new HttpsError(
        "invalid-argument",
        "name, location, services가 필요합니다."
      );
    }

    try {
      const storeId = await registerStore(ownerId, {
        name,
        location,
        services,
      });

      return {
        success: true,
        storeId,
      };
    } catch (error: any) {
      logger.error("[registerStore] 지점 등록 실패:", {
        ownerId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "지점 등록 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 검수 처리 Cloud Function
 */
export const processInspectionCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const inspectorId = request.auth?.uid;
    const { storeId, itemId, result } = request.data;

    if (!inspectorId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!storeId || !itemId || !result) {
      throw new HttpsError(
        "invalid-argument",
        "storeId, itemId, result가 필요합니다."
      );
    }

    try {
      await processInspection(storeId, itemId, inspectorId, result);

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("[processInspection] 검수 처리 실패:", {
        storeId,
        itemId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "검수 처리 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 보관 서비스 Cloud Function
 */
export const processStorageCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { storeId, itemId, days } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!storeId || !itemId || !days) {
      throw new HttpsError(
        "invalid-argument",
        "storeId, itemId, days가 필요합니다."
      );
    }

    try {
      await processStorage(storeId, itemId, days);

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("[processStorage] 보관 처리 실패:", {
        storeId,
        itemId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "보관 처리 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 직거래 처리 Cloud Function
 */
export const processDirectTradeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { storeId, tradeId } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!storeId || !tradeId) {
      throw new HttpsError(
        "invalid-argument",
        "storeId, tradeId가 필요합니다."
      );
    }

    try {
      await processDirectTrade(storeId, tradeId);

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("[processDirectTrade] 직거래 처리 실패:", {
        storeId,
        tradeId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "직거래 처리 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * AS 요청 Cloud Function
 */
export const processASCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { storeId, tradeId, asType, description } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!storeId || !tradeId || !asType || !description) {
      throw new HttpsError(
        "invalid-argument",
        "storeId, tradeId, asType, description이 필요합니다."
      );
    }

    try {
      await processAS(storeId, tradeId, asType, description);

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("[processAS] AS 요청 실패:", {
        storeId,
        tradeId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "AS 요청 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
