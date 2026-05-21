/**
 * 모집 단체방 보장 — 항상 `chatRooms` (거래용 `chats/` 와 무관)
 *
 * - 방 ID: `teamRecruit_${postId}` (deterministic)
 * - 문서 type: `recruit_group` (기존 가드·UI 호환) + `recruitId` 로 조회 편의
 */

import { ensureRecruitRoom } from "@/lib/chat/room";

export type EnsureRecruitChatRoomParams = {
  postId: string;
  userId: string;
  authorId: string;
  postTitle?: string;
  postSnapshot?: {
    title?: string;
    images?: string[];
    imageUrl?: string;
  };
};

/**
 * @returns chatRooms 문서 ID (예: teamRecruit_xxx)
 */
export async function ensureRecruitChatRoom(params: EnsureRecruitChatRoomParams): Promise<string> {
  return ensureRecruitRoom(params);
}
