/**
 * 🔥 임베딩 파이프라인 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 제목+태그 → 임베딩 생성
 * - vector index 저장
 * - 시맨틱 검색 지원
 */

import { logger } from "firebase-functions/v2";
import { db, Timestamp } from "../firebase";

/**
 * 임베딩 생성 (OpenAI API 또는 Google Vertex AI 사용)
 * 
 * 실제 프로덕션에서는 OpenAI embeddings API 또는 Vertex AI 사용 권장
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 🔥 TODO: 실제 임베딩 API 호출
  // 예시: OpenAI
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-3-small",
  //   input: text,
  // });
  // return response.data[0].embedding;

  // 🔥 임시: 더미 임베딩 (실제 구현 필요)
  // 실제로는 OpenAI 또는 Google Vertex AI를 사용해야 함
  const dimension = 384; // 작은 모델 기준
  return new Array(dimension).fill(0).map(() => Math.random() * 2 - 1);
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * 텍스트에서 임베딩 생성 및 저장
 */
export async function createEmbedding(
  docId: string,
  title: string,
  category?: string,
  tags?: string[]
): Promise<number[]> {
  // 🔥 검색 가능한 텍스트 구성
  const searchText = [
    title,
    category || "",
    ...(tags || []),
  ]
    .filter(Boolean)
    .join(" ");

  // 🔥 임베딩 생성
  const embedding = await generateEmbedding(searchText);

  // 🔥 Firestore에 저장
  await db.collection("market").doc(docId).update({
    embedding,
    embeddingUpdatedAt: new Date(),
  });

  logger.info("[createEmbedding] 임베딩 생성 완료:", {
    docId,
    textLength: searchText.length,
    embeddingDimension: embedding.length,
  });

  return embedding;
}

/**
 * 시맨틱 검색 (임베딩 기반)
 */
export async function semanticSearch(
  query: string,
  limit: number = 20
): Promise<Array<{ id: string; score: number; data: any }>> {
  // 🔥 쿼리 임베딩 생성
  const queryEmbedding = await generateEmbedding(query);

  // 🔥 모든 market 문서 조회 (실제로는 인덱스 사용 권장)
  const marketSnap = await db
    .collection("market")
    .where("status", "==", "open")
    .limit(100) // 성능을 위해 제한
    .get();

  const results: Array<{ id: string; score: number; data: any }> = [];

  for (const doc of marketSnap.docs) {
    const data = doc.data();
    const embedding = data.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      continue;
    }

    // 🔥 코사인 유사도 계산
    const similarity = cosineSimilarity(queryEmbedding, embedding);

    if (similarity > 0.3) {
      // 임계값 이상만 포함
      results.push({
        id: doc.id,
        score: similarity,
        data: { ...data, id: doc.id },
      });
    }
  }

  // 🔥 유사도 순으로 정렬
  results.sort((a, b) => b.score - a.score);

  logger.info("[semanticSearch] 검색 완료:", {
    query,
    totalResults: results.length,
    returnedResults: Math.min(results.length, limit),
  });

  return results.slice(0, limit);
}
