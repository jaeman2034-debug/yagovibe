# 🚀 Step 32 — 정식 릴리즈 체크 (에러 버짓 · SLO · 릴리즈 노트 자동 생성)

## 📋 개요

정식 릴리즈를 위한 자동화된 체크 시스템을 구현합니다:
- **에러 버짓 (Error Budget)** 계산
- **SLO (Service Level Objective)** 준수율 체크
- **릴리즈 노트 자동 생성** (AI 기반)

## 🔧 구현 내용

### 1️⃣ Firebase Functions

#### `releaseCheck.ts`
- **스케줄러**: 매주 월요일 10:00 KST 자동 실행
- **HTTP 함수**: `releaseCheck` - 수동 실행 가능
- **기능**:
  - 최근 7일 `workflowLogs` 분석
  - 에러율 계산 (목표: 1% 이하)
  - SLO 충족 여부 확인
  - 에러 버짓 사용률 계산
  - 최근 오류 상위 5개 추출
  - Firestore `releaseChecks/latest`에 저장
  - SLO 미충족 시 Slack 알림

#### `generateReleaseNotes.ts`
- **스케줄러**: 매주 월요일 10:30 KST 자동 실행
- **HTTP 함수**: `generateReleaseNotes` - 수동 실행 가능
- **기능**:
  - 최근 1주간 데이터 수집 (reports, workflowLogs, betaFeedback)
  - OpenAI GPT-4o-mini로 릴리즈 노트 생성
  - Firestore `releaseNotes/latest`에 저장
  - Slack으로 릴리즈 노트 전송

### 2️⃣ React 컴포넌트

#### `ReleaseBoard.tsx`
- **위치**: `src/components/admin/ReleaseBoard.tsx`
- **기능**:
  - 실시간 SLO 상태 표시 (총 실행, 오류, 오류율, SLO 충족 여부)
  - 에러 버짓 사용률 시각화 (프로그레스 바)
  - 최근 오류 목록 표시
  - 릴리즈 노트 표시 (마크다운 형식)
  - 다크 모드 지원

### 3️⃣ AdminHome 통합

- **ReleaseBoard 컴포넌트 추가**: BetaFeedbackCard와 함께 그리드 레이아웃
- **퀵 액션 버튼 추가**:
  - `releaseCheck` - 릴리즈 체크 (SLO)
  - `generateReleaseNotes` - 릴리즈 노트 생성

### 4️⃣ Firestore 보안 규칙

- `releaseChecks/{checkId}`: 관리자/매니저 읽기만 가능, 쓰기는 Functions 전용
- `releaseNotes/{noteId}`: 관리자/매니저 읽기만 가능, 쓰기는 Functions 전용

## 📊 SLO 설정

```typescript
const SLO_ERROR_RATE = 0.01; // 1% 이하 (99% 성공률)
const SLO_CHECK_WINDOW_DAYS = 7; // 최근 7일 기준
```

**SLO 충족 조건**:
- 에러율 ≤ 1%
- 에러 버짓 사용률 < 100%

## 🔄 자동 실행 스케줄

| 함수 | 스케줄 | 시간 | 설명 |
|------|--------|------|------|
| `releaseCheckJob` | 매주 월요일 | 10:00 KST | SLO 체크 및 에러 버짓 계산 |
| `generateReleaseNotesJob` | 매주 월요일 | 10:30 KST | 릴리즈 노트 자동 생성 |

## 📝 릴리즈 노트 형식

AI가 자동으로 생성하는 릴리즈 노트는 다음 항목을 포함합니다:

1. **주요 개선사항** (3-5개)
2. **버그 수정** (있는 경우)
3. **새로운 기능** (있는 경우)
4. **성능 개선**
5. **다음 릴리즈 계획**

## 🚀 배포 방법

### 1. Functions 배포

```bash
firebase deploy --only functions:releaseCheck,functions:generateReleaseNotes,functions:releaseCheckJob,functions:generateReleaseNotesJob
```

### 2. 환경 변수 확인

```bash
# 필요한 환경 변수
firebase functions:secrets:get OPENAI_API_KEY
firebase functions:secrets:get SLACK_WEBHOOK_URL
# 또는
firebase functions:secrets:get SLACK_ALERT_WEBHOOK_URL
```

### 3. 수동 테스트

#### 릴리즈 체크 실행

