// src/utils/notifiers/index.ts
// 🔥 Notifier 모듈 통합 export (프로덕션 급 구조)
//
// 사용법:
// import { Contact, Notifier, Message, SendResult } from '@/utils/notifiers';
// import { KakaoAlimtalkNotifier } from '@/utils/notifiers';

// 🔥 모든 타입 및 인터페이스 export (export * 사용 - 타입과 값 모두 export)
export * from './Notifier';

// 🔥 구현체 export
export { KakaoAlimtalkNotifier, KAKAO_TEMPLATE_CODES } from './KakaoAlimtalkNotifier';
export { SmsNotifier } from './SmsNotifier';
export { PushNotifier } from './PushNotifier';

// 🔥 Factory export
export { getNotifier, getNotifiers, getNotifierWithFallback } from './factory';

// 🔥 타입 재export (호환성)
export type { KakaoTemplateCode } from './KakaoAlimtalkNotifier';

