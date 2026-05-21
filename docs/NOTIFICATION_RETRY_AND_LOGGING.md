# 🔔 알림 로그 & 재시도 시스템 (v1.1 완성판)

## 📋 개요

알림 자동화 시스템의 로그 기록 및 재시도 기능입니다.

**핵심 목표:**
- 알림 발송 성공/실패를 모두 기록
- 실패한 알림을 자동으로 재시도
- 운영자가 알림 상태를 확인할 수 있도록
- 알림 중복 방지

---

## 🎯 주요 기능

### 1. 알림 로그 기록

**경로:** `associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/notificationLogs/{logId}`

**필드 구조:**
```typescript
{
  type: "APPLICATION_APPROVED" | "ROSTER_REMINDER" | "DEADLINE_APPROACHING",
  applicationId: string,
  associationId: string,
  tournamentId: string,
  userId: string,
  channel: "email" | "kakao",
  status: "success" | "failed" | "pending",
  errorMessage?: string,
  sentAt: Timestamp,
  retryCount: number,
  recipientEmail?: string,
  recipientPhone?: string,
  subject?: string,
  daysUntilDeadline?: number
}
```

---

### 2. 중복 방지

**승인 알림:**
- 승인 버튼을 두 번 눌러도 알림은 1번만 발송
- `hasSuccessfulNotification("APPLICATION_APPROVED", applicationId)`로 확인

**미제출 리마인더:**
- 하루 1회만 발송 (중복 방지)
- 단, 마감 임박(D-1) 알림은 항상 발송

---

### 3. 재시도 스케줄러

**스케줄:** 10분마다 실행

**동작:**
1. 실패한 알림 로그 조회 (`status === "failed"`, `retryCount < 3`)
2. 각 로그에 대해 이메일 재전송
3. 성공 시: 새 성공 로그 기록
4. 실패 시: `retryCount` 증가, 상태 업데이트

**최대 재시도 횟수:** 3회

**구현:** `functions/src/notifications/retryFailedNotifications.ts`

---

## 🏗️ 아키텍처

### 파일 구조

```
functions/src/notifications/
├── types.ts                     # 알림 로그 데이터 모델
├── logUtil.ts                  # 알림 로그 기록/조회 유틸리티
├── onApplicationApproved.ts    # 승인 알림 (로그 기록 추가)
├── dailyRosterReminders.ts     # 미제출 알림 (로그 기록 추가)
└── retryFailedNotifications.ts # 재시도 스케줄러
```

### 데이터 흐름

```
1. 승인 알림 발송:
   승인 버튼 클릭
   → onApplicationApproved Trigger 실행
   → 중복 확인 (hasSuccessfulNotification)
   → 이메일 발송
   → 로그 기록 (성공/실패)

2. 재시도:
   매 10분마다
   → 실패한 알림 로그 조회
   → 이메일 재전송
   → 로그 업데이트 (성공/실패)
```

---

## 🚀 배포

### 1. 함수 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:onApplicationApproved,functions:dailyRosterReminders,functions:retryFailedNotifications
```

### 2. 테스트

**승인 알림 로그 테스트:**
1. 어드민에서 참가 신청 승인
2. Firestore Console에서 `notificationLogs` 컬렉션 확인
3. 로그가 기록되었는지 확인

**재시도 테스트:**
1. 이메일 설정을 일시적으로 비활성화하여 실패 유도
2. 10분 후 `retryFailedNotifications` 함수 실행 확인
3. 로그의 `retryCount`가 증가하는지 확인

---

## 📊 알림 로그 조회

### Firestore Console

```
associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/notificationLogs
```

### 코드에서 조회

```typescript
// 실패한 알림 로그 조회
const failedLogs = await getFailedNotificationLogs(3);

// 특정 타입의 성공한 알림 확인
const hasSent = await hasSuccessfulNotification(
  associationId,
  tournamentId,
  applicationId,
  "APPLICATION_APPROVED"
);
```

---

## 🔧 커스터마이징

### 최대 재시도 횟수 변경

`functions/src/notifications/retryFailedNotifications.ts`:

```typescript
const MAX_RETRIES = 5; // 기본값: 3
```

### 재시도 스케줄 변경

`functions/src/notifications/retryFailedNotifications.ts`:

```typescript
schedule: "*/5 * * * *", // 5분마다
// 또는
schedule: "0 * * * *", // 매 시간
```

### 중복 방지 정책 변경

**미제출 리마인더를 매일 발송하도록 변경:**

`functions/src/notifications/dailyRosterReminders.ts`에서 중복 확인 로직 제거:

```typescript
// 중복 방지 로직 제거
// if (!shouldSendDeadlineAlert) {
//   const hasSent = await hasSuccessfulNotification(...);
//   if (hasSent) continue;
// }
```

---

## ⚠️ 주의사항

1. **로그 기록 실패:** 로그 기록이 실패해도 알림 발송에는 영향을 주지 않습니다 (로그만 기록).

2. **재시도 제한:** 최대 3회까지 재시도합니다. 3회 실패 시 운영자 확인 대상입니다.

3. **collectionGroup 쿼리:** 재시도 스케줄러는 `collectionGroup`을 사용합니다. Firestore Rules에서 허용해야 합니다.

4. **비용 고려:** 재시도 스케줄러가 10분마다 실행되므로, 로그가 많으면 Firestore 읽기 비용이 발생합니다.

---

## 🎯 다음 단계 (v1.2)

1. **알림 로그 UI** (어드민 화면에서 발송 이력 확인)
2. **수동 재전송 기능** (실패한 알림 수동 재전송 버튼)
3. **알림 설정 관리** (팀장별 알림 수신 설정)
4. **알림 통계 대시보드** (발송 성공률, 실패율 등)

---

## 📝 체크리스트

배포 전 확인:

- [ ] `retryFailedNotifications` 함수 배포
- [ ] Firestore Rules에서 `notificationLogs` collectionGroup 읽기 허용
- [ ] 테스트: 승인 알림 로그 기록 확인
- [ ] 테스트: 재시도 스케줄러 실행 확인 (수동 트리거)
- [ ] 테스트: 중복 방지 확인 (승인 버튼 두 번 클릭)

---

**🔥 이 시스템이 완성되면 알림 자동화가 "믿고 맡길 수 있는 시스템"이 됩니다.**
