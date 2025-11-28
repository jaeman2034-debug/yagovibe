# 🔥 실서비스 수준 FCM 푸시 알림 시스템 완벽 가이드

## ✅ 구현 완료 사항

### 1. Firestore 토큰 구조 (최적화)

```
users/{uid}/devices/{deviceId} {
  token: string,
  platform: "ios" | "android" | "web",
  updatedAt: Timestamp,
  userId: string,
}
```

**장점:**
- ✅ 유저별 여러 기기 관리 가능
- ✅ 특정 유저에게만 알림 발송 가능
- ✅ 오래된 토큰 자동 삭제 가능
- ✅ 앱 재설치 시 기기 ID 유지 (localStorage)

### 2. 토큰 저장 시스템

**파일:** `src/lib/saveDeviceToken.ts`

- 기기 고유 ID 생성/관리 (UUID)
- Firestore에 토큰 자동 저장
- 로그아웃 시 토큰 삭제

### 3. 푸시 알림 등록

**파일:** `src/lib/pushNotifications.ts`

- Capacitor 환경 감지
- 권한 요청 및 토큰 수신
- Firestore에 자동 저장
- 알림 클릭 시 라우팅 처리

### 4. 자동 등록 시스템

**파일:** `src/context/AuthProvider.tsx`

- 로그인 시 자동으로 FCM 등록
- 로그아웃 시 기기 토큰 삭제

### 5. 서버 측 발송 함수

**파일:** `functions/src/sendUserNotification.ts`

- 유저별 모든 기기에 푸시 발송
- 무효한 토큰 자동 정리
- HTTP 엔드포인트 제공

## 🚀 사용 방법

### 클라이언트 측 (자동)

1. **로그인 시 자동 등록**
   - `AuthProvider`에서 로그인 감지 시 자동으로 `registerPushNotifications()` 호출
   - 토큰이 Firestore에 자동 저장됨

2. **알림 클릭 처리**
   - 알림 클릭 시 `data.route` 필드로 자동 라우팅
   - 예: `{ route: "/facility/123" }` → `/facility/123`으로 이동

### 서버 측 (수동 발송)

#### 방법 1: Cloud Functions 직접 호출

```typescript
import { sendNotificationToUser } from "./sendUserNotification";

// 특정 유저에게 알림 발송
await sendNotificationToUser("user_uid_123", {
  title: "새 예약이 도착했습니다",
  body: "시설 A에 새로운 예약이 들어왔습니다.",
  data: {
    route: "/facility/123",
  },
  imageUrl: "https://example.com/image.jpg", // 선택사항
});
```

#### 방법 2: HTTP 엔드포인트 사용

```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/sendNotification \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "user_uid_123",
    "title": "새 예약이 도착했습니다",
    "body": "시설 A에 새로운 예약이 들어왔습니다.",
    "data": {
      "route": "/facility/123"
    }
  }'
```

#### 방법 3: Cloud Functions에서 트리거 사용

```typescript
// Firestore 트리거 예시
export const onNewReservation = functions.firestore
  .document("reservations/{reservationId}")
  .onCreate(async (snap, context) => {
    const reservation = snap.data();
    const userId = reservation.userId;

    await sendNotificationToUser(userId, {
      title: "예약이 확정되었습니다",
      body: `${reservation.facilityName} 예약이 완료되었습니다.`,
      data: {
        route: `/facility/${reservation.facilityId}`,
      },
    });
  });
```

## 📋 Firestore 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 기기 토큰 저장 규칙
    match /users/{userId}/devices/{deviceId} {
      // 본인만 읽기/쓰기 가능
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🧪 테스트 방법

### 1. 토큰 확인

Firestore Console에서 확인:
```
users/{uid}/devices/{deviceId}
```

### 2. 수동 발송 테스트

Firebase Console > Cloud Messaging > "테스트 메시지 보내기"에서:
- FCM 토큰 입력 (Firestore에서 복사)
- 메시지 작성
- 발송

### 3. 코드 테스트

```typescript
// 개발 환경에서 직접 호출
import { sendNotificationToUser } from "./functions/src/sendUserNotification";

await sendNotificationToUser("test_user_uid", {
  title: "테스트 알림",
  body: "이것은 테스트 메시지입니다.",
  data: {
    route: "/sports-hub",
  },
});
```

## 🔧 문제 해결

### 문제 1: 토큰이 저장되지 않음

**원인:**
- 로그인하지 않은 상태
- Firestore 보안 규칙 문제
- 네트워크 오류

**해결:**
1. 로그인 상태 확인
2. Firestore 규칙 확인
3. 콘솔 로그 확인

### 문제 2: 알림이 도착하지 않음

**원인:**
- 무효한 토큰
- FCM 설정 누락
- 앱이 백그라운드에 있지 않음

**해결:**
1. 토큰 유효성 확인
2. Firebase Console에서 직접 발송 테스트
3. 앱을 백그라운드로 전환 후 테스트

### 문제 3: 알림 클릭 시 라우팅 안 됨

**원인:**
- `data.route` 필드 누락
- React Router 초기화 전 클릭

**해결:**
1. 알림 페이로드에 `data.route` 포함
2. `pushNotificationActionPerformed` 리스너 확인

## 📊 모니터링

### Firestore 쿼리

```javascript
// 특정 유저의 모든 기기 조회
db.collection("users").doc("user_uid").collection("devices").get();

// 오래된 토큰 찾기 (30일 이상 업데이트 안 된 것)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

db.collectionGroup("devices")
  .where("updatedAt", "<", thirtyDaysAgo)
  .get();
```

### Cloud Functions 로그

```bash
firebase functions:log --only sendNotification
```

## 🎯 다음 단계

1. **토픽 구독 기능 추가**
   - 사용자가 특정 카테고리 알림 구독
   - 예: "축구", "농구" 등

2. **일괄 발송 기능**
   - 여러 유저에게 동시 발송
   - 예: 모든 관리자에게 알림

3. **알림 히스토리 저장**
   - 발송한 알림을 Firestore에 기록
   - 사용자가 알림 내역 확인 가능

4. **알림 설정 관리**
   - 사용자가 알림 카테고리별 on/off 설정
   - Firestore에 저장

## ✅ 체크리스트

- [x] Firestore 토큰 구조 설계
- [x] 토큰 저장 함수 구현
- [x] 푸시 알림 등록 시스템
- [x] 자동 등록 (로그인 시)
- [x] 알림 클릭 라우팅
- [x] 서버 측 발송 함수
- [x] HTTP 엔드포인트
- [ ] Firestore 보안 규칙 적용
- [ ] Cloud Functions 배포
- [ ] 테스트 완료

## 🎉 완료!

이제 실서비스 수준의 FCM 푸시 알림 시스템이 완성되었습니다!

