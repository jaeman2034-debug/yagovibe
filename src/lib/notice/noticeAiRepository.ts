/**
 * 🔥 공지 기반 AI 답변 초안 Repository
 * Step 1: AI 자동 답변 (초안)
 */

import { auth } from "@/lib/firebase";

// Cloud Run URL (기존 대회 운영 Functions와 동일)
const FUNCTIONS_ORIGIN =
  import.meta.env.VITE_FUNCTIONS_ORIGIN ||
  "https://api-2q3hdcfwca-du.a.run.app";

/**
 * AI 답변 초안 생성
 * 관리자만 호출 가능
 * FAQ를 우선 참고하여 답변 생성
 * 참가비 정책이 있으면 자동 계산 포함
 */
export async function generateNoticeAIDraft(params: {
  noticeTitle: string;
  noticeContent: string;
  userQuestion: string;
  faqs?: Array<{ question: string; answer: string }>;
  feePolicy?: {
    baseFee: number;
    baseTeamCount: number;
    extraFeePerTeam: number;
  };
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const idToken = await user.getIdToken();

  const res = await fetch(`${FUNCTIONS_ORIGIN}/generateNoticeAIDraft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      noticeTitle: params.noticeTitle,
      noticeContent: params.noticeContent,
      userQuestion: params.userQuestion,
      faqs: params.faqs || [],
      feePolicy: params.feePolicy || null,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "AI_DRAFT_FAILED");
  }

  return data.draft as string;
}

