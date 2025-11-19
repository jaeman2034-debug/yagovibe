# Step 66: Resilience & Chaos Testing

대규모 트래픽·오류·지연·종속 서비스 장애 상황에서도 다운타임 최소화와 서비스 연속성을 보장하는 회복력 아키텍처를 구축합니다. 혼돈 실험(Chaos)으로 실패를 미리 재현/학습하고, 자동 복구 시나리오를 코드화합니다.

## 📋 목표

1. 회복력 아키텍처 구축
2. 혼돈 실험(Chaos Testing) 구현
3. 자동 복구 시나리오 코드화
4. SLO 모니터링 및 알림

## 🗄️ 실패 가설 & 시나리오 매트릭스

| 범주 | 가설 | 관측 지표 | 성공 기준 |
|------|------|----------|---------|
| RateLimit/쿼터 | 급증 트래픽으로 rpm 초과 | 429 비율, 대기열 길이 | 고급 플랜(q-prio1) 95%<1s 처리, free는 대기 허용 |
| 외부 LLM 다운 | LLM 5xx/타임아웃 | 실패율, 대체모델 히트율 | Fallback 모델로 99% 응답 유지 |
| Neo4j 지연 | KG 질의 >1.5s | p95 Latency | 캐시/샤딩 후 p95<800ms |
| Firestore 할당량 | 쓰기 폭증 | 오류율, 재시도 성공율 | 지수백오프로 3회 내 회복 |
| 함수 배포 중 | 콜드스타트↑ | p95 Startup | 프리워밍/캐시로 안정화 |

## ⚙️ 회복력 패턴 (코드 레벨)

### 1. Circuit Breaker + 지수 백오프

**파일**: `src/lib/resilience/circuit.ts`

**구현된 기능**:
- `Circuit` 클래스: 실패 임계치 도달 시 자동 차단
- `withBreaker()`: Circuit Breaker로 함수 실행
- `retry()`: 지수 백오프 재시도
- `withBreakerAndRetry()`: Circuit Breaker + 재시도 조합

**사용 예**:
```typescript
import { Circuit, withBreaker, retry } from '@/lib/resilience/circuit';

const breaker = new Circuit(4, 8000); // 4회 실패 시 8초 차단

await withBreaker(breaker, () => retry(() => fetch('/api/heavy'), 3));
```

### 2. Fallback Model 체인

**파일**: `src/lib/resilience/fallback.ts`

**구현된 기능**:
- `askWithFallback()`: 여러 모델을 순차적으로 시도
- `askWithFallbackLimited()`: Primary 모델 실패 시 Fallback 모델 사용

**사용 예**:
```typescript
import { askWithFallback } from '@/lib/resilience/fallback';

const result = await askWithFallback(prompt, [
  'gpt-4o-mini',
  'gpt-4o',
  'claude-opus',
  'local-llm'
]);
```

### 3. 캐시 + 강제 제한(Limiter)

**파일**: `src/lib/resilience/cache.ts`

**구현된 기능**:
- `cacheGet()`, `cacheSet()`: 메모리 캐시
- `cached()`: 캐시된 함수 실행
- `throttle()`: 최소 간격 내 호출 차단
- `createRateLimiter()`: 슬라이딩 윈도우 제한

**사용 예**:
```typescript
import { cached, throttle, createRateLimiter } from '@/lib/resilience/cache';

// 캐시 사용
const result = await cached('key', 30000, () => fetchData());

// Throttle
await throttle(120); // 최소 120ms 간격

// Rate Limiter
const limiter = createRateLimiter(10, 60000); // 1분에 10회
await limiter.waitIfNeeded();
```

## 🔀 Chaos Functions (실험 트리거)

### 1. 랜덤 지연/오류 주입

**파일**: `functions/src/step66.chaosDelay.ts`

**엔드포인트**: `GET /chaosDelay?p=0.2&d=300`
- `p`: 오류 확률 (0.0 ~ 1.0, 기본 0.2 = 20%)
- `d`: 기본 지연 시간 (ms, 기본 300)

**기능**:
- 랜덤 지연 (d ~ 2d 범위)
- 랜덤 오류 주입 (확률 p)

### 2. 외부 의존 차단 시뮬레이터

