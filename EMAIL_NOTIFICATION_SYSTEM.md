# 🔥 Email Notification System 설계 문서

## 개요

Email Notification System은 플랫폼의 중요한 이벤트를 사용자에게 이메일로 알려주는 시스템입니다.

## 목표

- 경기 결과, 수상 발표, 미디어 업로드 등 중요 이벤트 이메일 알림
- 사용자별 구독 설정 관리
- SendGrid를 통한 이메일 발송
- 템플릿 기반 이메일 생성

## 데이터 구조

### Firestore 컬렉션

```
email_subscriptions/{userId}
```

### 문서 스키마

```typescript
{
  userId: string;
  email: string;
  enabled: boolean;
  preferences: {
    match_result: boolean;
    match_started: boolean;
    match_completed: boolean;
    media_uploaded: boolean;
    award_announced: boolean;
    event_started: boolean;
    event_completed: boolean;
    team_match_scheduled: boolean;
    player_achievement: boolean;
    weekly_digest: boolean;
    monthly_digest: boolean;
  };
  digestFrequency: "none" | "weekly" | "monthly";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 이메일 알림 타입

### 1. 경기 관련

- `match_result`: 경기 결과 업데이트
- `match_started`: 경기 시작
- `match_completed`: 경기 완료

### 2. 미디어 관련

- `media_uploaded`: 새 사진/영상 업로드

### 3. 수상 관련

- `award_announced`: 수상 발표

### 4. 이벤트 관련

- `event_started`: 이벤트 시작
- `event_completed`: 이벤트 완료

### 5. 팀/선수 관련

- `team_match_scheduled`: 팀 경기 일정
- `player_achievement`: 선수 성과

### 6. 요약

- `weekly_digest`: 주간 요약
- `monthly_digest`: 월간 요약

## 주요 기능

### 1. 이메일 구독 관리

**서비스**: `emailService.ts`

- `getEmailSubscription()`: 구독 설정 조회
- `updateEmailSubscription()`: 구독 설정 업데이트
- `toggleEmailSubscription()`: 구독 활성화/비활성화
- `updateNotificationPreference()`: 특정 알림 타입 설정

### 2. 이메일 템플릿

**파일**: `functions/src/email/emailTemplates.ts`

각 알림 타입별 HTML/Text 템플릿 제공:

- 경기 결과 템플릿
- 미디어 업로드 템플릿
- 수상 발표 템플릿
- 이벤트 시작/완료 템플릿
- 주간/월간 요약 템플릿

### 3. 이메일 발송

**Cloud Function**: `sendEmail`

- SendGrid 연동 (향후)
- 구독 설정 확인
- 템플릿 적용
- 이메일 발송

### 4. 자동 트리거

**통합 위치**:

- `onEventMatchCompleted`: 경기 완료 시 이메일 발송
- `onMediaUploaded`: 미디어 업로드 시 이메일 발송 (향후)
- `onEventAwardCreate`: 수상 발표 시 이메일 발송 (향후)

## SendGrid 연동

### 환경 변수

```bash
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yagosports.com
FRONTEND_URL=https://yagosports.com
```

### 설치

```bash
npm install @sendgrid/mail
```

### 구현

`functions/src/email/sendEmail.ts`의 `sendEmailInternal` 함수에서 SendGrid 연동:

```typescript
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(SENDGRID_API_KEY);

const msg = {
  to,
  from: SENDGRID_FROM_EMAIL,
  subject,
  text: text || html.replace(/<[^>]*>/g, ""),
  html,
};

const [response] = await sgMail.send(msg);
```

## 이메일 템플릿 예시

### 경기 결과

```
Subject: 경기 결과: 노원FC 3 - 1 강북FC

Body:
2026 봄 리그
노원FC 3 - 1 강북FC

경기 결과가 업데이트되었습니다.
[경기 상세 보기]
```

### 미디어 업로드

```
Subject: 2026 봄 리그 결승전에 새 사진이 업로드되었습니다

Body:
2026 봄 리그 결승전
5개의 새 사진이 업로드되었습니다.
[갤러리 보기]
```

### 수상 발표

```
Subject: 2026 봄 리그: 노원FC 🏆 우승 수상

