# Step 70: Post-Launch SRE & Growth Experiments

실사용 텔레메트리 기반으로 SLO(서비스 수준 목표)를 재정의하고, SRE 관점의 안정성·가용성 확보와 함께 A/B 테스트, 온보딩, 리텐션 실험을 자동화합니다.

## 📋 목표

1. SRE 목표 상향 (SLO 재정의)
2. SRE 대시보드 구축
3. Growth Experiment Framework (A/B Testing)
4. 온보딩/리텐션 실험 모듈
5. Growth Dashboard
6. 실험 → 제품화 플로우 자동화

## 🎯 SRE 목표 상향 (Service Level Objectives)

### SLO 정의

| 항목 | 목표치 | 관측 소스 | 경보 기준 |
|------|--------|----------|----------|
| 가용성 (Availability) | ≥ 99.95% | uptime monitor / health check | 10분 이상 중단 시 SEV2 |
| 오류율 (Error Rate) | < 0.5% | telemetryDaily.errorRate | >1% 지속 5분 시 알람 |
| GraphAsk p95 | < 800ms | traces / metrics | 900ms 초과 5분 지속 |
| 오프라인 동기화 성공률 | ≥ 99.5% | offline queue events | 98% 미만 시 재시도 배치 강화 |
| 알림 전달율 (Push/Slack) | ≥ 99% | messaging logs | 95% 미만 시 재시도 큐 증가 |

### SLO 스키마 (Firestore)

**파일**: `functions/src/step70.slo.ts`

```typescript
{
  metric: string; // 예: "availability", "errorRate", "graphAskP95"
  target: number; // 목표치
  window: '5m' | '1h' | '1d'; // 집계 기간
  source: 'telemetry' | 'trace' | 'queue'; // 관측 소스
  alertThreshold: number; // 경보 기준
  lastBreaches: Timestamp[]; // 최근 위반 기록
}
```

### SLO Watchdog

**구현된 기능**:
- ✅ `sloWatchdog`: 매 5분마다 실행
- ✅ 텔레메트리 데이터와 SLO 목표 비교
- ✅ 연속 위반 감지 (5분 이상 지속)
- ✅ Slack 알림 자동 전송

**API**:
- `GET /getSLOs`: SLO 목록 및 현재 값 조회
- `POST /initSLOs`: 기본 SLO 초기화

## 🖥️ SRE 대시보드

**파일**: `src/pages/admin/SREDashboard.tsx`

**구현된 기능**:
- ✅ SLO 목록 표시 (현재 값, 목표, 진행률)
- ✅ 상태 표시 (정상/경고/위반)
- ✅ Progress Bar로 시각화
- ✅ 최근 위반 기록 표시

**접근 경로**: `/app/admin/sre-dashboard` (Owner/Admin 권한 필요)

## 🧪 Growth Experiment Framework (A/B Testing)

**파일**: `functions/src/step70.abRouter.ts`

### A/B 라우터

**구현된 기능**:
- ✅ `GET /abRouter?exp=EXPERIMENT_ID&userId=USER_ID`: 사용자를 그룹 A 또는 B에 할당
- ✅ 기존 할당 확인 (일관성 유지)
- ✅ 랜덤 할당 (50/50)

**프론트엔드 사용 예시**:
```typescript
const r = await fetch(`/api/abRouter?exp=onboarding_v2&userId=${uid}`).then(r=>r.json());
if (r.group==='B') showNewOnboarding();
```

### A/B 분석

**구현된 기능**:
- ✅ `abAnalysis`: 매일 01:30 실행
- ✅ 그룹별 텔레메트리 데이터 집계
- ✅ 평균 계산 (p95, errorRate, approvalRate, offlineSuccess)
- ✅ 결과를 `experiments/{expId}`에 저장

**API**:
- `GET /listExperiments`: 실험 목록 조회

