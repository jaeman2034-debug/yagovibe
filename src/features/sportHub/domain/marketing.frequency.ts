/**
 * 🔥 Marketing Frequency - 빈도 제한
 * 
 * 1일 1회, 채널 중복 금지, 야간 발송 금지
 */

import type { Campaign, CampaignSendLog, UserSendHistory, MarketingChannel } from "./marketing.types";

/**
 * 오늘 발송 여부 확인
 */
export function hasSentToday(
  history: UserSendHistory,
  trigger: string
): boolean {
  const lastSent = history.lastSentAt[trigger as keyof typeof history.lastSentAt];
  if (!lastSent) return false;
  
  const lastSentDate = new Date(lastSent);
  const today = new Date();
  
  return (
    lastSentDate.getFullYear() === today.getFullYear() &&
    lastSentDate.getMonth() === today.getMonth() &&
    lastSentDate.getDate() === today.getDate()
  );
}

/**
 * 채널 중복 확인
 */
export function hasUsedChannelToday(
  history: UserSendHistory,
  channel: MarketingChannel
): boolean {
  return history.channelsUsedToday.has(channel);
}

/**
 * 일일 발송 한도 확인
 */
export function hasReachedDailyLimit(
  history: UserSendHistory,
  maxPerDay: number
): boolean {
  return history.sentCountToday >= maxPerDay;
}

/**
 * 최소 간격 확인
 */
export function hasRespectedMinInterval(
  history: UserSendHistory,
  trigger: string,
  minIntervalHours: number
): boolean {
  const lastSent = history.lastSentAt[trigger as keyof typeof history.lastSentAt];
  if (!lastSent) return true;
  
  const lastSentTime = new Date(lastSent).getTime();
  const now = Date.now();
  const hoursSinceLastSent = (now - lastSentTime) / (1000 * 60 * 60);
  
  return hoursSinceLastSent >= minIntervalHours;
}

/**
 * 발송 시간 확인
 */
export function isWithinSendTime(
  sendTimeStart?: string,
  sendTimeEnd?: string
): boolean {
  if (!sendTimeStart || !sendTimeEnd) {
    return true; // 시간 제한 없음
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMin] = sendTimeStart.split(":").map(Number);
  const [endHour, endMin] = sendTimeEnd.split(":").map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * 발송 가능 여부 종합 확인
 */
export function canSendCampaign(
  campaign: Campaign,
  history: UserSendHistory
): {
  canSend: boolean;
  reason?: string;
} {
  // 오늘 이미 발송했는지
  if (hasSentToday(history, campaign.trigger)) {
    return { canSend: false, reason: "오늘 이미 발송됨" };
  }
  
  // 일일 한도 확인
  if (hasReachedDailyLimit(history, campaign.maxPerDay)) {
    return { canSend: false, reason: "일일 발송 한도 초과" };
  }
  
  // 최소 간격 확인
  if (!hasRespectedMinInterval(history, campaign.trigger, campaign.minIntervalHours)) {
    return { canSend: false, reason: "최소 간격 미달" };
  }
  
  // 발송 시간 확인
  if (!isWithinSendTime(campaign.sendTimeStart, campaign.sendTimeEnd)) {
    return { canSend: false, reason: "발송 시간 외" };
  }
  
  // 채널 중복 확인 (같은 채널은 하루 1회만)
  for (const channel of campaign.channels) {
    if (hasUsedChannelToday(history, channel)) {
      return { canSend: false, reason: `채널 ${channel} 오늘 이미 사용됨` };
    }
  }
  
  return { canSend: true };
}

/**
 * 발송 이력 업데이트
 */
export function updateSendHistory(
  history: UserSendHistory,
  campaign: Campaign,
  channel: MarketingChannel
): UserSendHistory {
  const now = new Date().toISOString();
  
  return {
    ...history,
    lastSentAt: {
      ...history.lastSentAt,
      [campaign.trigger]: now,
    },
    sentCountToday: history.sentCountToday + 1,
    channelsUsedToday: new Set([...history.channelsUsedToday, channel]),
  };
}