**파일**: `functions/src/step66.chaosProxy.ts`

**엔드포인트**: `GET /chaosProxy?mode=ok|drop|slow|error`
- `ok`: 정상 응답
- `drop`: 패킷 드랍 시뮬 (응답 없음)
- `slow`: 느린 응답 (4초 지연)
- `error`: 오류 응답 (502)

## 🖥️ Frontend - 회복 UX

### ResilientCall 컴포넌트

**파일**: `src/components/ResilientCall.tsx`

**기능**:
- Circuit Breaker + 재시도로 호출
- Fallback 모드 UI 표시
- Circuit Breaker 상태 표시

### Chaos Testing 페이지

**파일**: `src/pages/admin/ChaosTesting.tsx`

**기능**:
- 회복력 있는 호출 테스트
- 랜덤 지연/오류 주입 테스트
- 외부 의존 차단 시뮬레이터 테스트
- 테스트 결과 표시

**접근 경로**: `/app/admin/chaos-testing` (Owner/SecOps 권한 필요)

## 📊 SLO/알림

### SLO Monitor

**파일**: `functions/src/step66.sloMonitor.ts`

**스케줄**: 매 5분마다 실행

**SLO 정의**:
- `graphAsk`: p95 Latency < 900ms, Error Rate < 1%
- `insights`: Delivery Success Rate > 99%
- `general`: Error Rate < 1%

**기능**:
- 최근 5분간 메트릭 조회
- SLO 위반 감지
- Slack 알림 전송
- Firestore에 기록

## 🎯 카나리아 & 롤백 전략 (Step64 연동)

### 카나리아 배포

- `rollout.percent=10/50/100`에 따라 신규 모델/정책 적용 범위 조정
- Step 64 `rolloutAdvance` 함수 활용

### 헬스게이트

- p95 Latency, 실패율 > 임계치 → 자동 롤백
- `rolloutAdvance` 중단, 이전 버전으로 복귀

### 블루/그린 배포

- Functions 새 버전 배포 시 트래픽 스플릿
- Firebase Hosting Rewrites 사용

## 📋 Chaos 플레이북 (주간/월간)

### 1. LLM Down

**시나리오**: `chaosProxy?mode=error` 15분 실행

**확인 사항**:
- Fallback 히트율
- 응답률 유지 (99% 이상)

### 2. Neo4j Slow

**시나리오**: `chaosDelay?d=1500` 실행

**확인 사항**:
- 캐시 히트율
- UX Fallback 메시지 점검

### 3. RateLimit 폭주

**시나리오**: 시뮬 부하도구(artillery/k6)로 rpm*1.5 실행

**확인 사항**:
- q-prio1 서비스 지연 여부 측정
- 고급 플랜 95% < 1s 처리

### 4. 콜드스타트

**시나리오**: 무작위 지역 호출

**확인 사항**:
- 프리워밍 태스크 유효성 점검

## 🔍 관찰성(Observability) 보강

### 분산 트레이싱

- OpenTelemetry + traceId Propagation
- `opsRouterV2` → `graphCopilot` → `Neo4j` 트레이싱

### 메트릭

- p50/p90/p95 Latency
- 오류코드별 비율
- 큐 대기시간
- 캐시 히트율

### 로그 샘플링

- 고에러 구간 집중 수집
- PII 마스킹 적용 (Step 62)

## 🔄 자동 복구 루프

1. **실패 감지**: Circuit Breaker 열림 / 메트릭 알림
2. **Fallback·재시도**: 자동 대체 경로 시도
3. **캐시/큐잉**: 부하 흡수
4. **정책 롤백/차단**: Step 64 `rolloutAdvance` 중단
5. **안정화 후 CB 닫힘**: 회복 완료

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:chaosDelay,functions:chaosProxy,functions:sloMonitor
```

### 2. 프론트엔드 접근

```
/app/admin/chaos-testing
(Owner/SecOps 권한 필요)
```

### 3. 환경 변수 설정

```bash
# .env
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 📚 다음 단계

- Step 67: OpenTelemetry 분산 트레이싱
- Step 68: 자동 스케일링 및 프리워밍
- Step 69: 실시간 메트릭 대시보드

