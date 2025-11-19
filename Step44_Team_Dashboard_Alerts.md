# Step 44: 팀별 통합 대시보드 + 실시간 알람 (Slack / SMS / Email)

팀 단위로 리포트 품질 지표를 집계하고, 임계치 발생 시 실시간으로 Slack·SMS·Email로 알림을 발송합니다.

## 📋 개요

### 주요 기능

1. **팀별 품질 지표 집계**
   - 최근 24시간 평균 점수/커버리지
   - 전일 대비 점수 변화 추적
   - Gaps/Overlaps 집계

2. **임계치 기반 실시간 알림**
   - 점수 급락 감지
   - 커버리지 저하 감지
   - Gaps/Overlaps 과다 감지
   - Slack, Email, SMS 발송

3. **팀 대시보드**
   - 실시간 메트릭 표시
   - 7일 트렌드 차트
   - 최근 알림 목록
   - 임계치 설정 표시

## 🚀 설치 및 배포

### 1. Firebase Functions 패키지 설치

```bash
cd functions
npm install node-fetch nodemailer
# 또는
pnpm add node-fetch nodemailer
```

### 2. 환경 변수 설정

```bash
firebase functions:config:set \
  slack.webhook_url="https://hooks.slack.com/services/..." \
  smtp.user="your-email@gmail.com" \
  smtp.pass="your-app-password" \
  alert.email_to="admin@yago-vibe.com" \
  twilio.account_sid="ACxxxxxxxxxxxxx" \
  twilio.auth_token="your-token" \
  twilio.from_phone="+1234567890" \
  alert.phone="+1234567890"
```

### 3. Functions 배포

```bash
firebase deploy --only functions:onTeamQualityCreated,hourlyTeamRollupAndAlert
```

## 📊 Firestore 데이터 구조

### 팀 문서

```
teams/{teamId}
  - name: string
  - owners: string[]
  - coaches: string[]
  - members: string[]
  - metrics: {
      lastScore: number
      lastCoverage: number
      lastUpdatedAt: Timestamp
    }
  - rollup24h: {
      avgScore: number
      avgCoverage: number
      gaps: number
      overlaps: number
      count: number
    }
  - thresholds: {
      scoreDrop: number      // 기본: 0.1
      coverageMin: number    // 기본: 0.9
      gapMax: number         // 기본: 10
      overlapMax: number     // 기본: 8
    }
  - alertTargets: {
      emails: string[]
      phones: string[]
    }
```

### 리포트 구조

```
teams/{teamId}/reports/{reportId}
  - content: string
  - keywords: string[]
  - audioUrl: string
  - sentenceTimestamps: SentenceTimestamp[]
  - lastQualityScore: number
  - lastProcessedAt: Timestamp

teams/{teamId}/reports/{reportId}/qualityReports/{timestamp}
  - metrics: {
      overallScore: number
      coverage: number
      gaps: number
      overlaps: number
      avgDur: number
    }
  - createdAt: Timestamp
```

### 알림 로그

```
teams/{teamId}/alerts/{alertId}
  - createdAt: Timestamp
  - type: "threshold"
  - messages: string[]
  - snapshot: {
      todayAvg: number
      prevAvg: number
      avgCov24: number
      gaps: number
      overlaps: number
    }
```

## 🔧 사용 방법

### 1. 팀 대시보드 사용

```tsx
import TeamInsightsDashboard from "@/components/TeamInsightsDashboard";

export default function TeamPage() {
  return <TeamInsightsDashboard teamId="SOHEUL_FC" />;
}
```

### 2. 팀 문서 생성

```typescript
// Firestore Console 또는 Cloud Function에서
await db.collection("teams").doc("SOHEUL_FC").set({
  name: "소흘 FC",
  owners: ["user1@example.com"],
  coaches: ["coach1@example.com"],
  members: ["member1@example.com"],
  thresholds: {
    scoreDrop: 0.1,
    coverageMin: 0.9,
    gapMax: 10,
    overlapMax: 8,
  },
  alertTargets: {
    emails: ["admin@yago-vibe.com", "coach@example.com"],
    phones: ["+821012345678"],
  },
});
```

### 3. 리포트를 팀에 연결

기존 리포트를 팀에 연결하려면:

```typescript
// 방법 1: 리포트에 teamId 필드 추가
await db.collection("reports").doc(reportId).set({
  teamId: "SOHEUL_FC",
  // ... 기타 필드
}, { merge: true });

// 방법 2: 팀 구조로 복사/미러링
const reportData = await db.collection("reports").doc(reportId).get();
await db.collection("teams").doc(teamId).collection("reports").doc(reportId).set(reportData.data());
```

## 🎯 임계치 설정

### 기본 임계치

```typescript
{
  scoreDrop: 0.1,      // 점수 급락 임계치 (전일 대비)
  coverageMin: 0.9,    // 커버리지 최소값 (90%)
  gapMax: 10,          // Gaps 최대값
  overlapMax: 8,       // Overlaps 최대값
}
```

### 팀별 커스터마이징

