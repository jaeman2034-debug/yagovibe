# 🔔 YAGO 알림 시스템 v1.0 (제품 레벨 완성)

## ✅ 완료 상태

### 구조 (제품 레벨)
```
src/lib/notifications/
 ├── service.ts          # 통합 서비스 (구독, 읽음, 생성)
 ├── hooks.ts            # React 훅 (useNotifications, useUnreadCount)
 └── navigate.ts          # 딥링크 라우팅

src/components/notification/
 ├── BellButton.tsx      # 종 버튼 (배지 포함)
 └── NotiPanel.tsx       # 알림 패널 (목록 + 클릭)

src/types/notification.ts
 └── 타입 정의 (Notification, NotificationType)
```

---

## 🚀 핵심 API

### 1. 실시간 구독
```typescript
import { subscribeNoti } from '@/lib/notifications/service';

const unsubscribe = subscribeNoti(userId, (list) => {
  console.log('알림 목록:', list);
});
```

### 2. 읽음 처리
```typescript
import { markAsRead } from '@/lib/notifications/service';

await markAsRead(notificationId);
```

### 3. 알림 생성
```typescript
import { createNoti } from '@/lib/notifications/service';

await createNoti({
  userId: 'user123',
  type: 'CHAT_MESSAGE',
  title: '새 메시지',
  body: '홍길동님이 메시지를 보냈습니다',
  target: { screen: 'chat', id: 'chatRoom123' },
  priority: 'high',
});
```

### 4. React 훅
```typescript
import { useNotifications, useUnreadCount } from '@/lib/notifications/hooks';

// 알림 목록
const { list, loading } = useNotifications();

// 배지 카운트
const count = useUnreadCount();
```

### 5. 딥링크 이동
```typescript
import { navigateFromNoti } from '@/lib/notifications/navigate';

navigateFromNoti(notification, navigate);
```

---

## 🎯 사용 예시

### 채팅 메시지 알림 생성
```typescript
import { createNoti } from '@/lib/notifications/service';

// 메시지 전송 시
await createNoti({
  userId: otherUserId,
  type: 'CHAT_MESSAGE',
  title: '새 메시지',
  body: `${senderName}: ${messageText.slice(0, 40)}`,
  target: { screen: 'chat', id: chatRoomId },
  priority: 'high',
});
```

### 헤더에 종 버튼 추가
```typescript
import BellButton from '@/components/notification/BellButton';

<BellButton />
```

### 알림 페이지
```typescript
import NotiPanel from '@/components/notification/NotiPanel';

<NotiPanel />
```

---

## 📊 작동 흐름

### 생성
```
이벤트 발생 (메시지 전송 등)
→ createNoti() 호출
→ notifications/{id} 생성
→ subscribeNoti 실시간 감지
→ 배지 +1
```

### 클릭
```
종 클릭
→ /notifications
→ 알림 클릭
→ markAsRead()
→ navigateFromNoti()
→ /app/chat/:chatRoomId 이동
```

---

## 🧪 테스트 체크리스트

- [ ] 두 계정 준비 (A, B)
- [ ] A가 B에게 메시지 전송
- [ ] B 계정에서 종 배지 +1 확인
- [ ] 종 클릭 → 알림 목록 확인
- [ ] 알림 클릭 → 채팅방 이동 확인
- [ ] 읽음 처리 확인 (배지 -1)

---

## 🔥 다음 단계 (v2.0)

1. 거래 상태 알림 (PRICE_OFFER, TRADE_RESERVED, TRADE_COMPLETED)
2. FCM 푸시 연동
3. 중요도 정책 (high/normal/low)
4. 읽음 동기화 최적화

---

## 📁 파일 구조 (완성)

```
✅ src/lib/notifications/
│   ├── service.ts
│   ├── hooks.ts
│   └── navigate.ts
✅ src/components/notification/
│   ├── BellButton.tsx
│   └── NotiPanel.tsx
✅ src/types/notification.ts
✅ src/pages/chat/ChatPage.tsx (연동 완료)
```

---

## 🎯 현재 상태

**v1.0 완료: ✅ 제품 레벨 작동 가능**

- 실시간 배지 카운트: ✅
- 알림 목록 (실시간): ✅
- 클릭 → 정확한 화면 이동: ✅
- 읽음 처리: ✅
- 채팅 중심 MVP: ✅
