# 🔔 YAGO 알림 시스템 v1.0 완성 (당근급 구조)

## ✅ 완료 상태

### 1. 데이터 모델 (확정)
```typescript
type NotiType =
  | 'CHAT_MESSAGE'      // ✅ 구현 완료
  | 'CHAT_LOCATION_SHARED' // ✅ 구현 완료
  | 'PRICE_OFFER'       // 🔥 타입 정의 완료 (다음 단계)
  | 'TRADE_RESERVED'    // 🔥 타입 정의 완료 (다음 단계)
  | 'TRADE_COMPLETED'   // 🔥 타입 정의 완료 (다음 단계)
  | 'TRADE_CANCELLED'   // 🔥 타입 정의 완료 (다음 단계)
  | 'SYSTEM_NOTICE';    // 🔥 타입 정의 완료 (다음 단계)

interface YagoNotification {
  id: string;
  userId: string;
  type: NotiType;
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

---

## 🚀 작동 흐름 (당근급 UX)

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

## 📁 파일 구조 (완성)

```
✅ src/types/notification.ts              # 타입 정의
✅ src/lib/notifications/
│   ├── createNotification.ts            # 알림 생성
│   ├── subscribeNotifications.ts        # 실시간 구독
│   └── navigateFromNotification.ts     # 딥링크
✅ src/components/notification/
│   ├── NotificationBell.tsx             # 종 아이콘
│   └── NotificationItem.tsx             # 알림 항목
✅ src/pages/notification/
│   └── NotificationsPage.tsx           # 알림 목록
✅ src/hooks/
│   ├── useUnreadNotificationCount.ts   # 배지 카운트
│   └── useNotifications.ts             # 알림 목록
✅ src/pages/chat/ChatPage.tsx          # 채팅 연동 완료
```

---

## 🎯 MVP 기능 세트 (완료)

✅ 종 배지 카운트 (실시간)
✅ 알림 목록 (실시간)
✅ 채팅 이동 (딥링크)
✅ 읽음 처리 (자동)

---

## 🔥 다음 단계 (v2.0 로드맵)

### 1. 거래 상태 알림
- [ ] 가격 제안 알림 (`PRICE_OFFER`)
- [ ] 예약 알림 (`TRADE_RESERVED`)
- [ ] 거래완료 알림 (`TRADE_COMPLETED`)
- [ ] 거래취소 알림 (`TRADE_CANCELLED`)

### 2. FCM 푸시 연동
- [ ] FCM 토큰 저장
- [ ] 푸시 발송 로직
- [ ] 백그라운드 알림

### 3. 중요도 정책
- [ ] high: 즉시 배지
- [ ] normal: 배지 (최대 1개)
- [ ] low: 배지 없음

---

## 🧪 테스트 체크리스트

- [x] 두 계정으로 로그인 (A, B)
- [x] A가 B에게 메시지 전송
- [x] B 계정에서 종 아이콘 배지 +1 확인
- [x] 종 아이콘 클릭 → 알림 목록 확인
- [x] 알림 클릭 → 채팅방 이동 확인
- [x] 읽음 처리 확인 (배지 카운트 -1)

---

## 📊 현재 상태

**v1.0 완료: ✅ 작동 가능**

- 채팅 알림: ✅ 완료
- 실시간 업데이트: ✅ 완료
- 딥링크 이동: ✅ 완료
- 읽음 처리: ✅ 완료

**다음: 거래 상태 알림 구현**
