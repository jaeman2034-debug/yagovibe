# 🔔 Outbox Claim 패턴 + 워커 루프 가이드

## 🎯 핵심 원칙

1. **DB Claim 패턴**: 원자적 선점으로 동시성 제어
2. **Lease/Timeout**: 워커 죽음 대비 안전장치
3. **멱등성 보장**: dedupeKey로 중복 방지

---

## 📦 구조

```
src/
├── domain/
│   └── notification/
│       └── outbox.ts              # Outbox 모델 (Claim 필드 포함)
├── workers/
│   ├── notificationWorker.ts      # 기본 워커
│   └── notificationWorkerClaim.ts # Claim 패턴 워커
└── utils/
    ├── reportTemplates/           # HTML 템플릿
    ├── reportRenderer.ts          # 템플릿 렌더러
    ├── chartGenerator.ts          # SVG 차트 생성
    └── storageService.ts          # 스토리지 서비스
```

---

## 🔄 Outbox 상태 전이

```
PENDING → PROCESSING → SENT (성공)
PENDING → PROCESSING → FAILED → PROCESSING → SENT (재시도 성공)
PENDING → PROCESSING → FAILED → PROCESSING → DEAD (최대 시도 초과)
PROCESSING → FAILED (워커 타임아웃 복구)
```

---

## 🔒 Claim 패턴

### 1. Claim (원자적 선점)

```typescript
// 1. PENDING/FAILED 레코드 조회
// 2. nextAttemptAt <= now 조건
// 3. PROCESSING 상태로 변경 (원자적)
// 4. workerId 및 leaseExpiresAt 기록
```

### 2. Lease/Timeout 안전장치

```typescript
// PROCESSING 상태인데 leaseExpiresAt이 지난 레코드
// → 다시 FAILED로 변경하여 재시도 가능하게 함
```

### 3. 완료 처리

```typescript
// 성공: SENT
// 실패: FAILED (재시도) 또는 DEAD (영구 실패)
// workerId, claimedAt, leaseExpiresAt 제거
```

---

## 📋 사용법

### 1. Claim 패턴 워커 실행

```typescript
import { startNotificationWorkerWithClaim } from '@/workers/notificationWorkerClaim';

const stop = startNotificationWorkerWithClaim(
  {
    batchSize: 50,        // 한 번에 claim할 최대 레코드 수
    leaseTimeout: 600000,  // 10분
    workerId: 'worker-1',
  },
  60000  // 1분마다 실행
);

// 중지: stop();
```

### 2. 수동 Claim 및 처리

```typescript
import { claimOutboxRecords, runNotificationWorkerWithClaim } from '@/workers/notificationWorkerClaim';

// Claim
const claimResult = await claimOutboxRecords({
  batchSize: 50,
  leaseTimeout: 600000,
  workerId: 'worker-1',
});

// 처리
const stats = await runNotificationWorkerWithClaim({
  batchSize: 50,
  leaseTimeout: 600000,
  workerId: 'worker-1',
});
```

### 3. 오래된 PROCESSING 레코드 복구

```typescript
import { recoverStaleProcessingRecords } from '@/workers/notificationWorkerClaim';

const recovered = await recoverStaleProcessingRecords(600000); // 10분
console.log(`${recovered}개의 레코드 복구 완료`);
```

---

## 🔄 재시도 전략

### 백오프 간격

- 1회: 1분 후
- 2회: 5분 후
- 3회: 30분 후
- 4회: 2시간 후
- 5회: 12시간 후
- 최대 시도: 5회

### 실패 원인 분류

- **즉시 DEAD**: 수신자 데이터 부족, 템플릿 오류
- **재시도 가능**: 외부 API 일시 장애, 타임아웃

---

## 🔄 채널 폴백 전략

### 우선순위

1. **카카오** (우선)
2. **SMS** (폴백)
3. **Push** (최종 폴백)

### 동작

- 카카오 실패 → payload.channel을 'sms'로 변경하여 재시도
- SMS 실패 → payload.channel을 'push'로 변경하여 재시도
- Push 실패 → DEAD (더 이상 폴백 없음)

---

## 📊 리포트 생성

### HTML→PDF 템플릿

- 템플릿 위치: `src/utils/reportTemplates/monthly/v1/`
- 렌더러: `src/utils/reportRenderer.ts`
- 차트: `src/utils/chartGenerator.ts` (SVG 기반)

### 스토리지 키 규칙

```
reports/team_{teamId}/monthly/{yyyyMM}/monthly_report_v{version}.{format}
```

예시:
- `reports/team_abc123/monthly/2025-01/monthly_report_v1.pdf`
- `reports/team_abc123/monthly/2025-01/monthly_report_v1.csv`

### Presigned URL 정책

- 만료: 기본 1시간 (대량 발송이면 15~30분도 가능)
- 재시도/재발송: URL은 매번 재발급, 파일은 재생성하지 않음

### 프록시 다운로드 엔드포인트

- 경로: `/api/reports/[artifactId]/download`
- 동작: 권한 체크 → Presigned URL 생성 → 다운로드 시작

---

## ✅ 체크리스트

- [x] Outbox 모델 (Claim 필드 포함)
- [x] Claim 패턴 구현
- [x] Lease/Timeout 안전장치
- [x] 워커 루프 구현
- [x] HTML→PDF 템플릿 구조
- [x] 차트 생성 (SVG)
- [x] 스토리지 키 규칙
- [x] 프록시 다운로드 엔드포인트
- [ ] 실제 PDF 생성 라이브러리 연동 (Puppeteer/Playwright)
- [ ] 한글 폰트 파일 배포
- [ ] Cloud Functions 스케줄러 연결

---

## 🚀 다음 단계

1. **실제 PDF 생성**
   - 서버 사이드: Puppeteer 또는 Playwright 사용
   - 템플릿 파일 시스템에서 로드

2. **한글 폰트 처리**
   - 폰트 파일을 템플릿과 함께 배포
   - 또는 렌더러 컨테이너에 설치

3. **Cloud Functions 스케줄러**
   - 매월 1일 00:05 KST 실행
   - 리포트 생성 + Outbox 등록

