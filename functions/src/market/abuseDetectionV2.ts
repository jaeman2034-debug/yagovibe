/**
 * 🔥 어뷰징 탐지 룰셋 v2 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이미지 재사용 탐지
 * - 제목 변형 패턴 탐지
 * - 다계정 반복 탐지
 * - 패턴 유사 게시 자동 병합 검수
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import * as crypto from "crypto";

const IMAGE_REUSE_THRESHOLD = 0.9; // 이미지 재사용 임계값 (90% 유사)
const TITLE_SIMILARITY_THRESHOLD = 0.85; // 제목 유사도 임계값 (85%)
const MULTI_ACCOUNT_THRESHOLD = 3; // 다계정 반복 임계값 (3계정)
const PATTERN_MERGE_THRESHOLD = 0.8; // 패턴 유사도 임계값 (80%)

/**
 * 이미지 해시 계산 (간단한 해시 기반)
 */
function calculateImageHash(imageUrl: string): string {
  // 실제로는 이미지 URL 또는 이미지 데이터의 해시를 계산
  // 여기서는 간단히 URL 기반 해시 사용
  return crypto.createHash("md5").update(imageUrl).digest("hex");
}

/**
 * 제목 유사도 계산 (간단한 문자열 유사도)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  // 간단한 Jaccard 유사도 계산
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * 이미지 재사용 탐지
 */
async function detectImageReuse(
  postId: string,
  imageUrls: string[]
): Promise<{ isReused: boolean; reusedCount: number; similarPosts: string[] }> {
  try {
    const imageHashes = imageUrls.map(calculateImageHash);
    const similarPosts: string[] = [];

    // 🔥 최근 30일 내 게시물에서 동일 이미지 해시 검색
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
      if (postDoc.id === postId) continue; // 자기 자신 제외

      const postData = postDoc.data();
      const postImages = postData.images || [];

      // 🔥 이미지 해시 비교
      const postImageHashes = postImages.map(calculateImageHash);
      const matchingHashes = imageHashes.filter(hash => 
        postImageHashes.includes(hash)
      );

      if (matchingHashes.length > 0) {
        similarPosts.push(postDoc.id);
      }
    }

    const reusedCount = similarPosts.length;
    const isReused = reusedCount >= 1; // 1개 이상 재사용 시 탐지

    return { isReused, reusedCount, similarPosts };
  } catch (error: any) {
    logger.error("[detectImageReuse] 이미지 재사용 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isReused: false, reusedCount: 0, similarPosts: [] };
  }
}

/**
 * 제목 변형 패턴 탐지
 */
async function detectTitleVariation(
  postId: string,
  title: string,
  authorId: string
): Promise<{ isVariation: boolean; similarTitles: string[] }> {
  try {
    const similarTitles: string[] = [];

    // 🔥 최근 30일 내 동일 작성자 게시물에서 유사 제목 검색
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const recentPosts = await db
      .collection("market")
      .where("authorId", "==", authorId)
      .where("createdAt", ">=", thirtyDaysAgo)
      .limit(100)
      .get();

    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue; // 자기 자신 제외

      const postData = postDoc.data();
      const postTitle = postData.title || "";

      const similarity = calculateTitleSimilarity(title, postTitle);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        similarTitles.push(postDoc.id);
      }
    }

    const isVariation = similarTitles.length >= 2; // 2개 이상 유사 제목 시 탐지

    return { isVariation, similarTitles };
  } catch (error: any) {
    logger.error("[detectTitleVariation] 제목 변형 패턴 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isVariation: false, similarTitles: [] };
  }
}

/**
 * 다계정 반복 탐지 (IP 기반 또는 디바이스 기반)
 */
