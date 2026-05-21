/**
 * 🔥 프랜차이즈 지점 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지점 등록 및 인증
 * - 검수, 보관, 직거래, AS
 * - 지역 락인 강화
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { updateUserReputation } from "../market/reputation";

/**
 * 지점 상태
 */
export type StoreStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "INACTIVE";

/**
 * 지점 데이터
 */
export interface StoreData {
  id: string;
  name: string;
  ownerId: string;
  location: { lat: number; lng: number; address: string };
  services: ("INSPECTION" | "STORAGE" | "DIRECT_TRADE" | "AS")[]; // 제공 서비스
  status: StoreStatus;
  verifiedAt?: Date;
  revenue: number; // 총 수익
  tradeCount: number; // 거래 횟수
  rating: number; // 평점
  createdAt: Date;
}

/**
 * 지점 등록
 */
export async function registerStore(
  ownerId: string,
  data: {
    name: string;
    location: { lat: number; lng: number; address: string };
    services: StoreData["services"];
  }
): Promise<string> {
  const storeData = {
    name: data.name.trim(),
    ownerId,
    location: data.location,
    services: data.services,
    status: "PENDING" as StoreStatus,
    revenue: 0,
    tradeCount: 0,
    rating: 0,
    createdAt: FieldValue.serverTimestamp(),
  };

  const storeRef = await db.collection("stores").add(storeData);
  const storeId = storeRef.id;

  logger.info("[registerStore] 지점 등록:", {
    storeId,
    ownerId,
    name: data.name,
  });

  return storeId;
}

/**
 * 지점 인증
 */
export async function verifyStore(storeId: string): Promise<void> {
  const storeRef = db.collection("stores").doc(storeId);
  await storeRef.update({
    status: "VERIFIED",
    verifiedAt: FieldValue.serverTimestamp(),
  });

  logger.info("[verifyStore] 지점 인증 완료:", { storeId });
}

/**
 * 검수 서비스 처리
 */
export async function processInspection(
  storeId: string,
  itemId: string,
  inspectorId: string,
  result: {
    passed: boolean;
    condition: "new" | "like_new" | "used" | "poor";
    notes?: string;
  }
): Promise<void> {
  const inspectionData = {
    storeId,
    itemId,
    inspectorId,
    result,
    timestamp: FieldValue.serverTimestamp(),
  };

  await db.collection("inspections").add(inspectionData);

  // 🔥 아이템에 검수 결과 반영
  await db.collection("market").doc(itemId).update({
    inspected: true,
    inspectionResult: result,
    inspectedAt: FieldValue.serverTimestamp(),
    inspectedBy: storeId,
  });

  // 🔥 지점 수익 증가 (검수 수수료)
  const inspectionFee = 5000; // 검수 수수료 5,000원
  const storeRef = db.collection("stores").doc(storeId);
  await storeRef.update({
    revenue: FieldValue.increment(inspectionFee),
    tradeCount: FieldValue.increment(1),
  });

  logger.info("[processInspection] 검수 완료:", {
    storeId,
    itemId,
    passed: result.passed,
  });
}

/**
 * 보관 서비스 처리
 */
export async function processStorage(
  storeId: string,
  itemId: string,
  days: number
): Promise<void> {
  const storageFee = days * 1000; // 일당 1,000원

  const storageData = {
    storeId,
    itemId,
    days,
    fee: storageFee,
    startDate: FieldValue.serverTimestamp(),
    endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    status: "ACTIVE",
  };

  await db.collection("storages").add(storageData);

  // 🔥 지점 수익 증가
  const storeRef = db.collection("stores").doc(storeId);
  await storeRef.update({
    revenue: FieldValue.increment(storageFee),
  });

  logger.info("[processStorage] 보관 시작:", {
    storeId,
    itemId,
    days,
    fee: storageFee,
  });
}

/**
 * 직거래 지원 (지점에서 거래)
 */
export async function processDirectTrade(
  storeId: string,
  tradeId: string
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();

  if (!tradeSnap.exists) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  const trade = tradeSnap.data() as any;

  // 🔥 거래에 지점 정보 추가
  await tradeRef.update({
    storeId,
    directTrade: true,
    directTradeAt: FieldValue.serverTimestamp(),
  });

  // 🔥 지점 수익 증가 (직거래 수수료 3%)
  const feeRate = 0.03;
  const fee = Math.round(trade.amount * feeRate);
  const storeRef = db.collection("stores").doc(storeId);
  await storeRef.update({
    revenue: FieldValue.increment(fee),
    tradeCount: FieldValue.increment(1),
  });

  // 🔥 양쪽 사용자 평판 부스트 (지점 거래는 신뢰도 높음)
  await updateUserReputation(trade.buyerId, {
    tradeCompleted: true,
  });
  await updateUserReputation(trade.sellerId, {
    tradeCompleted: true,
  });

  logger.info("[processDirectTrade] 직거래 완료:", {
    storeId,
    tradeId,
    fee,
  });
}

/**
 * AS (After Service) 처리
 */
export async function processAS(
  storeId: string,
  tradeId: string,
  asType: "REPAIR" | "EXCHANGE" | "REFUND",
  description: string
): Promise<void> {
  const asData = {
    storeId,
    tradeId,
    type: asType,
    description,
    status: "PENDING",
    createdAt: FieldValue.serverTimestamp(),
  };

  await db.collection("asRequests").add(asData);

  logger.info("[processAS] AS 요청 등록:", {
    storeId,
    tradeId,
    type: asType,
  });
}

/**
 * 지점 인증 배지 부여 (지역 락인 강화)
 */
export async function boostLocalReputation(
  userId: string,
  storeId: string
): Promise<void> {
  // 🔥 지점 인증 사용자는 지역 신뢰도 부스트
  await updateUserReputation(userId, {
    tradeCompleted: true, // 지점 거래 = 신뢰도 높음
  });

  logger.info("[boostLocalReputation] 지역 신뢰도 부스트:", {
    userId,
    storeId,
  });
}
