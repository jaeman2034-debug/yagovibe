/**
 * 상품 등록 시 저장된 검색 조건과 매칭하여 알림 발송
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// 거리 계산 함수 (Haversine 공식) - 인라인 구현
function getDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const a_value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a_value), Math.sqrt(1 - a_value));
  return R * c;
}

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * 즉시 알림 발송 (프리미엄 사용자)
 */
async function sendNotificationImmediately(
  userId: string,
  product: any,
  productId: string
): Promise<void> {
  try {
    const { sendNotificationToUser } = await import("./sendUserNotification");
    
    await sendNotificationToUser(userId, {
      title: "🔥 찾던 물건 나왔어요",
      body: `${product.name}${product.category ? ` (${product.category})` : ""} 근처에 등록됨`,
      data: {
        type: "PRODUCT_MATCH",
        productId,
        category: product.category || "",
      },
    });
  } catch (err) {
    logger.error(`❌ 즉시 알림 발송 실패: ${userId}`, err);
    throw err;
  }
}

/**
 * 저장된 검색 조건과 상품 매칭
 */
function matchSearchCondition(
  search: any,
  product: any
): boolean {
  // 1. 카테고리 매칭
  if (search.category && product.category !== search.category) {
    return false;
  }

  // 2. 키워드 토큰 매칭
  if (search.keywordTokens && search.keywordTokens.length > 0) {
    const productTokens = product.keywordTokens || [];
    const hasMatch = search.keywordTokens.some((token: string) =>
      productTokens.includes(token)
    );
    if (!hasMatch) {
      return false;
    }
  }

  // 3. 거리 매칭
  if (
    search.location &&
    product.latitude &&
    product.longitude
  ) {
    const distance = getDistanceKm(
      { lat: search.location.lat, lng: search.location.lng },
      { lat: product.latitude, lng: product.longitude }
    );
    if (distance > (search.radiusKm || 5)) {
      return false;
    }
  }

  return true;
}

/**
 * 스팸 방지 체크 (최근 6시간 내 알림 발송 여부)
 */
function shouldSendNotification(search: any): boolean {
  if (!search.lastNotifiedAt) {
    return true; // 알림 발송 이력 없음
  }

  const lastNotified = search.lastNotifiedAt.toDate
    ? search.lastNotifiedAt.toDate()
    : new Date(search.lastNotifiedAt);
  
  const hoursSinceLastNotification =
    (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

  // 최근 6시간 내 알림 발송했으면 스킵
  return hoursSinceLastNotification >= 6;
}

/**
 * 상품 등록 시 저장된 검색 조건과 매칭하여 알림 발송
 */
export const onProductCreated = onDocumentCreated(
  {
    document: "marketProducts/{productId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const product = event.data?.data();
    if (!product) {
      logger.warn("상품 데이터가 없습니다.");
      return;
    }

    logger.info("🔔 새 상품 등록:", {
      productId: event.params.productId,
      name: product.name,
      category: product.category,
    });

    try {
      // 1. 활성화된 저장된 검색 조건 가져오기
      const searchesQuery = db
        .collection("savedSearches")
        .where("enabled", "==", true);

      // 카테고리가 있으면 필터링
      if (product.category) {
        searchesQuery.where("category", "==", product.category);
      }

      const searchesSnap = await searchesQuery.get();

      if (searchesSnap.empty) {
        logger.info("매칭되는 저장된 검색 조건이 없습니다.");
        return;
      }

      logger.info(`📋 ${searchesSnap.size}개의 저장된 검색 조건 확인 중...`);

      // 2. 각 저장된 검색 조건과 매칭 확인
      const matchedSearches: Array<{ id: string; data: any }> = [];

      for (const searchDoc of searchesSnap.docs) {
        const search = searchDoc.data();

        // 스팸 방지 체크
        if (!shouldSendNotification(search)) {
          logger.info(`⏭️ 스팸 방지: ${searchDoc.id} (최근 6시간 내 알림 발송됨)`);
          continue;
        }

        // 조건 매칭
        if (matchSearchCondition(search, product)) {
          matchedSearches.push({
            id: searchDoc.id,
            data: search,
          });
        }
      }

      if (matchedSearches.length === 0) {
        logger.info("매칭되는 검색 조건이 없습니다.");
        return;
      }

      logger.info(`✅ ${matchedSearches.length}개의 검색 조건과 매칭됨`);

      // 3. 프리미엄 우선권: 프리미엄 사용자와 무료 사용자 분리
      const premiumUsers: Array<{ id: string; data: any }> = [];
      const freeUsers: Array<{ id: string; data: any }> = [];

      for (const { id, data } of matchedSearches) {
        // 사용자 프리미엄 여부 확인
        const userDoc = await db.collection("users").doc(data.userId).get();
        const isPremium = userDoc.exists && userDoc.data()?.isPremium === true;

        if (isPremium) {
          premiumUsers.push({ id, data });
        } else {
          freeUsers.push({ id, data });
        }
      }

      // 4. 프리미엄 사용자: 즉시 알림 발송
      for (const { id, data } of premiumUsers) {
        try {
          await sendNotificationImmediately(data.userId, product, event.params.productId);
          
          logger.info(`🔥 [프리미엄] 즉시 알림 발송: ${id} → ${data.userId}`);

          // lastNotifiedAt 업데이트
          await db.collection("savedSearches").doc(id).update({
            lastNotifiedAt: new Date(),
            notificationCount: (data.notificationCount || 0) + 1,
          });
        } catch (err: any) {
          logger.error(`❌ 프리미엄 알림 발송 실패: ${id}`, err);
        }
      }

      // 5. 무료 사용자: 지연 알림 발송 (3~10분 랜덤)
      for (const { id, data } of freeUsers) {
        try {
          const delaySeconds = Math.floor(Math.random() * (10 * 60 - 3 * 60 + 1)) + 3 * 60; // 3~10분
          
          // 지연 알림을 Firestore에 저장 (Cloud Scheduler 또는 별도 함수로 처리)
          await db.collection("delayedNotifications").add({
            savedSearchId: id,
            userId: data.userId,
            productId: event.params.productId,
            productName: product.name,
            category: product.category,
            scheduledAt: new Date(Date.now() + delaySeconds * 1000),
            createdAt: new Date(),
          });

          logger.info(`⏰ [무료] 지연 알림 예약: ${id} → ${data.userId} (${delaySeconds}초 후)`);
        } catch (err: any) {
          logger.error(`❌ 지연 알림 예약 실패: ${id}`, err);
        }
      }
    } catch (err: any) {
      logger.error("❌ 상품 등록 알림 처리 오류:", err);
    }
  }
);