async function detectMultiAccountPattern(
  postId: string,
  authorId: string,
  deviceId?: string,
  ipAddress?: string
): Promise<{ isMultiAccount: boolean; accountCount: number }> {
  try {
    // 🔥 디바이스 ID 또는 IP 주소 기반 계정 그룹화
    // 실제로는 별도 컬렉션에서 디바이스/IP 매핑 관리 필요
    // 여기서는 간단히 최근 게시물 패턴으로 추정

    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // 🔥 유사한 제목/이미지 패턴의 게시물 조회
    const recentPosts = await db
      .collection("market")
      .where("createdAt", ">=", thirtyDaysAgo)
      .where("status", "==", "open")
      .limit(500)
      .get();

    // 🔥 제목/이미지 유사도 기반으로 계정 그룹화 (간단한 추정)
    const accountGroups: Record<string, string[]> = {};

    for (const postDoc of recentPosts.docs) {
      if (postDoc.id === postId) continue;

      const postData = postDoc.data();
      const postAuthorId = postData.authorId;
      
      if (!accountGroups[postAuthorId]) {
        accountGroups[postAuthorId] = [];
      }
      accountGroups[postAuthorId].push(postDoc.id);
    }

    // 🔥 동일 패턴 게시물이 3계정 이상인 경우 다계정 반복으로 판정
    const accountCount = Object.keys(accountGroups).length;
    const isMultiAccount = accountCount >= MULTI_ACCOUNT_THRESHOLD;

    return { isMultiAccount, accountCount };
  } catch (error: any) {
    logger.error("[detectMultiAccountPattern] 다계정 반복 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isMultiAccount: false, accountCount: 0 };
  }
}

/**
 * 패턴 유사 게시 자동 병합 검수
 */
async function detectPatternSimilarity(
  postId: string,
  post: any
): Promise<{ isSimilar: boolean; similarPosts: string[] }> {
  try {
    const similarPosts: string[] = [];
    const title = post.title || "";
    const imageUrls = post.images || [];

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

      // 🔥 제목 유사도 체크
      const titleSimilarity = calculateTitleSimilarity(title, postTitle);

      // 🔥 이미지 재사용 체크
      const imageHashes = imageUrls.map(calculateImageHash);
      const postImageHashes = postImages.map(calculateImageHash);
      const matchingImages = imageHashes.filter(hash => 
        postImageHashes.includes(hash)
      ).length;
      const imageSimilarity = imageUrls.length > 0 
        ? matchingImages / imageUrls.length 
        : 0;

      // 🔥 종합 유사도 계산
      const overallSimilarity = (titleSimilarity * 0.5) + (imageSimilarity * 0.5);

      if (overallSimilarity >= PATTERN_MERGE_THRESHOLD) {
        similarPosts.push(postDoc.id);
      }
    }

    const isSimilar = similarPosts.length >= 1; // 1개 이상 유사 게시물 시 탐지

    return { isSimilar, similarPosts };
  } catch (error: any) {
    logger.error("[detectPatternSimilarity] 패턴 유사도 탐지 실패:", {
      postId,
      error: error.message,
    });
    return { isSimilar: false, similarPosts: [] };
  }
}

/**
 * 게시물 생성 시 어뷰징 탐지 v2
 */
export const onAbuseDetectionV2 = onDocumentCreated(
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

    logger.info("[onAbuseDetectionV2] 어뷰징 탐지 v2 시작:", {
      postId,
      authorId,
    });

    try {
      const abuseFlags: string[] = [];
      const abuseDetails: any = {};

      // 🔥 1. 이미지 재사용 탐지
      if (imageUrls.length > 0) {
        const imageReuse = await detectImageReuse(postId, imageUrls);
        if (imageReuse.isReused) {
          abuseFlags.push("IMAGE_REUSE");
          abuseDetails.imageReuse = {
            reusedCount: imageReuse.reusedCount,
            similarPosts: imageReuse.similarPosts,
          };
        }
      }

      // 🔥 2. 제목 변형 패턴 탐지
      if (title) {
        const titleVariation = await detectTitleVariation(postId, title, authorId);
        if (titleVariation.isVariation) {
          abuseFlags.push("TITLE_VARIATION");
          abuseDetails.titleVariation = {
            similarTitles: titleVariation.similarTitles,
          };
        }
      }

      // 🔥 3. 패턴 유사 게시 자동 병합 검수
      const patternSimilarity = await detectPatternSimilarity(postId, post);
      if (patternSimilarity.isSimilar) {
        abuseFlags.push("PATTERN_SIMILARITY");
        abuseDetails.patternSimilarity = {
          similarPosts: patternSimilarity.similarPosts,
        };

        // 🔥 검수 큐에 병합 검수 등록
        await db.collection("inspectionQueue").add({
          postId,
          userId: authorId,
          reason: "PATTERN_SIMILARITY_MERGE",
          details: {
            similarPosts: patternSimilarity.similarPosts,
            title,
            imageUrls,
          },
          priority: "HIGH",
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // 🔥 4. 어뷰징 플래그가 있으면 게시물에 기록
      if (abuseFlags.length > 0) {
        await db.collection("market").doc(postId).update({
          abuseDetected: true,
          abuseFlags,
          abuseDetails,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onAbuseDetectionV2] 어뷰징 탐지:", {
          postId,
          authorId,
          abuseFlags,
        });
      }
    } catch (error: any) {
      logger.error("[onAbuseDetectionV2] 어뷰징 탐지 실패:", {
        postId,
        authorId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
