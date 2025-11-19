# Step 55: AI Self-QA & Governance Dashboard (자가 품질 검증 및 거버넌스 대시보드)

Copilot, 품질 모델, 재튜닝 시스템 전체의 테스트 결과와 품질 메트릭을 자동 수집하여 QA 신뢰지수, 실패율, 승인 로그, 리그레션 상태를 시각화하는 관리형 거버넌스 대시보드를 구축합니다.

## 📋 목표

1. 테스트 결과 자동 수집 (Step 54 Test Harness 연동)
2. 일별 통계 집계 (qaAggregator)
3. QA 신뢰지수 및 실패율 시각화
4. 리그레션 트렌드 모니터링
5. 거버넌스 대시보드 제공

## 🗄️ 데이터 모델

### qaResults/{buildId}

```typescript
{
  build: string;              // 'main-2025-11-04T09:00' 또는 'test-{timestamp}-{random}'
  testsPassed: number;        // 통과한 테스트 수
  testsFailed: number;        // 실패한 테스트 수
  avgLatencyMs: number;       // 평균 응답 시간 (ms)
  regressions: string[];      // 회귀 테스트 실패 항목
  failCases?: string[];       // 반복 실패 발생 명령
  timestamp: Timestamp;       // 테스트 실행 시간
}
```

### governance/{date}

```typescript
{
  date: string;               // 'YYYY-MM-DD'
  passRate: number;           // 통과율 (0-1)
  regressionCount: number;    // 회귀 테스트 실패 항목 수
  avgLatency: number;         // 평균 응답 시간 (ms)
  topFailCases: string[];     // Top 5 실패 케이스
  copilotReliability: number; // Copilot 신뢰지수 (0-1)
  lastUpdated: Timestamp;
  testCount: number;          // 총 테스트 수
  testsPassed: number;       // 통과한 테스트 수
  testsFailed: number;       // 실패한 테스트 수
  regressions: string[];      // 회귀 목록 (최대 10개)
}
```

## 🚀 구현 사항

### 1. Backend - qaAggregator

**파일**: `functions/src/step55.qaAggregator.ts`

- **스케줄러**: 매일 자정 실행 (`every 24 hours`)
- **기능**:
  - 최근 10개 빌드 결과 수집
  - 통과율 계산 (`passRate`)
  - Copilot 신뢰지수 계산 (`copilotReliability`)
  - 회귀 테스트 실패 항목 수집
  - Top Fail Cases 추출
  - `governance/{date}` 문서 저장

- **지표 계산**:
  - `passRate = testsPassed / (testsPassed + testsFailed)`
  - `copilotReliability = 1 - (testsFailed / total)`
  - `regressions`: 모든 빌드의 회귀 항목 중복 제거

### 2. Backend - getGovernance

**파일**: `functions/src/step55.getGovernance.ts`

- **엔드포인트**: `GET /getGovernance?limit=30`
- **기능**:
  - Governance 컬렉션에서 최근 데이터 조회
  - 날짜순 정렬 (최신순)
  - Timestamp 변환 처리

### 3. Frontend - GovernanceDashboard

**파일**: `src/pages/admin/GovernanceDashboard.tsx`

- **KPI 카드**:
  - Pass Rate (통과율)
  - Copilot Reliability (신뢰지수)
  - Regressions (회귀 수)
  - Avg Latency (평균 응답 시간)

- **QA 통계 테이블**:
  - 일별 통계 표시
  - Pass Rate, Reliability 색상 구분
  - Top Fail Cases 표시

- **QA 트렌드 차트**:
  - Pass Rate 트렌드
  - Copilot Reliability 트렌드
  - Recharts LineChart 사용

- **최근 실패 케이스**:
  - 최신 데이터의 Top Fail Cases 표시

### 4. 테스트 결과 저장 (Step 54 연동)

**파일**: `tests/test_reporter.ts`, `tests/test_scenarios.ts`

- `test_reporter.ts`: 테스트 결과를 Firestore에 저장하는 유틸리티
- `test_scenarios.ts`: 테스트 완료 후 결과 저장 (afterAll)

## 📊 지표 정의

| 항목 | 설명 | 계산 방법 |
|------|------|----------|
| Pass Rate | 테스트 통과율 | `testsPassed / (testsPassed + testsFailed)` |
| Copilot Reliability | 승인/명령 성공률 | `1 - (testsFailed / total)` |
| Regression Count | 최근 회귀 테스트 실패 항목 수 | 모든 빌드의 `regressions` 중복 제거 |
| Avg Latency | 평균 명령 응답 시간 (ms) | 모든 빌드의 `avgLatencyMs` 평균 |
| Top Fail Cases | 반복 실패 발생 명령 | 실패 빈도 기준 Top 5 |

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:qaAggregator,functions:getGovernance
```

### 2. 스케줄러 확인

```bash
# Firebase Console에서 스케줄러 확인
# 또는 수동 실행
firebase functions:shell
> qaAggregator()
```

### 3. 프론트엔드 접근

```
/app/admin/governance 경로로 접근
(관리자 권한 필요)
```

## 🧪 테스트 결과 저장

### 로컬 테스트

```bash
# 환경 변수 설정하여 테스트 결과 저장
SAVE_TEST_RESULTS=true pnpm test:copilot
```

### CI 테스트

GitHub Actions에서 자동으로 테스트 결과 저장:

```yaml
- name: Run Copilot Tests with Firebase Emulator
  run: |
    firebase emulators:exec \
      --only functions,firestore \
      'SAVE_TEST_RESULTS=true pnpm test:copilot'
```

## 📈 사용 시나리오

### 시나리오 1: 일별 QA 현황 확인

1. Governance Dashboard 접근
2. KPI 카드에서 최신 Pass Rate, Reliability 확인
3. QA 통계 테이블에서 일별 추이 확인

### 시나리오 2: 리그레션 모니터링

1. QA 트렌드 차트에서 Pass Rate 하락 구간 확인
2. Regressions 카드에서 회귀 수 확인
3. 최근 실패 케이스에서 반복 실패 항목 확인

### 시나리오 3: 성능 모니터링

1. Avg Latency 카드에서 평균 응답 시간 확인
2. QA 통계 테이블에서 Latency 추이 확인
3. 성능 저하 구간 식별

## 🎨 확장 아이디어

### 1. 알림 설정

- Pass Rate가 90% 이하로 떨어지면 Slack 알림
- Regressions가 5개 이상이면 Email 알림

### 2. 상세 분석

- 실패 케이스별 상세 로그 확인
- Intent별 성공률 분석
- 권한별 승인 성공률 분석

### 3. 자동 리포트

- 주간 QA 리포트 자동 생성
- PDF 리포트 생성 및 배포

## 🐛 문제 해결

### 문제 1: qaAggregator가 실행되지 않음

**원인**: 스케줄러가 설정되지 않음

**해결**:
```bash
# Firebase Console에서 스케줄러 확인
# 또는 수동 실행
firebase functions:shell
> qaAggregator()
```

### 문제 2: 테스트 결과가 저장되지 않음

**원인**: `SAVE_TEST_RESULTS` 환경 변수가 설정되지 않음

**해결**:
```bash
SAVE_TEST_RESULTS=true pnpm test:copilot
```

### 문제 3: 데이터가 표시되지 않음

**원인**: `governance` 컬렉션에 데이터가 없음

**해결**:
- `qaAggregator` 함수 수동 실행
- `qaResults` 컬렉션에 테스트 결과 저장 확인

## 📚 다음 단계

- Step 56: 알림 설정 (Slack/Email)
- Step 57: 상세 분석 대시보드
- Step 58: 자동 리포트 생성

