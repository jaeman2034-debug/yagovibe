// src/constants/blogShareMessages.ts
// 🔥 6-2: A/B 공유 메시지 템플릿 (전환율 2배 목표)

export const BLOG_SHARE_MESSAGES = {
  // A안: 신뢰 중심 (AI 자동 정리 강조)
  A: {
    title: "우리 팀 활동 기록을 AI가 자동으로 정리해주네요",
    message: "우리 팀 활동 기록을 AI가 자동으로 정리해주네요.\n이게 우리 팀 블로그입니다👇",
    emoji: "🤖",
    tone: "신뢰",
  },
  
  // B안: 호기심 중심 (간단한 소개)
  B: {
    title: "팀 블로그 만들어봤는데 괜찮네요",
    message: "팀 블로그 만들어봤는데 괜찮네요.\n활동 기록이 자동으로 정리되더라구요👇",
    emoji: "✨",
    tone: "호기심",
  },
  
  // C안: 행동 유도 중심 (다른 팀도 만들게)
  C: {
    title: "이거 보니까 우리 팀도 블로그 만들어야겠다",
    message: "이거 보니까 우리 팀도 블로그 만들어야겠다.\nAI가 자동으로 글 써주네요👇",
    emoji: "💡",
    tone: "행동유도",
  },
} as const;

export type ShareMessageVariant = keyof typeof BLOG_SHARE_MESSAGES;

/**
 * 🔥 A/B 테스트용 메시지 선택
 * 조회수 기반으로 자동 선택 (초기에는 랜덤)
 */
export function getShareMessage(variant?: ShareMessageVariant): typeof BLOG_SHARE_MESSAGES.A {
  if (variant && variant in BLOG_SHARE_MESSAGES) {
    return BLOG_SHARE_MESSAGES[variant];
  }
  
  // 기본: A안 (신뢰 중심)
  return BLOG_SHARE_MESSAGES.A;
}

/**
 * 🔥 전환율 추적용 메타데이터
 */
export interface ShareMessageMetadata {
  variant: ShareMessageVariant;
  timestamp: number;
  teamId: string;
  teamSlug: string;
}

