// src/utils/notifiers/factory.ts
// 🔥 Notifier Factory: 채널별 Notifier 인스턴스 생성

import type { NotificationChannel } from "@/domain/notification/types";
import type { Notifier } from "./Notifier";
import { KakaoAlimtalkNotifier } from "./KakaoAlimtalkNotifier";
import { SmsNotifier } from "./SmsNotifier";
import { PushNotifier } from "./PushNotifier";
// import { EmailNotifier } from "./EmailNotifier"; // TODO: 구현 예정

/**
 * 채널별 Notifier 인스턴스 캐시
 */
const notifierCache = new Map<NotificationChannel, Notifier>();

/**
 * Notifier Factory: 채널에 맞는 Notifier 인스턴스 반환
 * 
 * @param channel 알림 채널
 * @returns Notifier 인스턴스
 * @throws Error 지원하지 않는 채널인 경우
 * 
 * @example
 * ```ts
 * const notifier = getNotifier('kakao');
 * await notifier.send(payload);
 * ```
 */
export function getNotifier(channel: NotificationChannel): Notifier {
  // 캐시에서 확인
  if (notifierCache.has(channel)) {
    return notifierCache.get(channel)!;
  }

  // 새 인스턴스 생성
  let notifier: Notifier;

  switch (channel) {
    case "kakao":
      notifier = new KakaoAlimtalkNotifier();
      break;
    case "sms":
      notifier = new SmsNotifier();
      break;
    case "push":
      notifier = new PushNotifier();
      break;
    case "email":
      // TODO: EmailNotifier 구현 후 활성화
      throw new Error(`이메일 알림은 아직 구현되지 않았습니다.`);
    default:
      throw new Error(`지원하지 않는 알림 채널: ${channel}`);
  }

  // 캐시에 저장
  notifierCache.set(channel, notifier);
  return notifier;
}

/**
 * 여러 채널에 대해 Notifier 인스턴스 반환
 * 
 * @param channels 알림 채널 배열
 * @returns Notifier 인스턴스 배열
 */
export function getNotifiers(channels: NotificationChannel[]): Notifier[] {
  return channels.map((channel) => getNotifier(channel));
}

/**
 * 채널 우선순위에 따라 사용 가능한 첫 번째 Notifier 반환
 * 
 * @param channels 우선순위가 높은 순서대로 채널 배열
 * @returns 사용 가능한 첫 번째 Notifier 또는 null
 * 
 * @example
 * ```ts
 * // 카카오 → SMS → Push 순서로 시도
 * const notifier = getNotifierWithFallback(['kakao', 'sms', 'push']);
 * if (notifier) {
 *   await notifier.send(payload);
 * }
 * ```
 */
export function getNotifierWithFallback(
  channels: NotificationChannel[]
): Notifier | null {
  for (const channel of channels) {
    try {
      return getNotifier(channel);
    } catch (error) {
      // 다음 채널 시도
      continue;
    }
  }
  return null;
}

