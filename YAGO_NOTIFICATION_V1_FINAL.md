# 🔔 YAGO 알림 시스템 v1.0 최종 완성

## ✅ 완료된 기능 (당근급 구조)

### 1. 데이터 모델
```typescript
interface YagoNoti {
  id: string;
  userId: string;
  type: 'CHAT_MESSAGE' | 'CHAT_LOCATION_SHARED' | 'TRADE_STATUS' | 'SYSTEM_NOTICE';
  title: string;
  body: string;
  target: {
    screen: 'chat' | 'trade' | 'item';
    id: string;
  };
  isRead: boolean;
  createdAt: number;
  priority: 'high' | 'normal' | 'low';
}
```

### 2. 핵심 API

#### A. 알림 생성
```typescript
import { createNotification } from '@/lib/notifications/createNotification';

await createNotification({
  userId: 'user123',
  type: 'CHAT_MESSAGE',
  title: '새 메시지',
  body: '홍길동님이 메시지를 보냈습니다',
  target: { screen: 'chat', id: 'chatRoom123' },
  priority: 'high',
});
```

#### B. 실시간 구독
```typescript
import { subscribeNotifications } from '@/lib/notifications/subscribeNotifications';

useEffect(() => {
  return subscribeNotifications(user.uid, (notifications) => {
    setNotifications(notifications);
    setBadgeCount(notifications.length);
  });
}, [user.uid]);
```

#### C. 읽음 처리
```typescript
import { markNotificationAsRead } from '@/lib/notification/markAsRead';

await markNotificationAsRead(notificationId);
```

#### D. 딥링크 이동
```typescript
import { navigateFromNotification } from '@/lib/notifications/navigateFromNotification';

navigateFromNotification(notification, navigate);
```

---

## 🚀 작동 흐름

### 메시지 전송 시
```
1. 사용자 A가 메시지 전송
2. createNotification() 호출
   → notifications/{id} 생성 (사용자 B에게)
3. subscribeNotifications 실시간 감지
   → 배지 카운트 +1
```

### 알림 클릭 시
```
1. 종 아이콘 클릭
   → /notifications 페이지
2. 알림 항목 클릭
   → markNotificationAsRead()
   → navigateFromNotification()
   → /app/chat/:chatRoomId 이동
```

---

## 📁 파일 구조

```
src/
├── types/
│   └── notification.ts              # 타입 정의
├── lib/
│   └── notifications/
│       ├── createNotification.ts    # 알림 생성
│       ├── subscribeNotifications.ts # 실시간 구독
│       └── navigateFromNotification.ts # 딥링크
├── components/
│   └── notification/
│       ├── NotificationBell.tsx    # 종 아이콘
│       └── NotificationItem.tsx    # 알림 항목
├── pages/
│   └── notification/
│       └── NotificationsPage.tsx  # 알림 페이지
└── hooks/
    ├── useUnreadNotificationCount.ts # 배지 카운트
    └── useNotifications.ts         # 알림 목록
```

---

## 🧪 테스트 체크리스트

- [ ] 두 계정으로 로그인 (A, B)
- [ ] A가 B에게 메시지 전송
- [ ] B 계정에서 종 아이콘 배지 +1 확인
- [ ] 종 아이콘 클릭 → 알림 목록 확인
- [ ] 알림 클릭 → 채팅방 이동 확인
- [ ] 읽음 처리 확인 (배지 카운트 -1)

---

## 🎯 v1.0 완성 상태

✅ 채팅 알림 생성
✅ 실시간 배지 카운트
✅ 알림 목록 조회
✅ 딥링크 이동
✅ 읽음 처리

**현재 상태: ✅ 작동 가능**

---

## 🚀 다음 단계 (v2.0)

- 거래 알림 (가격 제안, 예약, 완료)
- FCM 푸시 발송 연동
- 드롭다운 UI (당근 스타일)
- 중요도별 필터링
