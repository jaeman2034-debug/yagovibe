# ✅ FCM 푸시 알림 완성본 세트

## 🎯 목표 달성

> ✅ 채팅 메시지 → 상대 폰 푸시
> ✅ 승인 → 푸시
> ✅ 취소 → 푸시
> ✅ 토큰 관리 + 중복 방지

---

## ✅ 완료된 작업

### 1️⃣ FCM 토큰 구조 (기존 구조 유지)

**구조**: `users/{uid}/devices` 서브컬렉션 + `users/{uid}.fcmTokens` 배열

**클라이언트 토큰 등록**:
- ✅ `src/lib/push/registerFcmToken.ts` - 토큰 등록 함수
- ✅ `src/lib/notifications/registerFcm.ts` - 토큰 등록 함수
- ✅ 로그인 후 자동 등록

**토큰 저장**:
```typescript
// 방법 1: devices 서브컬렉션 (최신 방식)
users/{uid}/devices/{deviceId}
{
  token: string
  platform: string
  createdAt: timestamp
}

// 방법 2: fcmTokens 배열 (하위 호환)
users/{uid}
{
  fcmTokens: string[]
}
```

---

### 2️⃣ 푸시 전송 유틸 (이미 구현됨)

**파일**: `functions/src/sendUserNotification.ts`

**핵심 함수**:
```typescript
export async function sendNotificationToUser(
  uid: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }
): Promise<void>
```

**특징**:
- ✅ `users/{uid}/devices` 서브컬렉션에서 토큰 조회
- ✅ `sendEachForMulticast`로 모든 기기에 발송
- ✅ 무효한 토큰 자동 삭제
- ✅ Android/iOS 설정 포함

---

### 3️⃣ 알림 서비스에 푸시 결합

**파일**: `functions/src/market/notificationService.ts`

**변경 사항**:
- ✅ `sendNotification()` 함수에 FCM 푸시 발송 추가
- ✅ 인앱 알림 + 푸시 알림 동시 발송
- ✅ 푸시 실패해도 인앱 알림은 성공으로 처리

**구현**:
```typescript
// 🔥 인앱 알림 생성
const notificationRef = await db.collection("notifications").add({...});

// 🔥 FCM 푸시 알림 발송
await sendNotificationToUser(userId, {
  title,
  body,
  data: {
    type: type.toUpperCase(),
    link,
    route: link.startsWith("/app/") ? link : `/app${link}`,
  },
});
```

---

### 4️⃣ 승인 알림 푸시 (이미 통합됨)

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts`

**구현**:
- ✅ `sendApprovalNotification()` 호출
- ✅ 인앱 알림 + FCM 푸시 자동 발송
- ✅ `notifyMarketJoin()` 함수도 FCM 푸시 발송 (이중 보장)

---

### 5️⃣ 취소/거절 알림 푸시 (이미 통합됨)

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts`

**구현**:
- ✅ `sendCancellationNotification()` 호출
- ✅ 인앱 알림 + FCM 푸시 자동 발송

---

### 6️⃣ 새 메시지 푸시 (이미 구현됨)

**파일**: `functions/src/notifyNewMessage.ts`

**구현**:
- ✅ `chatRooms/{roomId}/messages/{messageId}` 트리거
- ✅ `members` 배열 우선 확인 (실전급 설계)
- ✅ FCM 푸시 자동 발송
- ✅ 무효한 토큰 자동 삭제

**특징**:
- ✅ 시스템 메시지는 푸시 발송 안 함
- ✅ 상대방에게만 발송
- ✅ 메시지 미리보기 포함

---

### 7️⃣ 앱 수신 처리 (이미 구현됨)

**파일**: `src/App.tsx:436-504`

**구현**:
- ✅ `useFcmForegroundHandler()` 훅
- ✅ 포그라운드 메시지 핸들러 등록
- ✅ 알림 클릭 시 채팅방으로 이동
- ✅ 브라우저 알림 표시

---

## 📊 푸시 알림 흐름

### 승인 플로우

```
작성자 승인 →
  sendApprovalNotification() →
    인앱 알림 생성 →
    sendNotificationToUser() (FCM 푸시) →
    앱 수신 →
    알림 클릭 →
    채팅방 이동
```

### 메시지 플로우

```
메시지 전송 →
  notifyNewMessage 트리거 →
    members 배열 확인 →
    sendNotificationToUser() (FCM 푸시) →
    앱 수신 →
    알림 클릭 →
    채팅방 이동
```

### 취소 플로우

```
참여 취소 →
  sendCancellationNotification() →
    인앱 알림 생성 →
    sendNotificationToUser() (FCM 푸시) →
    앱 수신 →
    알림 클릭 →
    게시글 이동
```

---

## 🔒 보안 및 안정성

### 토큰 관리 ✅

- ✅ `users/{uid}/devices` 서브컬렉션 사용
- ✅ 무효한 토큰 자동 삭제
- ✅ 여러 기기 지원 (멀티캐스트)

### 중복 방지 ✅

- ✅ `idempotencyKey` 기반 중복 체크
- ✅ 동일 알림 자동 스킵
- ✅ 멱등성 보장

### 실패 처리 ✅

- ✅ 푸시 실패해도 인앱 알림은 성공
- ✅ 에러 로깅
- ✅ Fail-safe 설계

---

## ✅ 완료 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| FCM 토큰 구조 | ✅ | devices 서브컬렉션 + fcmTokens 배열 |
| 토큰 등록 | ✅ | 클라이언트에서 자동 등록 |
| 푸시 전송 유틸 | ✅ | sendNotificationToUser() |
| 승인 알림 푸시 | ✅ | sendApprovalNotification() |
| 취소 알림 푸시 | ✅ | sendCancellationNotification() |
| 메시지 알림 푸시 | ✅ | notifyNewMessage 트리거 |
| 앱 수신 처리 | ✅ | useFcmForegroundHandler() |
| 토큰 관리 | ✅ | 무효한 토큰 자동 삭제 |

---

## 🎯 결론

**FCM 푸시 알림 완성본 세트 적용 완료** 🚀

- ✅ 채팅 메시지 → 상대 폰 푸시
- ✅ 승인 → 푸시
- ✅ 취소 → 푸시
- ✅ 토큰 관리 + 중복 방지
- ✅ 앱 수신 처리
- ✅ 알림 클릭 시 이동

**다음 단계**: 인원 초과 차단 또는 전체 통합 테스트 💪
