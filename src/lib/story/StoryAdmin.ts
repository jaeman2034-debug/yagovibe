/**
 * 🔥 Story Admin - 최소 관리 스키마
 * 
 * 역할:
 * - 스토리 CRUD 작업
 * - 우선순위 토글
 * - 카테고리 선택
 * - CTA 자동 설정
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story, StoryStatus, StoryCTA } from "@/types/story";

// Admin 스토리 생성 데이터
export interface StoryCreateData {
  sport: "soccer";
  region?: string;
  source: "ops" | "user";
  type: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  title: string;
  subtitle?: string;
  ctaType: StoryCTA;
  ctaLabel?: string;
  ctaTarget?: string;
  expiresAt: number; // Timestamp seconds
  metadata?: {
    associationId?: string;
    tournamentName?: string;
    [key: string]: any;
  };
}

// Admin 스토리 업데이트 데이터
export interface StoryUpdateData {
  title?: string;
  subtitle?: string;
  mediaUrl?: string;
  posterUrl?: string;
  ctaType?: StoryCTA;
  ctaLabel?: string;
  ctaTarget?: string;
  status?: StoryStatus;
  expiresAt?: number;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 스토리 생성
 */
export async function createStory(
  data: StoryCreateData,
  createdBy: string
): Promise<string> {
  try {
    const now = Timestamp.now().seconds;
    
    const storyData = {
      sport: data.sport,
      region: data.region || null,
      source: data.source,
      type: data.type,
      mediaUrl: data.mediaUrl,
      posterUrl: data.posterUrl || null,
      title: data.title,
      subtitle: data.subtitle || null,
      cta: {
        type: data.ctaType,
        label: data.ctaLabel || getDefaultCtaLabel(data.ctaType),
        target: data.ctaTarget || null,
      },
      stats: {
        views: 0,
        likes: 0,
      },
      status: "published" as StoryStatus,
      expiresAt: data.expiresAt,
      createdAt: now,
      createdBy,
      metadata: data.metadata || {},
    };

    const docRef = await addDoc(collection(db, "stories"), storyData);
    return docRef.id;
  } catch (error) {
    console.error("[StoryAdmin] 생성 실패:", error);
    throw error;
  }
}

/**
 * 스토리 업데이트
 */
export async function updateStory(
  storyId: string,
  data: StoryUpdateData
): Promise<void> {
  try {
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl;
    if (data.posterUrl !== undefined) updateData.posterUrl = data.posterUrl;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    
    if (data.ctaType || data.ctaLabel || data.ctaTarget !== undefined) {
      const storyDoc = await getDoc(doc(db, "stories", storyId));
      const currentStory = storyDoc.data() as Story;
      
      updateData.cta = {
        type: data.ctaType || currentStory.cta.type,
        label: data.ctaLabel || currentStory.cta.label,
        target: data.ctaTarget !== undefined ? data.ctaTarget : currentStory.cta.target,
      };
    }

    await updateDoc(doc(db, "stories", storyId), updateData);
  } catch (error) {
    console.error("[StoryAdmin] 업데이트 실패:", error);
    throw error;
  }
}

/**
 * 스토리 삭제
 */
export async function deleteStory(storyId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "stories", storyId));
  } catch (error) {
    console.error("[StoryAdmin] 삭제 실패:", error);
    throw error;
  }
}

/**
 * 스토리 목록 조회 (Admin용)
 */
export async function getAdminStories(
  limitCount: number = 50
): Promise<Story[]> {
  try {
    const q = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[];
  } catch (error) {
    console.error("[StoryAdmin] 조회 실패:", error);
    throw error;
  }
}

/**
 * 스토리 상태 변경
 */
export async function updateStoryStatus(
  storyId: string,
  status: StoryStatus
): Promise<void> {
  try {
    await updateDoc(doc(db, "stories", storyId), { status });
  } catch (error) {
    console.error("[StoryAdmin] 상태 변경 실패:", error);
    throw error;
  }
}

/**
 * 기본 CTA 라벨 자동 설정
 */
function getDefaultCtaLabel(ctaType: StoryCTA): string {
  const labelMap: Record<StoryCTA, string> = {
    teams: "팀 찾기",
    match_today: "일정 보기",
    market: "보러가기",
    venues: "예약하기",
    my_team: "내 팀",
    external: "자세히",
  };
  return labelMap[ctaType] || "자세히";
}
