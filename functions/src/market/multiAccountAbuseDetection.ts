/**
 * 🔥 멀티계정·재게시 어뷰징 탐지 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 동일 IP/기기 24h 2회 초과 → 부스트 제외
 * - 이미지 해시 중복 → 병합 검수
 * - 제목 유사도 85%↑ → 재게시 차단
 * - 가격 급등락 패턴 탐지
 * - 계정 교차 게시 탐지
 * - 자동 점수 기반 제재
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import * as crypto from "crypto";

const BOOST_LIMIT_PER_IP_24H = 2; // 동일 IP/기기 24시간 내 최대 부스트 횟수
const TITLE_SIMILARITY_BLOCK_THRESHOLD = 0.85; // 제목 유사도 차단 임계값 (85%)
const PRICE_VOLATILITY_THRESHOLD = 0.5; // 가격 급등락 임계값 (50%)
const ABUSE_SCORE_THRESHOLD = 70; // 어뷰징 점수 임계값 (70점)

/**
 * 이미지 해시 계산
 */
function calculateImageHash(imageUrl: string): string {
  return crypto.createHash("md5").update(imageUrl).digest("hex");
}

/**
 * 제목 유사도 계산
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * 동일 IP/기기 24h 부스트 횟수 체크
 */
async function checkIPDeviceBoostLimit(
  postId: string,
  deviceId?: string,
  ipAddress?: string
): Promise<{ exceedsLimit: boolean; boostCount: number }> {
  try {
    if (!deviceId && !ipAddress) {
      return { exceedsLimit: false, boostCount: 0 };
    }

    const twentyFourHoursAgo = Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    // 🔥 디바이스 ID 또는 IP 주소 기반 부스트 횟수 집계
    // 실제로는 별도 컬렉션에서 디바이스/IP 매핑 관리 필요
    // 여기서는 간단히 최근 게시물 패턴으로 추정

    const recentPosts = await db
      .collection("market")
      .where("boostActive", "==", true)
      .where("boostStartTime", ">=", twentyFourHoursAgo)
      .limit(500)
      .get();

    // 🔥 디바이스 ID 또는 IP 주소 기반 그룹화 (간단한 추정)
    let boostCount = 0;
    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue;

      const postData = postDoc.data();
      const postDeviceId = postData.deviceId;
      const postIpAddress = postData.ipAddress;

      if ((deviceId && postDeviceId === deviceId) || 
          (ipAddress && postIpAddress === ipAddress)) {
        boostCount++;
      }
    }

    const exceedsLimit = boostCount >= BOOST_LIMIT_PER_IP_24H;

    return { exceedsLimit, boostCount };
  } catch (error: any) {
    logger.error("[checkIPDeviceBoostLimit] IP/기기 부스트 제한 체크 실패:", {
      postId,
      error: error.message,
    });
    return { exceedsLimit: false, boostCount: 0 };
  }
}

/**
 * 이미지 해시 중복 탐지
 */
async function detectImageHashDuplicate(
  postId: string,
  imageUrls: string[]
): Promise<{ isDuplicate: boolean; duplicatePosts: string[] }> {
  try {
    const imageHashes = imageUrls.map(calculateImageHash);
    const duplicatePosts: string[] = [];

    // 🔥 최근 30일 내 동일 이미지 해시 검색
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const recentPosts = await db
      .collection("market")
      .where("createdAt", ">=", thirtyDaysAgo)
      .where("status", "==", "open")
      .limit(500)
      .get();

    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue;

      const postData = postDoc.data();
      const postImages = postData.images || [];
      const postImageHashes = postImages.map(calculateImageHash);

      // 🔥 이미지 해시 일치 확인
      const matchingHashes = imageHashes.filter(hash => 
        postImageHashes.includes(hash)
      );

      if (matchingHashes.length > 0) {
        duplicatePosts.push(postDoc.id);
      }
    }

    const isDuplicate = duplicatePosts.length >= 1;

    return { isDuplicate, duplicatePosts };
  } catch (error: any) {
    logger.error("[detectImageHashDuplicate] 이미지 해시 중복 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isDuplicate: false, duplicatePosts: [] };
  }
}

/**
 * 제목 유사도 기반 재게시 차단
 */
