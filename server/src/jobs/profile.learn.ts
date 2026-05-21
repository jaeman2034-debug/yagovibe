/**
 * 🔥 Profile Learn - 프로필 학습 (로그 기반)
 * 
 * Week4 핵심: 클릭 로그 기반 자동 학습
 */

import { prisma } from "../data/prisma";

const LEARNING_RATE = 0.3; // 학습률
const MAX_WEIGHT = 5.0; // 최대 가중치

/**
 * 로그 기반 프로필 학습
 * 
 * @param userId 사용자 ID
 * @param category 클릭한 스토리 카테고리
 */
export async function learnFromLog(
  userId: string,
  category: string
): Promise<void> {
  if (!userId) {
    return;
  }

  // 프로필 조회 또는 생성
  let profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    // 기본 프로필 생성
    profile = await prisma.userProfile.create({
      data: {
        id: userId,
        region: "seoul",
        wLeague: 1.0,
        wRecruit: 1.0,
        wGround: 1.0,
        wMarket: 1.0,
      },
    });
  }

  // 카테고리별 가중치 업데이트
  const field =
    category === "대회"
      ? "wLeague"
      : category === "모집"
      ? "wRecruit"
      : category === "구장"
      ? "wGround"
      : category === "마켓"
      ? "wMarket"
      : null;

  if (!field) {
    return;
  }

  const currentWeight = (profile as any)[field] as number;
  const newWeight = Math.min(currentWeight + LEARNING_RATE, MAX_WEIGHT);

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      [field]: newWeight,
    },
  });

  console.log(
    `[PROFILE_LEARN] User ${userId}: ${category} weight ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)}`
  );
}

/**
 * 프로필 초기화 (테스트용)
 */
export async function resetProfile(userId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      wLeague: 1.0,
      wRecruit: 1.0,
      wGround: 1.0,
      wMarket: 1.0,
    },
  });
}
