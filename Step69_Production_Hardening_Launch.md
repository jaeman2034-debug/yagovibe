# Step 69: Production Hardening & Launch Readiness

보안·성능·안정성·운영 체계를 출시에 맞춰 강화하고, 자동 점검 파이프라인과 롤백 플랜까지 포함한 출시 체크리스트를 완성합니다.

## 📋 목표

1. 보안 강화 (SAST/DAST/종속성 취약점, SBOM, 비밀키, 규정 준수)
2. 성능 최적화 (프런트 RUM, 백엔드 p50/p95, 캐시/인덱스/리소스 튜닝)
3. 운영 체계 (로깅/트레이싱, 온콜/런북, 배포·롤백·카나리아, 헬스체크)
4. Launch Gate CI (자동 점검 파이프라인)

## 🔒 보안 강화

### 1. CI Launch Gates

**파일**: `.github/workflows/ci-launch.yml`

**구현된 기능**:
- ✅ SAST (ESLint, TypeScript Type Check, Dependency Audit)
- ✅ SBOM (CycloneDX)
- ✅ DAST (OWASP ZAP Baseline)
- ✅ Performance Test (k6)

**체크 항목**:
- ESLint/TypeScript 오류 없음
- 종속성 취약점 없음
- SBOM 생성 완료
- OWASP ZAP 스캔 통과
- k6 성능 테스트 통과 (p95 < 900ms, 실패율 < 2%)

### 2. 보안 헤더/CSP/CORS

**파일**: `functions/src/step69.securityHeaders.ts`

**구현된 기능**:
- ✅ `setSecurityHeaders()`: 보안 헤더 설정
  - HSTS (HTTP Strict Transport Security)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
  - Permissions-Policy
  - Content-Security-Policy
- ✅ `setCORSHeaders()`: CORS 설정
- ✅ `applySecurityMiddleware()`: 미들웨어 함수

**보안 헤더**:
```typescript
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), microphone=(self)
Content-Security-Policy: default-src 'self'; ...
```

### 3. Firestore/Storage 보안 규칙

**파일**: `firestore.rules`, `storage.rules`

**구현된 기능**:
- ✅ Firestore 보안 규칙 (Step 43 Role System 연동)
- ✅ Storage 보안 규칙 (공개 아티팩트, 사용자 파일, 팀 파일, 관리자 파일)

## ⚡ 성능 최적화

### 1. 성능 예산 검증

**파일**: `functions/src/step69.performance.ts`

**구현된 기능**:
- ✅ `GET /performanceCheck`: 성능 예산 검증
- ✅ API 성능 검사 (p95 < 900ms, 오류율 < 1%)
- ✅ KG 질의 성능 검사 (평균 < 600ms, 캐시 적중률 > 60%)

**성능 예산**:
- 웹: TTI < 3.5s, LCP < 2.5s (모바일 4G), JS 번들 < 300KB (gzip)
- API: p95 < 900ms, 오류율 < 1%
- KG 질의: 평균 < 600ms, 캐시 적중률 > 60%

### 2. 번들 최적화

**권장 사항**:
- 코드 스플리팅 (React.lazy)
- Dynamic import
- 이미지 AVIF/WebP
- 폰트 서브셋
- Tree shaking

## 🔍 관찰성

### 1. Sentry 통합

**클라이언트**: `src/lib/sentry.ts`
- ✅ `initSentry()`: Sentry 초기화
- ✅ `captureException()`: 에러 캡처
- ✅ `captureMessage()`: 메시지 캡처
- ✅ PII 자동 제거

**서버**: `functions/src/step69.sentry.ts`
- ✅ `initSentryServer()`: 서버 Sentry 초기화
- ✅ `captureExceptionServer()`: 서버 에러 캡처

**초기화**:
- 클라이언트: `src/main.tsx`에서 자동 초기화
- 서버: `functions/src/index.ts`에서 자동 초기화

### 2. OpenTelemetry

- ⚠️ OpenTelemetry 통합 (Step 66에서 문서화, 실제 구현 TODO)

## 🚀 배포 전략

### 1. 헬스체크 엔드포인트

**파일**: `functions/src/step69.health.ts`

**구현된 기능**:
- ✅ `GET /health`: 헬스체크 (Firestore, Storage, Neo4j 연결 확인)
- ✅ `GET /ready`: 준비 상태 확인 (필수 종속성만)

**응답 예시**:
```json
{
  "ok": true,
  "version": "0.0.0",
  "timestamp": "2025-01-15T10:00:00Z",
  "responseTime": "50ms",
  "services": {
    "firestore": "ok",
    "storage": "ok",
    "neo4j": "ok"
  }
}
```

### 2. 카나리아 배포

- Step 64 `rolloutAdvance` 활용
- 10% → 50% → 100% 점진 배포

### 3. 블루/그린 배포

- Firebase Hosting 채널/버전 스위치로 즉시 롤백

### 4. 런타임 플래그

- `featureOverrides/{orgId}`로 안전 토글

## 🚨 인시던트 대응

**파일**: `functions/src/step69.incidentResponse.ts`

