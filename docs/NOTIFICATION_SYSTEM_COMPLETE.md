# ✅ 알림 시스템 완성본 세트

## 🎯 목표 달성

> ✅ 승인 → 참가자에게 알림
> ✅ 새 메시지 → 상대에게 알림
> ✅ 취소/거절 → 알림
> ✅ 중복 발송 방지

---

## ✅ 완료된 작업

### 1️⃣ 알림 서비스 헬퍼 함수

**파일**: `functions/src/market/notificationService.ts`

**핵심 함수**:

#### `sendNotification()` - 기본 알림 발송

```typescript
export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
  idempotencyKey,
}): Promise<string | null>
```

**특징**:
- ✅ 중복 발송 방지 (idempotencyKey 기반)
- ✅ 기존 구조 호환 (`type`, `message`, `target` 등)
- ✅ 실패해도 메인 로직 계속 진행

#### `sendApprovalNotification()` - 승인 알림

```typescript
export async function sendApprovalNotification({
  userId,
  postId,
  postTitle,
  chatRoomId,
  idempotencyKey,
}): Promise<string | null>
```

#### `sendCancellationNotification()` - 취소/거절 알림

```typescript
export async function sendCancellationNotification({
  userId,
  postId,
  postTitle,
  reason,
  idempotencyKey,
}): Promise<string | null>
```

---

### 2️⃣ 승인 알림 통합

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts:193`

**변경 사항**:
- ✅ 기존 알림 로직을 `sendApprovalNotification()`로 교체
- ✅ 중복 방지 자동 처리
- ✅ 코드 간소화

**이전**:
```typescript
// 복잡한 중복 체크 로직...
await db.collection("notifications").add({...});
```

**이후**:
```typescript
await sendApprovalNotification({
  userId,
  postId,
  postTitle,
  chatRoomId: chatRoomId || undefined,
  idempotencyKey,
});
```

---

### 3️⃣ 취소/거절 알림 통합

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts:447`

**변경 사항**:
- ✅ 기존 알림 로직을 `sendCancellationNotification()`로 교체
- ✅ 취소 사유 포함
- ✅ 중복 방지 자동 처리

**이전**:
```typescript
await db.collection("notifications").add({
  type: "MARKET_JOIN_CANCELLED",
  ...
});
```

**이후**:
```typescript
await sendCancellationNotification({
  userId,
  postId,
  postTitle,
  reason: newStatus === "cancelled_by_user" ? "사용자 취소" : "작성자 취소",
  idempotencyKey: cancelIdempotencyKey,
});
```

---

### 4️⃣ 메시지 알림 개선

**파일**: `functions/src/notifyNewMessage.ts:34`

**변경 사항**:
- ✅ `members` 배열 우선 확인 (실전급 설계)
- ✅ 하위 호환 (`participants` 배열도 체크)

**이전**:
```typescript
const participants = room.participants || [];
const receivers = participants.filter((uid: string) => uid !== senderId);
```

**이후**:
```typescript
// 🔥 members 배열 우선 확인 (실전급 설계), 하위 호환
const members = room.members || room.participants || [];
const receivers = members.filter((uid: string) => uid !== senderId);
```

---

### 5️⃣ Firestore Rules 보안 강화

**파일**: `firestore.rules:415-425`

**변경 사항**:
- ✅ 알림 읽기/수정: 본인만 가능
- ✅ 알림 생성: 서버만 가능
- ✅ 알림 삭제: 본인만 가능

```javascript
match /notifications/{notiId} {
  // 🔥 읽기/수정: 본인만 가능
  allow read, update: if isSignedIn() 
    && request.auth.uid == resource.data.userId;
  
  // 🔥 생성: 서버만 가능 (클라이언트 생성 금지)
  allow create: if false;
  
  // 🔥 삭제: 본인만 가능
  allow delete: if isSignedIn() 
    && request.auth.uid == resource.data.userId;
}
```

---

## 📊 알림 데이터 모델

```typescript
notifications/{id}
{
  userId: string        // 받는 사람
  type: string         // "MARKET_JOIN_APPROVED" | "MARKET_JOIN_CANCELLED" | "MARKET_MESSAGE"
  title: string
  message: string      // 기존 구조 호환
  body: string         // 새 구조
  target: {
    screen: "chat" | "market"
    id: string
  }
  link: string         // 하위 호환
  priority: "high" | "normal" | "low"
  isRead: boolean
  payload: {
    idempotencyKey?: string
    [key: string]: any
  }
  createdAt: timestamp
}
```

---

## 🔒 보안 및 안정성

### 중복 방지 ✅

- ✅ `idempotencyKey` 기반 중복 체크
- ✅ 동일 알림 자동 스킵
- ✅ 멱등성 보장

### 실패 처리 ✅

- ✅ 알림 실패해도 메인 로직 계속 진행
- ✅ 에러 로깅
- ✅ Fail-safe 설계

### 하위 호환성 ✅

- ✅ 기존 알림 구조 유지
- ✅ `type`, `message`, `target` 등 호환
- ✅ 점진적 마이그레이션 가능

---

## 📊 알림 흐름

### 승인 플로우

```
작성자 승인 →
  connectChatRoom() →
  sendApprovalNotification() →
  notifyMarketJoin() (FCM) →
  인앱 알림 + 푸시 알림
```

### 취소 플로우

```
참여 취소 →
  disconnectChatRoom() →
  sendCancellationNotification() →
  인앱 알림
```

### 메시지 플로우

```
메시지 전송 →
  notifyNewMessage 트리거 →
  members 배열 확인 →
  FCM 푸시 알림
```

---

## ✅ 완료 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 알림 서비스 헬퍼 함수 | ✅ | sendNotification, sendApprovalNotification, sendCancellationNotification |
| 승인 알림 통합 | ✅ | onMarketJoinStatusChanged |
| 취소/거절 알림 통합 | ✅ | onMarketJoinStatusChanged |
| 메시지 알림 개선 | ✅ | notifyNewMessage (members 배열) |
| Firestore Rules 보안 | ✅ | 서버만 생성, 본인만 읽기/수정/삭제 |
| 중복 발송 방지 | ✅ | idempotencyKey 기반 |

---

## 🎯 결론

**알림 시스템 완성본 세트 적용 완료** 🚀

- ✅ 승인 → 참가자에게 알림
- ✅ 새 메시지 → 상대에게 알림
- ✅ 취소/거절 → 알림
- ✅ 중복 발송 방지
- ✅ 보안 강화
- ✅ 하위 호환성 유지

**다음 단계**: 인원 초과 차단 또는 전체 통합 테스트 💪