Body:
2026 봄 리그
🏆 우승
노원FC
[상세 보기]
```

## 구독 설정 UI

**경로**: `/settings/email`

**기능**:
- 이메일 주소 설정
- 전체 알림 활성화/비활성화
- 알림 타입별 구독 설정
- Digest 빈도 설정

## Cloud Functions 통합

### 경기 완료 시 이메일 발송

**파일**: `functions/src/events/onEventMatchCompleted.ts`

```typescript
// 경기 완료 후
await sendNotificationEmail(userId, "match_result", {
  homeTeam: homeTeamName,
  awayTeam: awayTeamName,
  homeScore,
  awayScore,
  matchUrl,
  eventName,
});
```

### 미디어 업로드 시 이메일 발송

**파일**: `functions/src/media/generateThumbnail.ts`

```typescript
// 미디어 업로드 후
await sendNotificationEmail(userId, "media_uploaded", {
  entityType,
  entityName,
  mediaCount,
  mediaUrl,
});
```

## 구독자 조회

### 팀 멤버

경기 결과 이메일은 팀 멤버에게 발송:

```typescript
const teamMembers = await getTeamMembers(teamId);
for (const member of teamMembers) {
  await sendNotificationEmail(member.userId, "match_result", data);
}
```

### 이벤트 참가자

이벤트 관련 이메일은 이벤트 참가자에게 발송:

```typescript
const eventEntries = await getEventEntries(eventId);
for (const entry of eventEntries) {
  await sendNotificationEmail(entry.userId, "event_started", data);
}
```

## 이메일 발송 흐름

```
이벤트 발생
↓
Cloud Function 트리거
↓
구독 설정 확인
↓
템플릿 생성
↓
SendGrid 발송
↓
발송 완료
```

## 보안

### Firestore Rules

```javascript
match /email_subscriptions/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}
```

### SendGrid 보안

- API Key는 환경 변수로 관리
- Rate limiting 적용
- Bounce/Spam 처리

## 성능 최적화

### 배치 발송

여러 사용자에게 발송 시:

```typescript
const promises = users.map((user) =>
  sendNotificationEmail(user.id, type, data)
);
await Promise.all(promises);
```

### 비동기 처리

이메일 발송은 비동기로 처리하여 메인 로직에 영향 없음:

```typescript
try {
  await sendNotificationEmail(...);
} catch (error) {
  // 이메일 실패해도 메인 로직은 계속
  logger.warn("이메일 발송 실패:", error);
}
```

## 현재 구현 상태

✅ **완료**:
- Email 타입 정의
- Email Service (구독 관리)
- Email Templates
- Cloud Function (sendEmail)
- Email Settings UI
- 경기 완료 이메일 통합

🔄 **진행 중**:
- SendGrid 실제 연동 (환경 변수 설정 필요)
- 미디어 업로드 이메일 통합
- 수상 발표 이메일 통합

📋 **향후**:
- 주간/월간 Digest 자동 생성
- 이메일 발송 통계
- Bounce/Spam 처리
- 이메일 템플릿 커스터마이징

## 사용 가이드

### 1. 구독 설정

```tsx
import { updateEmailSubscription } from "@/services/emailService";

await updateEmailSubscription(
  userId,
  email,
  {
    match_result: true,
    media_uploaded: true,
  },
  "weekly"
);
```

### 2. 이메일 발송

```typescript
import { sendNotificationEmail } from "../email/sendEmail";

await sendNotificationEmail(userId, "match_result", {
  homeTeam: "노원FC",
  awayTeam: "강북FC",
  homeScore: 3,
  awayScore: 1,
  matchUrl: "https://yagosports.com/events/123",
  eventName: "2026 봄 리그",
});
```

### 3. 구독 설정 조회

```tsx
import { getEmailSubscription } from "@/services/emailService";

const subscription = await getEmailSubscription(userId);
if (subscription?.enabled && subscription.preferences.match_result) {
  // 경기 결과 이메일 발송 가능
}
```

## SendGrid 설정

### 1. API Key 생성

1. SendGrid 계정 생성
2. Settings → API Keys
3. Create API Key
4. Full Access 권한 부여

### 2. 환경 변수 설정

```bash
# .env
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yagosports.com
FRONTEND_URL=https://yagosports.com
```

### 3. Firebase Functions 환경 변수 설정

```bash
firebase functions:config:set sendgrid.api_key="SG.xxxxx"
firebase functions:config:set sendgrid.from_email="noreply@yagosports.com"
firebase functions:config:set app.frontend_url="https://yagosports.com"
```

## 참고

- SendGrid: https://sendgrid.com/
- SendGrid Node.js SDK: https://github.com/sendgrid/sendgrid-nodejs
- Firebase Functions 환경 변수: https://firebase.google.com/docs/functions/config-env
