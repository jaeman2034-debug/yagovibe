# 🔔 알림 Outbox 패턴 + PDF/CSV 자동 생성 가이드

## 🎯 핵심 원칙

1. **리포트 생성(도메인)과 발송(알림) 완전 분리**
2. **리포트 생성은 멱등(idempotent), 발송은 fail-safe + 재시도**
3. **채널 확장(SMS/카카오/푸시/이메일) 비용을 0으로 유지**

---

## 📦 구조

```
src/
├── domain/
│   ├── notification/
│   │   ├── types.ts          # 공통 타입
│   │   └── outbox.ts         # Outbox 모델
│   └── report/
│       └── types.ts          # 리포트 타입
├── services/
│   ├── notificationOutboxService.ts  # Outbox 등록
│   ├── reportService.ts             # 리포트 생성
│   └── monthlyReportScheduler.ts    # 스케줄러
├── workers/
│   └── notificationWorker.ts        # 발송 워커
└── utils/
    └── reportGenerator.ts           # PDF/CSV 생성
```

---

## 🔄 전체 흐름

```
1. 스케줄러 실행 (매월 1일)
   ↓
2. 리포트 생성 (PDF/CSV, 멱등성 보장)
   ↓
3. Outbox 등록 (발송 대기)
   ↓
4. 워커 실행 (주기적)
   ↓
5. 실제 발송 (카카오 → SMS → Push 폴백)
   ↓
6. 재시도 (실패 시 백오프 전략)
```

---

## 📋 사용법

### 1. 리포트 생성 및 발송 등록

```typescript
import { generateAndEnqueueMonthlyReports } from '@/services/monthlyReportScheduler';

// 매월 1일 자동 실행 (Cloud Functions)
await generateAndEnqueueMonthlyReports('2025-01');

// 특정 팀만 처리
await generateAndEnqueueMonthlyReports('2025-01', ['team1', 'team2']);
```

### 2. 수동 리포트 생성

```typescript
import { generateMonthlyReport } from '@/services/reportService';

// PDF 생성
const pdfResult = await generateMonthlyReport({
  teamId: 'team1',
  yyyyMM: '2025-01',
  format: 'PDF',
});

// CSV 생성
const csvResult = await generateMonthlyReport({
  teamId: 'team1',
  yyyyMM: '2025-01',
  format: 'CSV',
});
```

### 3. 알림 Outbox 등록

```typescript
import { enqueueNotification } from '@/services/notificationOutboxService';

await enqueueNotification({
  event: 'MONTHLY_REPORT',
  channel: 'kakao',
  target: {
    userId: 'user123',
    phoneE164: '+821012345678',
    name: '홍길동'
  },
  message: '월간 리포트가 준비되었습니다.',
  templateId: 'monthly_report_v1',
  data: {
    yyyyMM: '2025-01',
    reportUrl: 'https://...'
  }
}, 'MONTHLY_REPORT:kakao:team1:user123:2025-01');
```

### 4. 워커 실행

```typescript
import { runNotificationWorker, startNotificationWorker } from '@/workers/notificationWorker';

// 한 번 실행
const stats = await runNotificationWorker(50);
console.log('처리 완료:', stats);

// 주기적 실행 (1분마다)
const stop = startNotificationWorker(60000);
// 중지: stop();
```

---

## 🔄 Outbox 패턴

### Outbox 레코드 구조

```typescript
interface NotificationOutbox {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  payload: NotificationPayload;  // 표준 페이로드
  
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD';
  attempt: number;
  nextAttemptAt?: Date;
  lastError?: string;
  
  dedupeKey: string;  // 중복 방지 키
}
```

### 상태 전이

```
PENDING → SENT (성공)
PENDING → FAILED (재시도 가능)
FAILED → SENT (재시도 성공)
FAILED → DEAD (최대 시도 초과)
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

### 멱등성 보장

- 키: `teamId:yyyyMM:format`
- 같은 키로 두 번 요청되면 이미 존재하면 그대로 반환
- `forceRegenerate: true`로 강제 재생성 가능

### 생성 흐름

1. 데이터 조회 (회비/멤버 현황)
2. CSV/PDF 생성
3. Cloud Storage 업로드
4. Presigned URL 생성 (7일 유효)
5. Artifact 레코드 저장

---

## ✅ 체크리스트

- [x] Outbox 모델 정의
- [x] NotificationOutboxService 구현
- [x] NotificationWorker 구현
- [x] 리포트 생성 서비스 구현
- [x] PDF/CSV 생성 함수
- [x] 스케줄러 연결
- [x] 채널 폴백 전략
- [x] 재시도 백오프 전략
- [ ] Cloud Functions 스케줄러 연결
- [ ] 실제 PDF 생성 라이브러리 연동
- [ ] 실제 데이터 조회 로직 구현

---

## 🚀 다음 단계

1. **Cloud Functions 스케줄러 연결**
   - `generateAndEnqueueMonthlyReports`를 Cloud Functions로 이동
   - 매월 1일 00:05 KST 실행

2. **실제 PDF 생성**
   - 서버 사이드: Puppeteer 사용
   - 클라이언트 사이드: jsPDF 또는 html2pdf.js

3. **실제 데이터 조회**
   - 회비 납부/미납 현황
   - 멤버 현황
   - 알림 통계

4. **모니터링 대시보드**
   - Outbox 상태 통계
   - 발송 성공률
   - 재시도 통계