**구현된 기능**:
- ✅ `createIncident()`: 인시던트 생성
- ✅ `resolveIncident()`: 인시던트 해결
- ✅ `createPostmortem()`: Postmortem 생성
- ✅ `POST /createIncident`: 인시던트 생성 API
- ✅ `GET /listIncidents`: 인시던트 목록 조회 API

**SEV 분류**:
- **SEV1**: 대규모 장애/치명 데이터 유출 — 즉시 온콜, 외부 공지
- **SEV2**: 주요 기능 장애 — 1시간 내 복구 목표
- **SEV3**: 경미/우회 가능 — 다음 배포에 포함

**인시던트 스키마**:
```typescript
{
  sev: 'SEV1' | 'SEV2' | 'SEV3';
  title: string;
  description: string;
  affectedServices: string[];
  status: 'open' | 'resolved';
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolution?: string;
}
```

## 📋 런북 템플릿

**파일**: `functions/src/step69.runbook.ts`

**구현된 기능**:
- ✅ `POST /createRunbookTemplate`: 런북 템플릿 생성
- ✅ `GET /getRunbookTemplate`: 런북 템플릿 조회
- ✅ `POST /generateRunbookFromIncident`: 인시던트에서 런북 자동 생성

**런북 템플릿 구조**:
```typescript
{
  service: string; // 서비스명 (예: "GraphAsk", "InsightCopilot")
  symptom: string; // 증상 (예: "High latency", "Error rate spike")
  detection: {
    alerts?: string[]; // 경보 ID 목록
    dashboard?: string; // 대시보드 URL
    screenshots?: string[]; // 스크린샷 URL
  };
  impact: {
    users?: string; // 사용자 영향 추정
    orgs?: string; // 조직 영향 추정
    revenue?: string; // 매출 영향 추정
  };
  timeline: {
    occurred?: string; // 발생 시점
    detected?: string; // 탐지 시점
    action?: string; // 조치 시점
    recovered?: string; // 복구 시점
  };
  rootCause: {
    technical?: string; // 기술적 원인
    process?: string; // 프로세스 원인
  };
  mitigation: {
    hotfix?: string; // 핫픽스
    rollback?: string; // 롤백 절차
    workaround?: string; // 우회 방법
  };
  followUp: {
    tasks?: Array<{
      description: string;
      dueDate?: string;
      assignee?: string;
    }>;
  };
}
```

**런북 템플릿 예시**:
```
제목: [GraphAsk] [High latency]

탐지: 경보/대시보드 스크린샷
- Alert ID: alert-123
- Dashboard: /app/admin/pilot-console
- Screenshot: https://storage.googleapis.com/...

영향: 사용자/조직/매출 추정
- 사용자: 약 100명 (파일럿 팀)
- 조직: 3개 팀
- 매출: 직접 영향 없음

타임라인: 발생→탐지→조치→복구
- 발생: 2025-01-15 10:00
- 탐지: 2025-01-15 10:05
- 조치: 2025-01-15 10:30
- 복구: 2025-01-15 11:00

근본원인: 기술/프로세스
- 기술: Neo4j 쿼리 최적화 부족
- 프로세스: 성능 모니터링 알림 임계값 조정 필요

완화/복구: 핫픽스/롤백/우회
- 핫픽스: Neo4j 인덱스 추가
- 롤백: Step 64 rolloutAdvance로 이전 버전으로 롤백
- 우회: 캐시 TTL 증가

후속/재발방지: 태스크, 마감일, 담당
- Neo4j 쿼리 최적화 (2025-01-20, 백엔드팀)
- 성능 모니터링 임계값 조정 (2025-01-18, SRE팀)
```

## 🚀 론치 플랜

**파일**: `functions/src/step69.launchPlan.ts`

**구현된 기능**:
- ✅ `POST /createLaunchPlan`: 론치 플랜 생성
- ✅ `GET /getLaunchPlan`: 론치 플랜 조회
- ✅ `GET /listLaunchPlans`: 론치 플랜 목록 조회
- ✅ `POST /generateDefaultLaunchPlan`: 기본 2주 론치 플랜 자동 생성

**론치 플랜 구조**:
```typescript
{
  name: string; // 론치 플랜 이름
  targetDate: string; // 목표 날짜 (YYYY-MM-DD)
  stages: Array<{
    day: number; // D-Day 기준 일수 (예: -7, -3, -1, 0, 1)
    date: string; // 실제 날짜 (YYYY-MM-DD)
    tasks: Array<{
      title: string;
      description?: string;
      status: "todo" | "in_progress" | "done";
      assignee?: string;
      dueDate?: string;
    }>;
    milestones: string[]; // 마일스톤 목록
  }>;
  status: "draft" | "active" | "completed" | "cancelled";
}
```

**2주 론치 플랜 예시**:

**D-7 (7일 전)**:
- 성능 튜닝/인덱스/이미지/번들 최적화
- 침투테스트 리포트 수령
- 마일스톤: 준비 완료

**D-3 (3일 전)**:
- 카나리아 10% 시작
- 파일럿 팀 통지
- 마일스톤: 카나리아 10% 시작

