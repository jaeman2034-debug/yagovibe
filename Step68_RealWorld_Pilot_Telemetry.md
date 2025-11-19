# Step 68: Real-World Pilot & Telemetry Review

5~10개 팀에 제한 배포(카나리아)하여 성능·품질·거버넌스 KPI를 실사용 데이터로 검증하고, 텔레메트리 파이프라인을 통해 개선 백로그를 도출합니다.

## 📋 목표

1. 파일럿 범위 & 가설 설정
2. 텔레메트리 설계 (Event & Metrics)
3. SDK 구현 (프론트 텔레메트리 유틸)
4. Functions - Telemetry Ingest & Daily Rollup
5. 파일럿 콘솔 (Pilot Console)
6. 성공/실패 기준 & 롤백 규칙
7. Pilot → Improvement Backlog 생성
8. 개인정보/윤리 가이드

## 🎯 파일럿 범위 & 가설

### 대상 팀
- 소흘FC, FC88, 청룡/백호, Academy 2팀, 외부 파트너 1~2팀 (총 6~8팀)

### 기능 범위
- Step 57~67 핵심 (리포트/코파일럿/KG/거버넌스/오프라인/엣지)

### 가설 (KPI)

| 가설 | 성공 기준 |
|------|----------|
| GraphAsk p95 Latency | < 900ms (Edge+Cache 적용 시) |
| Error Rate | < 1% |
| 인사이트 승인율 | ≥ 70% |
| 오프라인 제출 성공률 | ≥ 99% (BG Sync 1회 내) |
| Governance 경보 정확도 | ≥ 80% (유효 알람 비율) |

## 📊 텔레메트리 설계

### 공통 이벤트 스키마

**events/{date}/{uuid}**
```typescript
{
  ts: string;
  orgId: string;
  teamId?: string;
  userId?: string;
  sessionId: string;
  type: 'graphask' | 'insight_approve' | 'insight_reject' | 'tts_play' | 'offline_submit' | 'policy_alert';
  ctx: {
    page: string;
    device: string;
    region: string;
    appVer: string;
  };
  perf?: {
    durMs: number;
    ttfb?: number;
    sizeKb?: number;
  };
  meta?: any;
  receivedAt: Timestamp;
}
```

### KPI 뷰 (BigQuery 또는 Firestore 집계)

**telemetryDaily/{docId}**
```typescript
{
  teamId: string;
  day: string; // YYYY-MM-DD
  count: number;
  errorRate: number; // 4xx/5xx 비율
  p95: number; // p95 Latency
  approvalRate: number; // approved / (approved+rejected)
  alertPrecision: number; // 유효알람 / 전체알람
  offlineSuccess: number; // 24h 내 재전송 성공율
  createdAt: Timestamp;
}
```

## ⚙️ 구현

### 1. 텔레메트리 SDK

**파일**: `src/lib/telemetry.ts`

**구현된 기능**:
- ✅ `emit()`: 이벤트 발송
- ✅ `emitSimple()`: 간편 이벤트 발송
- ✅ `emitPerf()`: 성능 이벤트 발송
- ✅ `markStart()`: 성능 측정 시작
- ✅ `markPerf()`: 성능 측정 완료
- ✅ `markTTFB()`: TTFB 측정
- ✅ 오프라인 큐 자동 저장 (Step 67)

**사용 예**:
```typescript
import { emit, emitPerf, markStart } from '@/lib/telemetry';

// 간단 이벤트
await emit({ type: 'graphask', meta: { ok: true } });

// 성능 측정
const t0 = markStart('graphAsk');
const r = await fetch('/api/graphAsk');
await emitPerf('graphask', t0, { ok: r.ok });
```

### 2. Functions - Telemetry Ingest

**파일**: `functions/src/step68.telemetry.ts`

**구현된 기능**:
- ✅ `POST /telemetryIngest`: 텔레메트리 이벤트 수집
- ✅ PII 제거·마스킹 (Step 62 `redactPII` 사용)
- ✅ `events/{date}` 컬렉션에 저장

### 3. Functions - Daily Rollup

**파일**: `functions/src/step68.telemetry.ts`

**구현된 기능**:
- ✅ `telemetryDailyRollup`: 매일 00:05 실행
- ✅ 팀별 KPI 집계 (p95, errorRate, approvalRate, alertPrecision, offlineSuccess)
- ✅ `telemetryDaily` 컬렉션에 저장

### 4. Functions - Get Telemetry Daily

**파일**: `functions/src/step68.telemetry.ts`

**구현된 기능**:
- ✅ `GET /getTelemetryDaily?limit=14&teamId=TEAM_ID`
- ✅ 최근 N일간 텔레메트리 데이터 조회
- ✅ 팀별 필터링 지원

