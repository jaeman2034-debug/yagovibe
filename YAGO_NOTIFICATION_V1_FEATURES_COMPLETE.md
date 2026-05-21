# 🔔 YAGO 알림 시스템 v1.0 (features 구조 완성)

## ✅ 완료 상태

### 폴더 구조 (제품 레벨)
```
src/features/notifications/
 ├── types.ts           # 타입 정의
 ├── service.ts         # Firestore 레이어
 ├── hooks.ts           # React 훅
 ├── BellButton.tsx     # 종 버튼
 ├── NotiPanel.tsx      # 알림 패널
 └── index.ts           # 통합 export
```

---

## 🚀 핵심 API

### 1. 실시간 구독
```typescript
import { subscribeNoti } from '@/features/notifications';

const unsubscribe = subscribeNoti(userId, (list) => {
  console.log('알림 목록:', list);
});
```

### 2. 읽음 처리
```typescript
import { markAsRead } from '@/features/notifications';

await markAsRead(notificationId);
```

### 3. 채팅 알림 생성
```typescript
import { createChatNoti } from '@/features/notifications';

await createChatNoti(toUid, roomId, messageText);
```

### 4. React 훅
```typescript
import { useNotifications } from '@/features/notifications';

const { list, unreadCount, loading } = useNotifications();
```

### 5. 컴포넌트
```typescript
import { BellButton } from '@/features/notifications';

<BellButton />
```

---

## 📊 작동 흐름

### 생성
```
메시지 전송
→ createChatNoti() 호출
→ notifications/{id} 생성
→ subscribeNoti 실시간 감지
→ 배지 +1
```

### 클릭
```
종 클릭
→ NotiPanel 열림
→ 알림 클릭
→ markAsRead()
→ /app/chat/:chatRoomId 이동
```

---

## 🧪 테스트 체크리스트

- [ ] 두 계정 준비 (A, B)
- [ ] A가 B에게 메시지 전송
- [ ] B 계정에서 종 배지 +1 확인
- [ ] 종 클릭 → NotiPanel 열림 확인
- [ ] 알림 클릭 → /app/chat/:chatRoomId 이동 확인
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
✅ src/features/notifications/
│   ├── types.ts
│   ├── service.ts
│   ├── hooks.ts
│   ├── BellButton.tsx
│   ├── NotiPanel.tsx
│   └── index.ts
✅ src/layout/Header.tsx (연동 완료)
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

**다음: 거래 상태 알림 구현 (v2.0)**
