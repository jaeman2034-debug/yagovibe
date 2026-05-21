/**
 * 스토리 자동 생성 유틸리티
 * 
 * 시스템 로그 → 스토리 문장 변환
 * 
 * 원칙:
 * - 감정 없음
 * - 평가 없음
 * - 사실만
 * - verified=true만 생성
 * - 공식 소스 없으면 생성 안 함
 */

import type { Story, StoryType } from "@/types/story";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { logAdminAction } from "@/lib/logAdminAction";

interface StoryGenerationParams {
  personId: string;
  personName: string;
  type: StoryType;
  associationId?: string;
  tournamentId?: string;
  tournamentName?: string;
  clubId?: string;
  clubName?: string;
  role?: string;
  contributionType?: string;
}

/**
 * 시스템 로그를 스토리 문장으로 변환
 */
/**
 * 시스템 문장 생성 규칙 (사실만)
 * 
 * 원칙:
 * - 감정/평가/의견 ❌
 * - 날짜·역할·대회명 ⭕
 * - 사실만 기록
 */
function generateStoryDescription(params: StoryGenerationParams): string {
  switch (params.type) {
    case "tournament_participation":
      // 예: "제36회 노원구청장기 축구대회에 공식 참가 선수로 참여했습니다."
      return `${params.tournamentName || "대회"}에 공식 참가 선수로 참여했습니다.`;

    case "official_role":
      return `${params.role || "공식 역할"}로 활동했습니다.`;

    case "public_contribution":
      return `공공의 이익에 기여하는 활동에 참여했습니다.`;

    case "club_operation":
      return `${params.clubName || "클럽"} 운영에 참여했습니다.`;

    case "roster_submission":
      // 예: "제36회 노원구청장기 축구대회 선수 명단을 제출했습니다."
      return `${params.tournamentName || "대회"} 선수 명단을 제출했습니다.`;

    default:
      return "활동 기록이 생성되었습니다.";
  }
}

function generateStoryTitle(params: StoryGenerationParams): string {
  switch (params.type) {
    case "tournament_participation":
      return `${params.tournamentName || "대회"}에 공식 참가했습니다.`;

    case "official_role":
      return `${params.role || "공식 역할"}으로 등록되었습니다.`;

    case "public_contribution":
      return `공공의 이익에 기여하는 활동에 참여했습니다.`;

    case "club_operation":
      return `${params.clubName || "클럽"} 운영에 참여했습니다.`;

    case "roster_submission":
      return `${params.tournamentName || "대회"} 선수 명단을 제출했습니다.`;

    default:
      return "활동 기록";
  }
}

/**
 * 스토리 카드 데이터 생성 (저장 안 함)
 */
export function generateStoryData(params: StoryGenerationParams): Omit<Story, "id"> {
  return {
    personId: params.personId,
    personName: params.personName,
    associationId: params.associationId,
    tournamentId: params.tournamentId,
    clubId: params.clubId,
    type: params.type,
    title: generateStoryTitle(params),
    description: generateStoryDescription(params),
    verified: true, // 항상 true (임시/미검증 스토리 ❌)
    metadata: {
      tournamentName: params.tournamentName,
      role: params.role,
      clubName: params.clubName,
      contributionType: params.contributionType,
    },
    createdAt: Timestamp.now(),
  };
}

/**
 * 스토리 생성 금지 조건 체크
 */
function canCreateStory(params: StoryGenerationParams): { allowed: boolean; reason?: string } {
  // 공식 소스 없으면 생성 안 함
  if (!params.associationId && !params.tournamentId && !params.clubId) {
    return { allowed: false, reason: "공식 소스 없음" };
  }

  // 필수 정보 확인
  if (!params.personId || !params.personName) {
    return { allowed: false, reason: "사용자 정보 없음" };
  }

  return { allowed: true };
}

/**
 * 스토리 카드 생성 및 저장
 */
export async function createStory(
  params: StoryGenerationParams
): Promise<string | null> {
  // 스토리 생성 금지 조건 체크
  const check = canCreateStory(params);
  if (!check.allowed) {
    console.warn(`[STORY_CREATE_BLOCKED] ${check.reason}`, params);
    return null;
  }

  try {
    const storyData = generateStoryData(params);

    const storiesRef = collection(db, "stories");
    const docRef = await addDoc(storiesRef, {
      ...storyData,
      createdAt: serverTimestamp(),
    });

    // 로그 기록
    await logAdminAction(
      "STORY_CREATED",
      `스토리 생성: ${params.type}`,
      {
        storyId: docRef.id,
        type: params.type,
        personId: params.personId,
        source: params.tournamentId
          ? "tournament"
          : params.associationId
          ? "association"
          : "club",
      }
    );

    return docRef.id;
  } catch (error) {
    console.error("[STORY_CREATE_ERROR]", error);
    return null;
  }
}

/**
 * 대회 참가 확정 시 스토리 생성
 */
export async function createTournamentParticipationStory(
  personId: string,
  personName: string,
  tournamentId: string,
  tournamentName: string,
  associationId: string
): Promise<string | null> {
  return createStory({
    personId,
    personName,
    type: "tournament_participation",
    tournamentId,
    tournamentName,
    associationId,
  });
}

/**
 * 공식 역할 등록 시 스토리 생성
 */
export async function createOfficialRoleStory(
  personId: string,
  personName: string,
  associationId: string,
  role: string
): Promise<string | null> {
  return createStory({
    personId,
    personName,
    type: "official_role",
    associationId,
    role,
  });
}

/**
 * 공공 기여 활동 시 스토리 생성
 */
export async function createPublicContributionStory(
  personId: string,
  personName: string,
  associationId: string,
  contributionType?: string
): Promise<string | null> {
  return createStory({
    personId,
    personName,
    type: "public_contribution",
    associationId,
    contributionType,
  });
}

/**
 * 선수 명단 제출 시 스토리 생성
 */
export async function createRosterSubmissionStory(
  personId: string,
  personName: string,
  tournamentId: string,
  tournamentName: string,
  associationId: string
): Promise<string | null> {
  return createStory({
    personId,
    personName,
    type: "roster_submission",
    tournamentId,
    tournamentName,
    associationId,
  });
}

/**
 * 클럽 운영 등록 시 스토리 생성
 */
export async function createClubOperationStory(
  personId: string,
  personName: string,
  clubId: string,
  clubName: string,
  associationId?: string
): Promise<string | null> {
  return createStory({
    personId,
    personName,
    type: "club_operation",
    clubId,
    clubName,
    associationId,
  });
}
