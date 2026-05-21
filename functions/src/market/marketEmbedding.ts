/**
 * 🔥 Market 문서 임베딩 자동 생성 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - market 문서 작성/수정 시 자동으로 임베딩 생성
 * - 제목+카테고리+태그 기반 시맨틱 검색 지원
 */

import { onDocumentWritten, onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { createEmbedding } from "./embedding";

/**
 * Market 문서 작성 시 임베딩 자동 생성
 */
export const onMarketCreated = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const postId = event.params.postId;

    // 🔥 필수 필드 확인
    if (!data.title) {
      logger.warn("[onMarketCreated] 제목 없음, 임베딩 생성 스킵:", { postId });
      return;
    }

    try {
      // 🔥 임베딩 생성 및 저장
      await createEmbedding(
        postId,
        data.title,
        data.category,
        data.tags || []
      );

      logger.info("[onMarketCreated] 임베딩 생성 완료:", {
        postId,
        title: data.title,
        category: data.category,
      });
    } catch (error: any) {
      logger.error("[onMarketCreated] 임베딩 생성 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
      // 실패해도 문서 저장은 성공했으므로 계속 진행
    }
  }
);

/**
 * Market 문서 수정 시 임베딩 자동 업데이트 (제목/카테고리 변경 시)
 */
export const onMarketUpdated = onDocumentUpdated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const postId = event.params.postId;

    // 🔥 제목/카테고리/태그 변경 시에만 임베딩 업데이트
    const titleChanged = before.title !== after.title;
    const categoryChanged = before.category !== after.category;
    const tagsChanged = JSON.stringify(before.tags || []) !== JSON.stringify(after.tags || []);

    if (!titleChanged && !categoryChanged && !tagsChanged) {
      return; // 변경 없음
    }

    if (!after.title) {
      logger.warn("[onMarketUpdated] 제목 없음, 임베딩 생성 스킵:", { postId });
      return;
    }

    try {
      // 🔥 임베딩 재생성 및 저장
      await createEmbedding(
        postId,
        after.title,
        after.category,
        after.tags || []
      );

      logger.info("[onMarketUpdated] 임베딩 업데이트 완료:", {
        postId,
        title: after.title,
        category: after.category,
        changedFields: {
          title: titleChanged,
          category: categoryChanged,
          tags: tagsChanged,
        },
      });
    } catch (error: any) {
      logger.error("[onMarketUpdated] 임베딩 업데이트 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
