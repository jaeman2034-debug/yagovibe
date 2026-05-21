# 🔔 알림 인터페이스 표준화 - FINAL SPEC

## 🎯 핵심 원칙

**"비즈니스 로직은 알림 채널을 몰라도 된다."**

→ 채널 교체 / 추가 / 비활성화가 코드 수정 없이 가능

### 설계 원칙

1. **채널 독립**: 회비 / 일정 / 리포트 로직은 SMS인지, 카카오인지, 푸시인지 모름
2. **인터페이스 단일화**: 모든 알림은 동일한 Payload 구조
3. **실패 허용 (Fail-safe)**: 알림 실패 ≠ 비즈니스 실패

---

## 📦 구조

```
src/
├── domain/
│   └── notification/
│       └── types.ts          # 공통 타입 정의
├── utils/
│   └── notifiers/
│       ├── Notifier.ts       # 인터페이스 정의
│       ├── KakaoAlimtalkNotifier.ts
│       ├── SmsNotifier.ts
│       ├── PushNotifier.ts
│       ├── factory.ts        # Factory 패턴
│       └── index.ts          # 통합 export
└── services/
    └── notificationService.ts  # 비즈니스 진입점
```

---

## 🔧 사용법

### 기본 사용 (권장)

```typescript
import { notify } from '@/services/notificationService';
import type { NotificationPayload } from '@/domain/notification/types';

// 회비 완납 알림
await notify({
  event: 'FEE_PAID',
  channel: 'kakao',
  target: {
    userId: memberId,
    phoneE164: '+821012345678',
    name: '홍길동'
  },
  message: '✅ 2025-01 회비가 완납 처리되었습니다.',
  templateId: 'fee_paid_v1',
  teamId: teamId,
  memberId: memberId
});
```

### 채널 변경 (코드 수정 최소화)

```typescript
// 카카오 → SMS로 변경하려면
await notify({
  event: 'FEE_PAID',
  channel: 'sms',  // 👈 이것만 바꾸면 끝
  target: { ... },
  message: '...',
});
```

### Fallback 전략 (여러 채널 시도)

```typescript
import { notifyWithFallback } from '@/services/notificationService';

// 카카오 → SMS → Push 순서로 시도
await notifyWithFallback(
  {
    event: 'FEE_OVERDUE',
    target: { userId, phoneE164, name },
    message: '회비 미납 알림',
  },
  ['kakao', 'sms', 'push']  // 우선순위 순서
);
```

---

## 📋 타입 정의

### NotificationChannel

```typescript
type NotificationChannel = "kakao" | "sms" | "push" | "email";
```

### NotificationEvent

```typescript
type NotificationEvent =
  | "FEE_PAID"              // 회비 완납
  | "FEE_OVERDUE"           // 회비 미납
  | "FEE_REMINDER"          // 회비 알림
  | "MONTHLY_REPORT"        // 월간 리포트
  | "MATCH_REMINDER"        // 경기 일정 알림
  | "MEMBER_PAUSED"         // 회원 휴원 처리
  | "MEMBER_ATTENTION_NEEDED"; // 회원 주의 필요
```

### NotificationPayload

```typescript
interface NotificationPayload {
  // 필수
  event: NotificationEvent;
  channel: NotificationChannel;
  target: NotificationTarget;
  message: string;

  // 선택
  title?: string;
  templateId?: string;
  templateCode?: string;
  variables?: Record<string, string>;
  data?: Record<string, any>;
  teamId?: string;
  memberId?: string;
  priority?: "low" | "normal" | "high";
}
```

---

## 🎨 실제 사용 예시

### 1. 회비 완납 알림

```typescript
await notify({
  event: 'FEE_PAID',
  channel: 'kakao',
  target: {
    userId: memberId,
    phoneE164: member.phoneE164,
    name: member.name
  },
  message: `✅ ${month} 회비가 완납 처리되었습니다.`,
  templateId: 'fee_paid_v1',
  teamId: teamId,
  memberId: memberId
});
```

### 2. 회비 미납 알림

```typescript
await notify({
  event: 'FEE_OVERDUE',
  channel: 'kakao',
  target: {
    userId: memberId,
    phoneE164: member.phoneE164,
    name: member.name
  },
  message: `${member.name}님, ${month} 회비가 미납입니다.`,
  templateId: 'fee_overdue_v1',
  variables: {
    memberName: member.name,
    month: month,
    dueAmount: String(dueAmount)
  },
  teamId: teamId,
  memberId: memberId
});
```

### 3. 월간 리포트 알림

```typescript
await notify({
  event: 'MONTHLY_REPORT',
  channel: 'kakao',
  target: {
    userId: adminId,
    phoneE164: admin.phoneE164,
    name: admin.name
  },
  message: `${month} 월간 리포트가 생성되었습니다.`,
  templateId: 'monthly_report_v1',
  variables: {
    month: month,
    pdfLink: pdfUrl
  },
  teamId: teamId
});
```

### 4. Push 알림

```typescript
await notify({
  event: 'MATCH_REMINDER',
  channel: 'push',
  target: {
    userId: memberId,
    deviceToken: member.fcmToken,
    name: member.name
  },
  title: '⚽ 경기 일정 알림',
  message: '내일 경기가 예정되어 있습니다.',
  data: {
    matchId: matchId,
    date: matchDate
  },
  priority: 'high',
  teamId: teamId
});
```

---

## 🔄 확장 방법

### 새로운 채널 추가

1. **타입 추가** (`src/domain/notification/types.ts`)
   ```typescript
   export type NotificationChannel = "kakao" | "sms" | "push" | "email" | "slack";
   ```

2. **Notifier 구현** (`src/utils/notifiers/SlackNotifier.ts`)
   ```typescript
   export class SlackNotifier implements Notifier {
     readonly name = "slack" as const;
     
     async send(payload: NotificationPayload): Promise<SendResult> {
       // Slack API 연동
     }
   }
   ```

3. **Factory에 등록** (`src/utils/notifiers/factory.ts`)
   ```typescript
   case "slack":
     notifier = new SlackNotifier();
     break;
   ```

**끝!** 비즈니스 로직 코드 수정 불필요

---

## ✅ 장점

1. **코드 수정 최소화**: 채널 변경 시 `channel` 필드만 수정
2. **확장 용이**: 새 채널 추가 시 기존 코드 영향 없음
3. **테스트 용이**: Notifier를 Mock으로 교체 가능
4. **Fail-safe**: 알림 실패해도 비즈니스 로직은 계속 진행
5. **타입 안전**: TypeScript로 컴파일 타임 검증

---

## 🚀 다음 단계

- [ ] 월간 리포트 PDF/CSV 자동 생성 + 발송
- [ ] 연회비 / 분기 알림 전략
- [ ] 알림 실패 재시도 큐 설계
- [ ] 알림 발송 통계 대시보드

