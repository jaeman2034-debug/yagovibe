/**
 * 🎯 대화 기반 자동 후기 생성 유틸리티
 * 거래 완료 시 채팅 내용을 요약하여 후기 초안 자동 생성
 */

/**
 * 채팅 메시지 요약
 */
export interface ChatSummary {
  fastResponse: boolean; // 응답 속도 빠름
  noHaggle: boolean; // 가격 협의 없음
  directDeal: boolean; // 직거래
  friendly: boolean; // 친근한 톤
  clearPrice: boolean; // 가격 명확
}

export function summarizeChat(messages: Array<{ text?: string; uid?: string }>): ChatSummary {
  const summary: ChatSummary = {
    fastResponse: false,
    noHaggle: false,
    directDeal: false,
    friendly: false,
    clearPrice: false,
  };

  if (!messages || messages.length === 0) {
    return summary;
  }

  // 모든 메시지 텍스트 결합
  const allText = messages.map(m => m.text || "").join(" ").toLowerCase();

  // 응답 속도 빠름
  if (/바로|금방|곧|즉시|빠르/.test(allText)) {
    summary.fastResponse = true;
  }

  // 가격 협의 없음 (명확한 가격, 협상 거부)
  if (/가격.*명확|가격.*최저|에눌.*어려|조정.*어려|현재.*가격/.test(allText)) {
    summary.noHaggle = true;
  }

  // 직거래
  if (/직거래|근처|직접|만나서/.test(allText)) {
    summary.directDeal = true;
  }

  // 친근한 톤
  if (/감사|좋아|만족|편하|수월|깔끔/.test(allText)) {
    summary.friendly = true;
  }

  // 가격 명확
  if (/원.*가능|원에|가격.*원/.test(allText)) {
    summary.clearPrice = true;
  }

  return summary;
}

/**
 * 후기 문장 생성
 */
export function generateReview(summary: ChatSummary, role: "buyer" | "seller"): string {
  const lines: string[] = [];

  // 응답 속도
  if (summary.fastResponse) {
    lines.push("응답이 빠르고 소통이 원활했어요.");
  }

  // 가격 명확
  if (summary.clearPrice || summary.noHaggle) {
    lines.push("가격이 명확해서 거래가 깔끔했습니다.");
  }

  // 직거래
  if (summary.directDeal) {
    lines.push("직거래 진행이 수월했어요.");
  }

  // 친근한 톤
  if (summary.friendly) {
    lines.push("전반적으로 만족스러운 거래였습니다.");
  }

  // 기본 후기 (아무것도 매칭되지 않은 경우)
  if (lines.length === 0) {
    lines.push("전반적으로 만족스러운 거래였습니다.");
  }

  // 역할별 톤 조정
  if (role === "seller") {
    // 판매자 입장에서는 구매자에 대한 후기
    return lines.join(" ");
  } else {
    // 구매자 입장에서는 판매자에 대한 후기
    return lines.join(" ");
  }
}

/**
 * 후기 초안 생성 (메시지 배열 기반)
 */
export function generateReviewDraft(
  messages: Array<{ text?: string; uid?: string }>,
  role: "buyer" | "seller"
): string {
  const summary = summarizeChat(messages);
  return generateReview(summary, role);
}