async function detectTitleSimilarityBlock(
  postId: string,
  title: string
): Promise<{ shouldBlock: boolean; similarPosts: string[] }> {
  try {
    const similarPosts: string[] = [];

    // 🔥 최근 7일 내 유사 제목 검색
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const recentPosts = await db
      .collection("market")
      .where("createdAt", ">=", sevenDaysAgo)
      .where("status", "==", "open")
      .limit(200)
      .get();

    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue;

      const postData = postDoc.data();
      const postTitle = postData.title || "";

      const similarity = calculateTitleSimilarity(title, postTitle);
      if (similarity >= TITLE_SIMILARITY_BLOCK_THRESHOLD) {
        similarPosts.push(postDoc.id);
      }
    }

    const shouldBlock = similarPosts.length >= 1; // 1개 이상 유사 제목 시 차단

    return { shouldBlock, similarPosts };
  } catch (error: any) {
    logger.error("[detectTitleSimilarityBlock] 제목 유사도 차단 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { shouldBlock: false, similarPosts: [] };
  }
}

/**
 * 가격 급등락 패턴 탐지
 */
async function detectPriceVolatility(
  postId: string,
  authorId: string,
  currentPrice: number
): Promise<{ isVolatile: boolean; volatility: number }> {
  try {
    // 🔥 최근 30일 내 동일 작성자 게시물 가격 조회
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const recentPosts = await db
      .collection("market")
      .where("authorId", "==", authorId)
      .where("category", "==", "equipment")
      .where("createdAt", ">=", thirtyDaysAgo)
      .where("price", ">", 0)
      .limit(50)
      .get();

    if (recentPosts.size < 2) {
      return { isVolatile: false, volatility: 0 };
    }

    const prices: number[] = [];
    recentPosts.docs.forEach((doc) => {
      const price = doc.data().price;
      if (price && typeof price === "number" && price > 0) {
        prices.push(price);
      }
    });

    if (prices.length < 2) {
      return { isVolatile: false, volatility: 0 };
    }

    // 🔥 가격 변동성 계산 (표준편차 / 평균)
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => 
      sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = mean > 0 ? stdDev / mean : 0;

    const isVolatile = volatility >= PRICE_VOLATILITY_THRESHOLD;

    return { isVolatile, volatility };
  } catch (error: any) {
    logger.error("[detectPriceVolatility] 가격 급등락 패턴 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isVolatile: false, volatility: 0 };
  }
}

/**
 * 계정 교차 게시 탐지
 */
async function detectCrossAccountPosting(
  postId: string,
  title: string,
  imageUrls: string[]
): Promise<{ isCrossAccount: boolean; accountCount: number }> {
  try {
    const imageHashes = imageUrls.map(calculateImageHash);
    const accountSet = new Set<string>();

    // 🔥 최근 7일 내 유사 패턴 게시물 검색
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const recentPosts = await db
      .collection("market")
      .where("createdAt", ">=", sevenDaysAgo)
      .where("status", "==", "open")
      .limit(200)
      .get();

    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue;

      const postData = postDoc.data();
      const postTitle = postData.title || "";
      const postImages = postData.images || [];
      const postAuthorId = postData.authorId;

      // 🔥 제목 유사도 체크
      const titleSimilarity = calculateTitleSimilarity(title, postTitle);

      // 🔥 이미지 해시 일치 체크
      const postImageHashes = postImages.map(calculateImageHash);
      const matchingImages = imageHashes.filter(hash => 
        postImageHashes.includes(hash)
      ).length;

      // 🔥 유사 패턴 판정 (제목 유사도 80% 이상 또는 이미지 50% 이상 일치)
      if (titleSimilarity >= 0.8 || (imageUrls.length > 0 && matchingImages / imageUrls.length >= 0.5)) {
        accountSet.add(postAuthorId);
      }
    }

    const accountCount = accountSet.size;
    const isCrossAccount = accountCount >= 2; // 2계정 이상에서 유사 패턴 시 교차 게시

    return { isCrossAccount, accountCount };
  } catch (error: any) {
    logger.error("[detectCrossAccountPosting] 계정 교차 게시 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isCrossAccount: false, accountCount: 0 };
  }
}

/**
 * 어뷰징 점수 계산
 */
function calculateAbuseScore(flags: {
  ipDeviceLimitExceeded: boolean;
  imageHashDuplicate: boolean;
  titleSimilarityBlock: boolean;
  priceVolatility: boolean;
  crossAccountPosting: boolean;
}): number {
  let score = 0;

  if (flags.ipDeviceLimitExceeded) score += 20; // IP/기기 제한 초과
  if (flags.imageHashDuplicate) score += 25; // 이미지 해시 중복
  if (flags.titleSimilarityBlock) score += 30; // 제목 유사도 차단
  if (flags.priceVolatility) score += 15; // 가격 급등락
  if (flags.crossAccountPosting) score += 30; // 계정 교차 게시

  return score;
}

/**
 * 게시물 생성 시 멀티계정·재게시 어뷰징 탐지
 */
export const onMultiAccountAbuseCheck = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const authorId = post.authorId;
    const title = post.title || "";
    const imageUrls = post.images || [];
    const price = typeof post.price === "number" ? post.price : Number(post.price || 0);
    const deviceId = post.deviceId;
    const ipAddress = post.ipAddress;

    logger.info("[onMultiAccountAbuseCheck] 멀티계정·재게시 어뷰징 탐지 시작:", {
      postId,
      authorId,
    });

    try {
      const abuseFlags: any = {};
      let shouldBlock = false;
      let shouldMerge = false;

      // 🔥 1. 동일 IP/기기 24h 2회 초과 체크
      const ipDeviceCheck = await checkIPDeviceBoostLimit(postId, deviceId, ipAddress);
      if (ipDeviceCheck.exceedsLimit) {
        abuseFlags.ipDeviceLimitExceeded = true;
        // 부스트 제외
        await db.collection("market").doc(postId).update({
          boostBlocked: true,
          boostBlockReason: "IP_DEVICE_LIMIT_24H",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // 🔥 2. 이미지 해시 중복 탐지
      if (imageUrls.length > 0) {
        const imageDuplicate = await detectImageHashDuplicate(postId, imageUrls);
        if (imageDuplicate.isDuplicate) {
          abuseFlags.imageHashDuplicate = true;
          shouldMerge = true;

          // 🔥 병합 검수 큐 등록
          await db.collection("inspectionQueue").add({
            postId,
            userId: authorId,
            reason: "IMAGE_HASH_DUPLICATE_MERGE",
            details: {
              duplicatePosts: imageDuplicate.duplicatePosts,
              imageUrls,
            },
            priority: "HIGH",
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 🔥 3. 제목 유사도 85%↑ → 재게시 차단
      if (title) {
        const titleBlock = await detectTitleSimilarityBlock(postId, title);
        if (titleBlock.shouldBlock) {
          abuseFlags.titleSimilarityBlock = true;
          shouldBlock = true;

          // 🔥 게시물 차단
          await db.collection("market").doc(postId).update({
            status: "blocked",
            blockReason: "TITLE_SIMILARITY_BLOCK",
            blockDetails: {
              similarPosts: titleBlock.similarPosts,
            },
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 🔥 4. 가격 급등락 패턴 탐지
      if (price > 0 && post.category === "equipment") {
        const priceVolatility = await detectPriceVolatility(postId, authorId, price);
        if (priceVolatility.isVolatile) {
          abuseFlags.priceVolatility = true;
        }
      }

      // 🔥 5. 계정 교차 게시 탐지
      if (title && imageUrls.length > 0) {
        const crossAccount = await detectCrossAccountPosting(postId, title, imageUrls);
        if (crossAccount.isCrossAccount) {
          abuseFlags.crossAccountPosting = true;
        }
      }

      // 🔥 6. 어뷰징 점수 계산 및 제재
      const abuseScore = calculateAbuseScore(abuseFlags);

      if (abuseScore >= ABUSE_SCORE_THRESHOLD || shouldBlock) {
        // 🔥 어뷰징 플래그 설정
        await db.collection("market").doc(postId).update({
          abuseDetected: true,
          abuseScore,
          abuseFlags,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onMultiAccountAbuseCheck] 멀티계정·재게시 어뷰징 탐지:", {
          postId,
          authorId,
          abuseScore,
          abuseFlags,
          shouldBlock,
        });
      } else if (shouldMerge) {
        // 🔥 병합 검수만 필요한 경우
        await db.collection("market").doc(postId).update({
          mergeInspection: true,
          abuseFlags,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error: any) {
      logger.error("[onMultiAccountAbuseCheck] 멀티계정·재게시 어뷰징 탐지 실패:", {
        postId,
        authorId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
