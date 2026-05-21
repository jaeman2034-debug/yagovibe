/**
 * 🔥 Marketing Engine - 마케팅 자동화 엔진
 * 
 * Event → Segment → AB → Send → Log → Re-rank
 */

import type { Campaign, UserSendHistory, UserProfile } from "./marketing.types";
import { matchSegment } from "./marketing.segment";
import { selectABVariant, logCampaignAB } from "./marketing.ab";
import { canSendCampaign, updateSendHistory } from "./marketing.frequency";
import { generateTriggerMessage } from "./marketing.triggers";

/**
 * 캠페인 실행 결과
 */
export type CampaignExecutionResult = {
  campaignId: string;
  userId: string;
  sent: boolean;
  channel?: string;
  message?: string;
  variant?: "A" | "B";
  reason?: string;
};

/**
 * 마케팅 엔진 실행
 */
export function executeCampaign(
  campaign: Campaign,
  user: UserProfile,
  history: UserSendHistory,
  context?: Record<string, any>
): CampaignExecutionResult {
  // 1. 세그먼트 매칭
  if (!matchSegment(user, campaign.segment)) {
    return {
      campaignId: campaign.id,
      userId: user.userId,
      sent: false,
      reason: "세그먼트 불일치",
    };
  }
  
  // 2. 빈도 제한 확인
  const frequencyCheck = canSendCampaign(campaign, history);
  if (!frequencyCheck.canSend) {
    return {
      campaignId: campaign.id,
      userId: user.userId,
      sent: false,
      reason: frequencyCheck.reason,
    };
  }
  
  // 3. AB 변형 선택
  const { variant, message } = selectABVariant(campaign, user.userId);
  
  // 4. 트리거 메시지 생성
  const triggerMessage = generateTriggerMessage(campaign.trigger, context || {});
  const finalMessage = message || triggerMessage;
  
  // 5. 채널 선택 (우선순위: push > in_app > kakao > sms)
  const channelPriority: Array<Campaign["channels"][0]> = ["push", "in_app", "kakao", "sms"];
  const selectedChannel = campaign.channels.find((ch) =>
    channelPriority.includes(ch)
  ) || campaign.channels[0];
  
  // 6. 발송 (실제 구현: 채널별 API 호출)
  // sendToChannel(selectedChannel, user.userId, finalMessage);
  
  // 7. 로그 기록
  logCampaignAB(campaign, user.userId, variant, "impression");
  
  // 8. 이력 업데이트
  const updatedHistory = updateSendHistory(history, campaign, selectedChannel);
  
  return {
    campaignId: campaign.id,
    userId: user.userId,
    sent: true,
    channel: selectedChannel,
    message: finalMessage,
    variant,
  };
}

/**
 * 사용자별 캠페인 우선순위 정렬
 */
export function prioritizeCampaignsForUser(
  campaigns: Campaign[],
  user: UserProfile
): Campaign[] {
  return campaigns
    .filter((c) => c.enabled && matchSegment(user, c.segment))
    .sort((a, b) => {
      // 우선순위 점수 계산
      const scoreA = calculateCampaignScore(a, user);
      const scoreB = calculateCampaignScore(b, user);
      return scoreB - scoreA;
    });
}

/**
 * 캠페인 점수 계산
 */
function calculateCampaignScore(
  campaign: Campaign,
  user: UserProfile
): number {
  let score = campaign.priority;
  
  // 지역 일치 보너스
  if (campaign.region === user.region) {
    score += 20;
  }
  
  // 레벨 일치 보너스
  if (campaign.segment.level === user.level) {
    score += 15;
  }
  
  // 카테고리 일치 보너스
  if (campaign.segment.category && user.interests) {
    const matchCount = campaign.segment.category.filter((cat) =>
      user.interests!.includes(cat)
    ).length;
    score += matchCount * 10;
  }
  
  return score;
}

/**
 * 일괄 캠페인 실행 (배치)
 */
export function executeCampaignsBatch(
  campaigns: Campaign[],
  users: UserProfile[],
  histories: Map<string, UserSendHistory>,
  context?: Map<string, Record<string, any>>
): CampaignExecutionResult[] {
  const results: CampaignExecutionResult[] = [];
  
  for (const user of users) {
    const history = histories.get(user.userId) || {
      userId: user.userId,
      lastSentAt: {} as any,
      sentCountToday: 0,
      channelsUsedToday: new Set(),
    };
    
    const userContext = context?.get(user.userId) || {};
    
    // 사용자별 우선순위 정렬
    const prioritized = prioritizeCampaignsForUser(campaigns, user);
    
    // 최대 1개 캠페인만 발송 (하루 1회 원칙)
    for (const campaign of prioritized) {
      const result = executeCampaign(campaign, user, history, userContext);
      results.push(result);
      
      if (result.sent) {
        // 발송 성공 시 중단 (하루 1회)
        break;
      }
    }
  }
  
  return results;
}
