/**
 * 🔥 오프라인 인증 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 위치 확인
 * - 실명/본인 인증
 * - 대면 QR 상호 인증
 * - 거래 장소 체크인
 * - 현실 신뢰 인프라
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { updateUserReputation } from "./reputation";

/**
 * 인증 상태
 */
export type VerificationStatus = "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";

/**
 * 체크인 데이터
 */
export interface CheckInData {
  tradeId: string;
  userId: string;
  location: { lat: number; lng: number };
  timestamp: Date;
  verified: boolean;
}

/**
 * 거리 계산 (미터 단위)
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371000; // 지구 반지름 (미터)
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

/**
 * 만남 체크인 (GPS 위치 확인)
 */
export async function meetCheckIn(
  tradeId: string,
  userId: string,
  userLocation: { lat: number; lng: number },
  meetingPlace?: { lat: number; lng: number }
): Promise<{ verified: boolean; distance?: number }> {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();

  if (!tradeSnap.exists) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  const trade = tradeSnap.data() as any;

  // 🔥 거래 장소 확인
  let targetLocation = meetingPlace;
  if (!targetLocation && trade.meetingPlace) {
    targetLocation = trade.meetingPlace;
  }

  if (!targetLocation) {
    // 🔥 거래 장소가 없으면 거래 게시글 위치 사용
    const postSnap = await db.collection("market").doc(trade.postId).get();
    if (postSnap.exists) {
      const postData = postSnap.data();
      if (postData?.location) {
        targetLocation = postData.location;
      }
    }
  }

  if (!targetLocation) {
    logger.warn("[meetCheckIn] 거래 장소 없음:", { tradeId });
    return { verified: false };
  }

  // 🔥 거리 계산 (미터)
  const distance = calculateDistance(userLocation, targetLocation);
  const MAX_DISTANCE = 100; // 100미터 이내

  const verified = distance <= MAX_DISTANCE;

  // 🔥 체크인 기록
  await db.collection("checkIns").add({
    tradeId,
    userId,
    location: userLocation,
    targetLocation,
    distance,
    verified,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (verified) {
    // 🔥 거래 상태 업데이트
    await tradeRef.update({
      [`checkIns.${userId}`]: {
        location: userLocation,
        timestamp: FieldValue.serverTimestamp(),
        verified: true,
      },
      meetVerified: FieldValue.arrayUnion(userId),
    });

    // 🔥 평판 부스트 (체크인 시)
    await updateUserReputation(userId, {
      tradeCompleted: true, // 체크인 = 거래 완료로 간주
    });

    logger.info("[meetCheckIn] 체크인 성공:", {
      tradeId,
      userId,
      distance,
    });
  } else {
    logger.warn("[meetCheckIn] 체크인 실패 (거리 초과):", {
      tradeId,
      userId,
      distance,
      maxDistance: MAX_DISTANCE,
    });
  }

  return { verified, distance };
}

/**
 * QR 코드 생성 (상호 인증용)
 */
export async function generateQRCode(
  tradeId: string,
  userId: string
): Promise<string> {
  // 🔥 QR 코드 데이터 생성
  const qrData = {
    tradeId,
    userId,
    timestamp: Date.now(),
    type: "MEET_VERIFY",
  };

  // 🔥 QR 코드 저장
  const qrRef = await db.collection("qrCodes").add({
    ...qrData,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10분 유효
    used: false,
  });

  const qrId = qrRef.id;

  logger.info("[generateQRCode] QR 코드 생성:", { tradeId, userId, qrId });

  // 🔥 QR 코드 문자열 반환 (실제로는 QR 라이브러리로 이미지 생성)
  return JSON.stringify({ qrId, ...qrData });
}

/**
 * QR 코드 스캔 및 상호 인증
 */
export async function verifyQRCode(
  qrId: string,
  scannerUserId: string
): Promise<{ verified: boolean; tradeId?: string }> {
  const qrRef = db.collection("qrCodes").doc(qrId);
  const qrSnap = await qrRef.get();

  if (!qrSnap.exists) {
    throw new Error(`QR code ${qrId} not found`);
  }

  const qrData = qrSnap.data() as any;

  // 🔥 유효성 체크
  if (qrData.used) {
    throw new Error("QR code already used");
  }

  if (qrData.expiresAt.toDate() < new Date()) {
    throw new Error("QR code expired");
  }

  if (qrData.userId === scannerUserId) {
    throw new Error("Cannot scan own QR code");
  }

  // 🔥 QR 코드 사용 처리
  await db.runTransaction(async (tx) => {
    const qrSnap = await tx.get(qrRef);
    if (!qrSnap.exists) {
      throw new Error("QR code not found");
    }

    const data = qrSnap.data() as any;
    if (data.used) {
      throw new Error("QR code already used");
    }

    tx.update(qrRef, {
      used: true,
      scannedBy: scannerUserId,
      scannedAt: FieldValue.serverTimestamp(),
    });

    // 🔥 거래 상호 인증 완료
    const tradeRef = db.collection("trades").doc(data.tradeId);
    tx.update(tradeRef, {
      qrVerified: true,
      qrVerifiedBy: [data.userId, scannerUserId],
      qrVerifiedAt: FieldValue.serverTimestamp(),
    });
  });

  // 🔥 양쪽 사용자 평판 부스트
  await updateUserReputation(qrData.userId, {
    tradeCompleted: true,
  });
  await updateUserReputation(scannerUserId, {
    tradeCompleted: true,
  });

  logger.info("[verifyQRCode] QR 인증 완료:", {
    qrId,
    tradeId: qrData.tradeId,
    userId: qrData.userId,
    scannerUserId,
  });

  return {
    verified: true,
    tradeId: qrData.tradeId,
  };
}

/**
 * 거래 장소 설정
 */
export async function setMeetingPlace(
  tradeId: string,
  userId: string,
  location: { lat: number; lng: number },
  placeName?: string
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();

  if (!tradeSnap.exists) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  const trade = tradeSnap.data() as any;

  // 🔥 거래 당사자만 설정 가능
  if (trade.sellerId !== userId && trade.buyerId !== userId) {
    throw new Error("Only trade participants can set meeting place");
  }

  await tradeRef.update({
    meetingPlace: location,
    meetingPlaceName: placeName,
    meetingPlaceSetBy: userId,
    meetingPlaceSetAt: FieldValue.serverTimestamp(),
  });

  logger.info("[setMeetingPlace] 거래 장소 설정:", {
    tradeId,
    userId,
    location,
    placeName,
  });
}
