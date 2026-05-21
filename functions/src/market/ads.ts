/**
 * 🔥 지역 광고 플랫폼 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지역 타겟팅 광고
 * - 노출/클릭 과금
 * - 성과 리포트
 * - 수익화 엔진
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

/**
 * 광고 타입
 */
export type AdType = "BANNER" | "BOOST" | "STORE";

/**
 * 광고 상태
 */
export type AdStatus = "ACTIVE" | "PAUSED" | "ENDED" | "REJECTED";

/**
 * 광고 데이터 구조
 */
export interface AdData {
  id: string;
  type: AdType;
  ownerId: string; // 광고주 ID
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl: string;
  targetLocation?: { lat: number; lng: number; radius: number }; // 지역 타겟팅 (km)
  targetCategory?: string[]; // 카테고리 타겟팅
  budget: number; // 총 예산
  spent: number; // 사용된 예산
  cpc: number; // 클릭당 비용
  cpm: number; // 노출당 비용 (1000회 기준)
  status: AdStatus;
  impressions: number; // 노출 수
  clicks: number; // 클릭 수
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 광고 생성
 */
export async function createAd(
  ownerId: string,
  data: {
    type: AdType;
    title: string;
    description?: string;
    imageUrl?: string;
    linkUrl: string;
    targetLocation?: { lat: number; lng: number; radius: number };
    targetCategory?: string[];
    budget: number;
    cpc: number;
    cpm: number;
    startDate: Date;
    endDate: Date;
  }
): Promise<string> {
  const adData = {
    type: data.type,
    ownerId,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    linkUrl: data.linkUrl,
    targetLocation: data.targetLocation,
    targetCategory: data.targetCategory || [],
    budget: data.budget,
    spent: 0,
    cpc: data.cpc,
    cpm: data.cpm,
    status: "ACTIVE" as AdStatus,
    impressions: 0,
    clicks: 0,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const adRef = await db.collection("ads").add(adData);
  const adId = adRef.id;

  logger.info("[createAd] 광고 생성:", {
    adId,
    ownerId,
    type: data.type,
    budget: data.budget,
  });

  return adId;
}

/**
 * 광고 노출 기록 (CPM 과금)
 */
export async function recordImpression(adId: string): Promise<void> {
  const adRef = db.collection("ads").doc(adId);

  await db.runTransaction(async (tx) => {
    const adSnap = await tx.get(adRef);
    if (!adSnap.exists) {
      throw new Error(`Ad ${adId} not found`);
    }

    const ad = adSnap.data() as AdData;

    if (ad.status !== "ACTIVE") {
      return; // 비활성 광고는 과금하지 않음
    }

    // 🔥 노출 수 증가
    tx.update(adRef, {
      impressions: FieldValue.increment(1),
    });

    // 🔥 1000회 노출마다 CPM 과금
    const newImpressions = ad.impressions + 1;
    if (newImpressions % 1000 === 0) {
      const chargeAmount = ad.cpm;
      const newSpent = ad.spent + chargeAmount;

      // 🔥 예산 초과 체크
      if (newSpent >= ad.budget) {
        tx.update(adRef, {
          status: "ENDED",
          spent: ad.budget,
        });
      } else {
        tx.update(adRef, {
          spent: newSpent,
        });
      }
    }
  });

  logger.info("[recordImpression] 광고 노출 기록:", { adId });
}

/**
 * 광고 클릭 기록 (CPC 과금)
 */
export async function recordClick(adId: string, userId?: string): Promise<void> {
  const adRef = db.collection("ads").doc(adId);

  await db.runTransaction(async (tx) => {
    const adSnap = await tx.get(adRef);
    if (!adSnap.exists) {
      throw new Error(`Ad ${adId} not found`);
    }

    const ad = adSnap.data() as AdData;

    if (ad.status !== "ACTIVE") {
      return; // 비활성 광고는 과금하지 않음
    }

    // 🔥 클릭 수 증가
    tx.update(adRef, {
      clicks: FieldValue.increment(1),
    });

    // 🔥 CPC 과금
    const newSpent = ad.spent + ad.cpc;

    // 🔥 예산 초과 체크
    if (newSpent >= ad.budget) {
      tx.update(adRef, {
        status: "ENDED",
        spent: ad.budget,
      });
    } else {
      tx.update(adRef, {
        spent: newSpent,
      });
    }
  });

  // 🔥 클릭 이벤트 기록
  await db.collection("adEvents").add({
    adId,
    userId,
    type: "click",
    timestamp: FieldValue.serverTimestamp(),
  });

  logger.info("[recordClick] 광고 클릭 기록:", { adId, userId });
}

/**
 * 지역 타겟팅 광고 조회
 */
export async function getTargetedAds(
  userLocation?: { lat: number; lng: number },
  category?: string,
  limit: number = 3
): Promise<AdData[]> {
  let query = db
    .collection("ads")
    .where("status", "==", "ACTIVE")
    .where("startDate", "<=", Timestamp.now())
    .where("endDate", ">=", Timestamp.now())
    .limit(50); // 성능을 위해 제한

  const adsSnap = await query.get();
  const ads: AdData[] = [];

  for (const adDoc of adsSnap.docs) {
    const ad = adDoc.data() as AdData;

    // 🔥 지역 타겟팅 체크
    if (ad.targetLocation && userLocation) {
      const distance = calculateDistance(
        userLocation,
        ad.targetLocation
      );
      if (distance > ad.targetLocation.radius) {
        continue; // 타겟 지역 밖
      }
    }

    // 🔥 카테고리 타겟팅 체크
    if (ad.targetCategory && ad.targetCategory.length > 0) {
      if (category && !ad.targetCategory.includes(category)) {
        continue; // 타겟 카테고리 아님
      }
    }

    // 🔥 예산 체크
    if (ad.spent >= ad.budget) {
      continue; // 예산 소진
    }

    ads.push({
      ...ad,
      id: adDoc.id,
    });
  }

  // 🔥 CPC 기준 정렬 (높은 순)
  ads.sort((a, b) => b.cpc - a.cpc);

  return ads.slice(0, limit);
}

/**
 * 거리 계산 (km)
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