**D-1 (1일 전)**:
- 50% 확대
- KPI 모니터링 (오후 피크 2시간)
- 마일스톤: 50% 확대, KPI 모니터링

**D-Day (당일)**:
- 100% 전환
- 온콜 24h 강화
- Go/No-Go 회의 2회 (오전 9시, 오후 3시)
- 마일스톤: 100% 전환, Go/No-Go 회의

**D+1 (다음날)**:
- 초기 안정화 배치
- 사소 오류 핫픽스
- 마일스톤: 초기 안정화

## 🖥️ Launch Readiness 대시보드

**파일**: `src/pages/admin/LaunchReadiness.tsx`

**구현된 기능**:
- ✅ 헬스체크 상태 표시
- ✅ 성능 예산 검증 결과 표시
- ✅ Launch Gates 체크리스트
- ✅ 성능 예산 상세 정보
- ✅ Step 43 Role System 연동 (Owner/SecOps만 접근)

**접근 경로**: `/app/admin/launch-readiness` (Owner/SecOps 권한 필요)

## 🔧 비밀/환경 보호

### 권장 설정

**Functions 설정**:
- Node 20 LTS
- 메모리: 512~1024MB
- 타임아웃: 30~60s
- minInstances: 1~2 (콜드스타트 방지)
- maxInstances: 상한 설정
- 리전: asia-northeast3 + us-central1 이중화

**비밀키 관리**:
- `.env` → CI Secrets/Functions Config로만 주입
- 분기별 키 로테이션
- 사고 시 즉시 로테이션

## 📊 DB/인덱스/캐시 튜닝

### Firestore
- 복합 인덱스 정의 (쿼리 오류 로그에서 자동 제안)
- TTL (만료 필드 기반 삭제 배치)

### Neo4j
- `CREATE INDEX FOR (e:Event) ON (e.ts)`
- 고빈도 관계에 BTREE 인덱스

### API 캐시
- GraphAsk/리포트 Top-N에 30~120s SWR 적용
- Step 67 SW/Edge 캐시와 통합

## 📋 실행 체크리스트

### 보안
- [x] SAST (ESLint, TypeScript, Dependency Audit)
- [x] SBOM 생성
- [x] DAST (OWASP ZAP)
- [x] 보안 헤더 설정
- [x] CORS 설정
- [x] Firestore/Storage 보안 규칙

### 성능
- [x] k6 성능 테스트
- [x] 성능 예산 검증
- [x] 헬스체크 엔드포인트
- [ ] 번들 최적화 (코드 스플리팅, 이미지 최적화)

### 관찰성
- [x] Sentry 통합 (클라이언트/서버)
- [ ] OpenTelemetry 통합 (TODO)

### 운영
- [x] 인시던트 대응 (SEV 분류, 알림)
- [x] Postmortem 생성
- [x] 런북 템플릿 관리
- [x] 론치 플랜 관리

### 배포
- [x] 카나리아 배포 (Step 64)
- [x] 헬스체크
- [ ] 블루/그린 배포 설정 (TODO)

## 🚀 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:health,functions:ready,functions:performanceCheck,functions:createIncidentAPI,functions:listIncidents,functions:createRunbookTemplate,functions:getRunbookTemplate,functions:generateRunbookFromIncident,functions:createLaunchPlan,functions:getLaunchPlan,functions:listLaunchPlans,functions:generateDefaultLaunchPlan
```

### 2. 프론트엔드 접근

```
/app/admin/launch-readiness
(Owner/SecOps 권한 필요)
```

### 3. 환경 변수 설정

```bash
# Functions
SENTRY_DSN=...
SLACK_WEBHOOK_URL=...
ALERT_EMAIL_TO=...

# 클라이언트
VITE_SENTRY_DSN=...
```

## 📚 다음 단계

- Step 70: Post-Launch SRE & Growth Experiments
  - 실사용 텔레메트리 기반 SRE 목표 상향 (SLO 재설정)
  - 그로스 실험 파이프라인 (A/B 테스트, 온보딩, 리텐션)
- Step 71: 자동화된 성능 개선 루프
- Step 72: 글로벌 확장 전략

## 🎯 Go/No-Go 체크리스트

### 보안
- [ ] SAST/DAST 통과
- [ ] SBOM 생성 완료
- [ ] 침투테스트 리포트 승인
- [ ] 보안 헤더 설정 확인
- [ ] Firestore/Storage 보안 규칙 검증

### 성능
- [ ] k6 성능 테스트 통과 (p95 < 900ms)
- [ ] 성능 예산 검증 통과
- [ ] 번들 크기 검증 (< 300KB gzip)
- [ ] 인덱스 최적화 완료

### 운영
- [ ] 헬스체크 엔드포인트 정상 작동
- [ ] Sentry 통합 완료
- [ ] 인시던트 대응 프로세스 확인
- [ ] 런북 템플릿 준비 완료
- [ ] 론치 플랜 승인

### 배포
- [ ] 카나리아 배포 절차 확인
- [ ] 롤백 플랜 수립
- [ ] 온콜 24h 대기 상태

## ✅ 완료! 🏁🔐⚡

Step 69 — Production Hardening & Launch Readiness 완료!