### 5. Functions - Gap To Backlog

**파일**: `functions/src/step68.gapToBacklog.ts`

**구현된 기능**:
- ✅ `gapToBacklog`: 매일 01:00 실행
- ✅ 텔레메트리 임계치 미달 항목을 `improvements` 컬렉션에 추가
- ✅ 중복 체크 (같은 팀, 같은 날, 같은 gap)

### 6. Functions - Pilot Rollback Check

**파일**: `functions/src/step68.pilotRollback.ts`

**구현된 기능**:
- ✅ `pilotRollbackCheck`: 매일 02:00 실행
- ✅ 5일 연속 KPI 충족 시 Step 64 `rolloutAdvance` 호출
- ✅ 부분 실패: 팀 단위 롤백 & 개선 태스크 발행
- ✅ 전체 실패: 카나리아 중단 + 원인 분석 태스크 발행

### 7. 파일럿 콘솔

**파일**: `src/pages/admin/PilotConsole.tsx`

**구현된 기능**:
- ✅ 평균 KPI 표시 (최근 14일)
- ✅ 팀별 상세 데이터 표시
- ✅ KPI 임계치 기반 Badge 표시
- ✅ Step 43 Role System 연동 (Owner/SecOps만 접근)

**접근 경로**: `/app/admin/pilot-console` (Owner/SecOps 권한 필요)

## 🔄 성공/실패 기준 & 롤백 규칙

### 성공 기준
- 5일 연속 KPI 충족 시 `rolloutAdvance` 호출 (Step 64)
- rollout.percent 증가

### 부분 실패
- 특정 팀에서만 KPI 미달
- 팀 단위 롤백 & 개선 태스크 발행
- `pilotRollbacks` 컬렉션에 기록

### 전체 실패
- 전반 KPI 미달
- 카나리아 중단 (`policies/rollout.paused = true`)
- 원인 분석 태스크 발행

## 📋 Improvement Backlog

**improvements/{docId}**
```typescript
{
  teamId: string;
  day: string;
  gap: string; // "GraphAsk latency > 900ms (현재: 1200ms)"
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Timestamp;
}
```

## 🔒 개인정보/윤리 가이드

### 가명화
- ✅ 이벤트의 개인식별자 제거/해시 (Step 62 `redactPII` 사용)
- ✅ 이메일, 전화번호 자동 마스킹

### Opt-Out
- ⚠️ 참가 팀/사용자 단위 텔레메트리 옵트아웃 지원 (TODO)

### 목적제한
- ✅ 파일럿 데이터는 품질 개선/장애 대응 외 사용 금지 (문서화)

## 🔧 사용 방법

### 1. 텔레메트리 이벤트 발송

```typescript
import { emit, emitPerf, markStart } from '@/lib/telemetry';

// 간단 이벤트
await emit({ 
  type: 'insight_approve', 
  teamId: 'team-123',
  meta: { insightId: 'insight-456' }
});

// 성능 측정
const t0 = markStart('graphAsk');
const result = await graphAsk(query);
await emitPerf('graphask', t0, { success: true });
```

### 2. 파일럿 콘솔 접근

```
/app/admin/pilot-console
(Owner/SecOps 권한 필요)
```

## 📊 테스트 시나리오

### 1. 텔레메트리 이벤트 수집

1. 프론트엔드에서 `emit()` 호출
2. `events/{date}` 컬렉션에 저장 확인
3. PII 마스킹 확인

### 2. 일일 집계

1. `telemetryDailyRollup` 실행
2. `telemetryDaily` 컬렉션에 집계 데이터 확인
3. KPI 계산 정확성 확인

### 3. 백로그 생성

1. KPI 임계치 미달 데이터 생성
2. `gapToBacklog` 실행
3. `improvements` 컬렉션에 백로그 항목 확인

### 4. 롤백 규칙

1. 5일 연속 KPI 충족 시나리오
2. `rolloutAdvance` 자동 호출 확인
3. 부분/전체 실패 시나리오
4. 롤백 및 개선 태스크 발행 확인

## 🚀 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:telemetryIngest,functions:telemetryDailyRollup,functions:getTelemetryDaily,functions:gapToBacklog,functions:pilotRollbackCheck
```

### 2. 프론트엔드 접근

```
/app/admin/pilot-console
(Owner/SecOps 권한 필요)
```

### 3. 파일럿 팀 설정

```javascript
// 전역 변수 설정 (또는 환경 변수)
window.__ORG_ID__ = 'org-123';
window.__TEAM_ID__ = 'team-456';
window.__USER_ID__ = 'user-789';
```

## 📚 다음 단계

- Step 69: 실시간 텔레메트리 대시보드
- Step 70: A/B 테스트 프레임워크
- Step 71: 자동화된 성능 개선 루프

