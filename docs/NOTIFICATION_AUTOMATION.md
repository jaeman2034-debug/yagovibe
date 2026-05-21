# 🔔 알림 자동화 시스템 (v1.1)

## 📋 개요

참가 신청 승인, 선수 명단 미제출, 마감 임박 알림을 자동으로 발송하는 시스템입니다.

**핵심 원칙:**
- 상태 변화가 트리거
- 알림은 행동 링크 포함
- 실패해도 운영 흐름은 멈추지 않음

## 🎯 알림 시나리오

### A. 참가 신청 승인 알림 (가장 중요)

**트리거:** `applications.status`: `pending` → `approved`

**대상:** 팀장 (신청자)

**메시지 내용:**
- 대회명, 팀명
- 승인 완료 안내
- 선수 명단 등록 링크

**구현:** `functions/src/notifications/onApplicationApproved.ts` (Firestore Trigger)

---

### B. 선수 명단 미제출 알림 (운영 효율 핵심)

**트리거:**
- `approved` 상태
- `rosterStatus === "draft"`
- 마감 D-3 또는 D-1

**대상:** 팀장

**메시지 내용:**
- 대회명, 팀명
- 미제출 안내
- 마감일 정보
- 선수 명단 등록 링크

**구현:** `functions/src/notifications/dailyRosterReminders.ts` (Pub/Sub 스케줄러, 매일 9시)

---

### C. 마감 임박 알림 (선택)

**트리거:** 마감일 D-1

**대상:** 팀장

**메시지 내용:**
- 마감 임박 경고
- 수정 불가 안내
- 선수 명단 등록 링크

**구현:** `functions/src/notifications/dailyRosterReminders.ts` (동일 스케줄러)

---

## 🏗️ 아키텍처

### 파일 구조

```
functions/src/notifications/
├── templates.ts              # 알림 메시지 템플릿
├── emailSender.ts           # 이메일 전송 유틸리티
├── onApplicationApproved.ts # 승인 알림 (Firestore Trigger)
└── dailyRosterReminders.ts  # 미제출 알림 (스케줄러)
```

### 데이터 흐름

```
1. 승인 알림:
   어드민 승인 버튼 클릭
   → approveApplicationCallable 실행
   → applications.status = "approved"
   → onApplicationApproved Trigger 실행
   → 이메일 발송

2. 미제출 알림:
   매일 9시 (KST)
   → dailyRosterReminders 실행
   → approved + draft 상태 조회
   → 마감일 기준 필터링 (D-3, D-1)
   → 이메일 발송
```

---

## 📧 이메일 전송 채널

### v1.1: 이메일 (최소 구현)

**우선순위:**
1. SendGrid (환경 변수: `SENDGRID_API_KEY`)
2. Gmail (환경 변수: `GMAIL_USER`, `GMAIL_PASS`)

**설정 방법:**

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set sendgrid.api_key="SG.xxx"
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.pass="your-app-password"
firebase functions:config:set frontend.url="https://yago.app"
```

또는 `.env` 파일 (로컬 개발):

```env
SENDGRID_API_KEY=SG.xxx
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
FRONTEND_URL=https://yago.app
```

---

## 🚀 배포

### 1. 함수 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:onApplicationApproved,functions:dailyRosterReminders
```

### 2. 환경 변수 확인

```bash
firebase functions:config:get
```

### 3. 테스트

**승인 알림 테스트:**
1. 어드민에서 참가 신청 승인
2. 팀장 이메일 확인

**미제출 알림 테스트:**
1. 수동 트리거 (Firebase Console → Functions → dailyRosterReminders → "테스트")
2. 또는 다음 날 9시까지 대기

---

## 📊 알림 로그

각 알림 발송은 `notifications` 서브컬렉션에 기록됩니다:

```
associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}/notifications/{notificationId}
```

**필드:**
- `type`: `"APPROVAL"` | `"ROSTER_REMINDER"` | `"DEADLINE_APPROACHING"`
- `sentAt`: Timestamp
- `recipientEmail`: string
- `subject`: string (승인 알림만)
- `daysUntilDeadline`: number (리마인더만)
- `success`: boolean

---

## 🔧 커스터마이징

### 템플릿 수정

`functions/src/notifications/templates.ts`에서 메시지 템플릿을 수정할 수 있습니다.

### 알림 조건 변경

`functions/src/notifications/dailyRosterReminders.ts`에서 알림 조건을 수정:

```typescript
// 예: D-7, D-3, D-1에 알림
const shouldSendReminder =
  daysUntilDeadline === undefined ||
  daysUntilDeadline === 7 ||
  daysUntilDeadline === 3 ||
  daysUntilDeadline === 1;
```

### 스케줄 변경

`functions/src/notifications/dailyRosterReminders.ts`에서 스케줄을 수정:

```typescript
schedule: "0 9 * * *", // 매일 9시
// 또는
schedule: "0 10,14 * * *", // 매일 10시, 14시
```

---

## ⚠️ 주의사항

1. **이메일 설정 필수:** SendGrid 또는 Gmail 설정이 없으면 알림이 발송되지 않습니다 (로그만 남김).

2. **실패 처리:** 알림 발송 실패해도 운영 흐름(승인, 명단 제출 등)에는 영향 없습니다.

3. **배치 제한:** 미제출 알림은 한 번에 최대 100건까지만 발송합니다 (무한 루프 방지).

4. **중복 방지:** 동일 신청에 대해 하루 1회만 알림을 발송합니다 (추후 개선 가능).

---

## 🎯 다음 단계 (v1.2)

1. **카카오 알림톡 연동** (열람률 최강)
2. **알림 로그 UI** (어드민 화면에서 발송 이력 확인)
3. **알림 재전송 기능** (실패한 알림 수동 재전송)
4. **알림 설정 관리** (팀장별 알림 수신 설정)

---

## 📝 체크리스트

배포 전 확인:

- [ ] SendGrid 또는 Gmail 환경 변수 설정
- [ ] `FRONTEND_URL` 환경 변수 설정
- [ ] `onApplicationApproved` 함수 배포
- [ ] `dailyRosterReminders` 함수 배포
- [ ] 테스트: 승인 알림 발송 확인
- [ ] 테스트: 미제출 알림 발송 확인 (수동 트리거)

---

**🔥 이 시스템이 완성되면 운영자는 버튼만 누르면 끝, 팀장은 "지금 뭘 해야 하는지" 즉시 인지합니다.**