```typescript
// teams/{teamId} 문서에 thresholds 필드 추가
await db.collection("teams").doc(teamId).update({
  thresholds: {
    scoreDrop: 0.15,     // 더 엄격한 기준
    coverageMin: 0.95,   // 더 높은 커버리지 요구
    gapMax: 5,
    overlapMax: 3,
  },
});
```

## 📨 알림 발송

### Slack 알림

```
🚨 *팀 알림* (소흘 FC)
• 점수 급락: -0.15 (전일 0.95 → 금일 0.80)
• 커버리지 저하: 85.0% (< 90%)
```

### Email 알림

- **제목**: `[YAGO] 팀 알림: 소흘 FC`
- **본문**: Slack 메시지와 동일 (마크다운 제거)

### SMS 알림 (Twilio)

- Slack 메시지와 동일 (마크다운 및 특수문자 제거)

## 🔔 알림 트리거 조건

### 1. 실시간 트리거

`teams/{teamId}/reports/{reportId}/qualityReports/{timestamp}` 문서 생성 시:
- 즉시 집계 및 알림 발송
- 중복 알림 방지 (최근 1시간 내 알림 확인)

### 2. 스케줄 트리거 (선택적)

매 시간마다 실행 (`hourlyTeamRollupAndAlert`):
- 누락된 알림 보완
- 모든 팀 일괄 집계

## 📊 대시보드 구성

### KPI 카드

1. **최근 점수**: 가장 최근 품질 점수
2. **커버리지**: 가장 최근 커버리지
3. **24시간 평균 점수**: 최근 24시간 평균
4. **24시간 리포트 수**: 최근 24시간 리포트 개수

### 트렌드 차트

- **7일 트렌드**: Score & Coverage 라인 차트
- X축: 날짜 (MM-DD)
- Y축: Score (0-1), Coverage (0-1)

### 알림 목록

- 최근 10개 알림 표시
- 시간, 메시지 내용 표시

### 임계치 설정

- 현재 적용된 임계치 값 표시
- 팀별 커스터마이징된 값 표시

## 🛡️ 보안 및 권한

### Step 43 역할 기반 권한 통합

```tsx
import { useRoleAccess } from "@/hooks/useRoleAccess";

const { canView } = useRoleAccess(teamId);

if (!canView) {
  return <div>접근 권한이 없습니다.</div>;
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 팀 문서: 팀 멤버만 읽기 가능
    match /teams/{teamId} {
      allow read: if request.auth != null && 
                     (request.auth.uid in resource.data.owners ||
                      request.auth.uid in resource.data.coaches ||
                      request.auth.uid in resource.data.members);
      allow write: if request.auth != null && 
                     request.auth.uid in resource.data.owners;
    }

    // 팀 리포트: 팀 멤버만 읽기 가능
    match /teams/{teamId}/reports/{reportId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners;
    }

    // 알림 로그: 팀 멤버만 읽기 가능
    match /teams/{teamId}/alerts/{alertId} {
      allow read: if request.auth != null;
      allow write: if false; // Functions에서만 쓰기
    }
  }
}
```

## 🐛 문제 해결

### 알림이 발송되지 않을 때

1. **환경 변수 확인**: Slack/Email/SMS 설정 확인
2. **임계치 확인**: 팀 문서의 thresholds 값 확인
3. **데이터 확인**: qualityReports 데이터가 올바른 경로에 있는지 확인
4. **Functions 로그**: Firebase Console에서 Functions 로그 확인

### 트렌드 차트가 표시되지 않을 때

1. **데이터 확인**: `teams/{teamId}/reports` 컬렉션에 리포트가 있는지 확인
2. **날짜 형식**: createdAt 필드가 올바른 Timestamp 형식인지 확인
3. **콘솔 확인**: 브라우저 개발자 도구에서 오류 메시지 확인

### 팀 대시보드가 로드되지 않을 때

1. **팀 문서 확인**: `teams/{teamId}` 문서가 존재하는지 확인
2. **권한 확인**: Step 43 역할 설정 확인
3. **네트워크 확인**: Firestore 연결 상태 확인

## 📝 예시: 팀 생성 및 설정

```typescript
// Cloud Function에서 팀 생성
const teamId = "SOHEUL_FC";
await db.collection("teams").doc(teamId).set({
  name: "소흘 FC",
  owners: ["owner1@example.com"],
  coaches: ["coach1@example.com"],
  members: ["member1@example.com", "member2@example.com"],
  thresholds: {
    scoreDrop: 0.1,
    coverageMin: 0.9,
    gapMax: 10,
    overlapMax: 8,
  },
  alertTargets: {
    emails: ["admin@yago-vibe.com", "coach1@example.com"],
    phones: ["+821012345678"],
  },
  metrics: {
    lastScore: 0,
    lastCoverage: 0,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
});
```

## 🎯 다음 단계

- Step 45: 팀 관리 UI (역할 관리, 임계치 설정)
- Step 46: 알림 설정 UI (수신 대상 관리)
- Step 47: 리포트 자동 배치 (팀별 자동 리포트 생성)