**실험 결과 스키마**:
```typescript
{
  results: {
    A: {
      p95: number;
      errorRate: number;
      approvalRate: number;
      offlineSuccess: number;
      count: number;
    };
    B: {
      p95: number;
      errorRate: number;
      approvalRate: number;
      offlineSuccess: number;
      count: number;
    };
  };
}
```

## 📊 온보딩/리텐션 실험 모듈

**파일**: `functions/src/step70.retention.ts`

### 실험 예시

- `onboarding_v2`: 음성+시각 튜토리얼 추가 → 7일 리텐션 측정
- `insight_push_optin`: 초기 TTS 요약 알림 권한 유도 → 클릭률 측정

### 리텐션 계산

**구현된 기능**:
- ✅ `calculateRetention`: 매일 02:00 실행
- ✅ D+7 리텐션 계산 (7일 전 세션의 재방문율)
- ✅ D+30 리텐션 계산 (30일 전 세션의 재방문율)
- ✅ 결과를 `retention` 컬렉션에 저장

**API**:
- `GET /getRetention?days=7`: 리텐션 메트릭 조회

**리텐션 스키마**:
```typescript
{
  day: string; // YYYY-MM-DD
  retention7: number; // D+7 리텐션
  retention30: number; // D+30 리텐션
  cohortSize: number; // 코호트 크기
  returningUsers: number; // 재방문 사용자 수
  calculatedAt: Timestamp;
}
```

## 🚀 Growth Dashboard

**파일**: `src/pages/admin/GrowthConsole.tsx`

**구현된 기능**:
- ✅ 실험 목록 표시
- ✅ 그룹 A/B 결과 비교
- ✅ 승자 표시 (TrendingUp/Down 아이콘)
- ✅ 승인율 차이 표시

**접근 경로**: `/app/admin/growth-console` (Owner/Admin 권한 필요)

## 🔄 실험 → 제품화 플로우

### 1. 실험 결과 검증

- `results.A/B` 비교
- KPI 유의미 차이 검출 (p<0.05)
- 통계적 유의성 검사

### 2. 성공 실험 → Feature Flag 승격

- 성공 실험 → `featureOverrides/{org}` 갱신
- 전체 사용자에게 롤아웃

### 3. 실패/무효 → 아카이브

- 실패/무효 실험 → `experiments_archive`로 이동
- 결과 분석 및 개선점 도출

## 🔗 성장·운영 루프 통합

```
[Telemetry / SLO] → [자동 알림 / Backlog] → [개선 배포] → [A/B 실험] → [결과 → Feature 승격]
                                    ↑                                       ↓
                                (SRE 안정성)                         (Growth 실험)
```

## 📋 실행 체크리스트

### SRE
- [x] SLO 정의 및 관리
- [x] SLO Watchdog 자동 경보
- [x] SRE 대시보드
- [ ] 가용성 모니터링 (uptime monitor) 통합 (TODO)

### Growth Experiments
- [x] A/B 라우터
- [x] A/B 분석 자동화
- [x] 리텐션 계산
- [x] Growth Dashboard
- [ ] 통계적 유의성 검사 (t-test) 개선 (TODO)
- [ ] Feature Flag 승격 자동화 (TODO)

### 온보딩/리텐션
- [x] 세션 추적
- [x] 리텐션 계산 (D+7, D+30)
- [ ] 온보딩 실험 템플릿 (TODO)

## 🚀 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:sloWatchdog,functions:getSLOs,functions:initSLOs,functions:abRouter,functions:abAnalysis,functions:listExperiments,functions:calculateRetention,functions:getRetention
```

### 2. 기본 SLO 초기화

```bash
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/initSLOs
```

### 3. 프론트엔드 접근

```
/app/admin/sre-dashboard
/app/admin/growth-console
(Owner/Admin 권한 필요)
```

## 📚 다음 단계

- Step 71: 자동화된 성능 개선 루프
- Step 72: 글로벌 확장 전략
- Step 73: ML 모델 자동 재학습 파이프라인

## ✅ 완료! 🧩🚀

Step 70 — Post-Launch SRE & Growth Experiments 완료!