```bash
# HTTP 함수 호출
curl -X POST https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/releaseCheck

# 또는 관리자 홈에서 "릴리즈 체크 (SLO)" 버튼 클릭
```

#### 릴리즈 노트 생성

```bash
# HTTP 함수 호출
curl -X POST https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/generateReleaseNotes

# 또는 관리자 홈에서 "릴리즈 노트 생성" 버튼 클릭
```

## 📊 Firestore 데이터 구조

### `releaseChecks/latest`

```typescript
{
  total: number;           // 총 실행 횟수
  success: number;        // 성공 횟수
  errors: number;         // 오류 횟수
  errorRate: string;      // 오류율 (예: "0.85")
  successRate: string;     // 성공률 (예: "99.15")
  sloMet: boolean;         // SLO 충족 여부
  errorBudget: string;     // 남은 에러 버짓 (%)
  errorBudgetUsed: string; // 사용된 에러 버짓 (%)
  avgDuration: number;     // 평균 실행 시간 (ms)
  recentErrors: Array<{   // 최근 오류 상위 5개
    step: string;
    errorMessage: string;
  }>;
  checkedAt: Timestamp;   // 체크 시간
  windowDays: number;     // 기준 기간 (일)
  sloTarget: number;      // SLO 목표 (예: 1.0)
}
```

### `releaseNotes/latest`

```typescript
{
  content: string;        // 릴리즈 노트 내용 (마크다운)
  version: string;        // 버전 (예: "v1.2025.01.15")
  reportCount: number;   // 리포트 생성 수
  successCount: number;  // 성공 횟수
  errorCount: number;    // 오류 횟수
  avgRating: string;      // 평균 평점
  generatedAt: Timestamp; // 생성 시간
}
```

## ✅ 체크리스트

### 배포 전
- [ ] Firebase Functions 환경 변수 설정 완료
- [ ] OpenAI API 키 설정 완료
- [ ] Slack Webhook URL 설정 완료
- [ ] Firestore 보안 규칙 배포 완료
- [ ] Functions 배포 완료

### 테스트
- [ ] 수동 릴리즈 체크 실행 성공
- [ ] 수동 릴리즈 노트 생성 성공
- [ ] ReleaseBoard 컴포넌트 표시 확인
- [ ] SLO 미충족 시 Slack 알림 확인
- [ ] 자동 스케줄러 실행 확인 (매주 월요일)

### 운영
- [ ] 매주 월요일 자동 실행 확인
- [ ] SLO 상태 모니터링
- [ ] 릴리즈 노트 품질 검토
- [ ] 에러 버짓 사용률 추적

## 🐛 문제 해결

### 릴리즈 체크가 실행되지 않을 때

1. **스케줄러 확인**
   ```bash
   firebase functions:log --only releaseCheckJob
   ```

2. **Firestore 데이터 확인**
   - `releaseChecks/latest` 문서 존재 여부 확인
   - `workflowLogs` 컬렉션에 최근 7일 데이터 존재 여부 확인

### 릴리즈 노트가 생성되지 않을 때

1. **OpenAI API 키 확인**
   ```bash
   firebase functions:secrets:get OPENAI_API_KEY
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log --only generateReleaseNotes
   ```

3. **Firestore 데이터 확인**
   - `releaseNotes/latest` 문서 존재 여부 확인
   - `reports`, `workflowLogs`, `betaFeedback` 컬렉션에 데이터 존재 여부 확인

### SLO 미충족 알림이 너무 자주 올 때

1. **에러율 확인**
   - `releaseChecks/latest` 문서에서 `errorRate` 확인
   - 1% 이상이면 Functions 오류 해결 필요

2. **에러 버짓 확인**
   - `errorBudgetUsed` 확인
   - 80% 이상이면 경고, 100% 이상이면 즉시 조치 필요

## 📚 관련 문서

- [Step 27: 워크플로우 모니터링](./STEP27_WORKFLOW_MONITORING.md)
- [Step 28: AI 리포트 헬스보드](./STEP28_HEALTH_DASHBOARD.md)
- [Step 31: Beta Release](./QUICK_START_BETA.md)

## 🎯 다음 단계

- Step 33: 프로덕션 모니터링 대시보드
- Step 34: 자동 롤백 시스템
- Step 35: A/B 테스트 자동화

