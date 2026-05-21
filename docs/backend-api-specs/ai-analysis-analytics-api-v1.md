# 🔥 AI 분석 로깅 API 스펙 v1 (운영용)

**작성일**: 2024
**상태**: 확정 (Lock)
**버전**: v1.0

## 📌 원칙

1. **로그는 계약(contract)** - 스키마 변경은 데이터 손실 위험
2. **하위 호환성 필수** - 기존 필드 삭제/변경 불가, 추가만 가능
3. **집계 최적화** - 인덱싱 전략이 API 설계에 반영
4. **운영 안정성 우선** - 실패해도 클라이언트 영향 최소화

---

## 📊 데이터 스키마

### AIAnalysisLog (서버 DB 저장 형식)

```typescript
interface AIAnalysisLog {
  // 🔥 메타 정보 (인덱싱 필수)
  id: string;                    // 서버 생성 UUID (PK)
  sessionId: string;             // 세션 식별자 (인덱스)
  userId?: string;               // 사용자 ID (인덱스, 옵션)
  timestamp: number;             // ISO 8601 timestamp (인덱스)
  
  // 🔥 환경 정보 (집계용)
  env: {
    isKakaoInApp: boolean;       // 카카오 인앱 여부
    isMobile: boolean;            // 모바일 여부
    platform: string;             // 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'unknown'
    userAgent: string;            // 전체 User Agent (디버깅용)
  };
  
  // 🔥 요청 정보
  request: {
    endpoint: string;             // API 엔드포인트 URL
    fileSize: number;             // 파일 크기 (bytes)
    fileType: string;             // MIME type (예: 'image/jpeg')
    hasAuth: boolean;             // 인증 토큰 포함 여부
  };
  
  // 🔥 결과 정보 (집계용)
  result: {
    success: boolean;             // 성공 여부 (인덱스)
    errorCode?: string;           // 에러 코드 (AppErrorCode)
    latency: number;              // 응답 시간 (ms, 인덱스)
    retryCount: number;           // 재시도 횟수
    httpStatus?: number;          // HTTP 상태 코드
    isSlow?: boolean;             // 4초 이상 요청 플래그
  };
  
  // 🔥 서버 메타 (자동 생성)
  createdAt: string;             // 서버 저장 시각 (ISO 8601)
  version: string;               // 스키마 버전 ('v1')
}
```

### DB 인덱싱 전략

```sql
-- PostgreSQL 예시 (MongoDB는 동일한 필드에 인덱스 생성)

-- 기본 인덱스
CREATE INDEX idx_timestamp ON ai_analysis_logs(timestamp DESC);
CREATE INDEX idx_user_id ON ai_analysis_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_session_id ON ai_analysis_logs(session_id);

-- 집계 최적화 인덱스
CREATE INDEX idx_success_env ON ai_analysis_logs(result_success, env_is_kakao_in_app, env_is_mobile);
CREATE INDEX idx_latency ON ai_analysis_logs(result_latency) WHERE result_success = true;
CREATE INDEX idx_slow_requests ON ai_analysis_logs(result_is_slow) WHERE result_is_slow = true;
CREATE INDEX idx_error_code ON ai_analysis_logs(result_error_code) WHERE result_error_code IS NOT NULL;

-- 주간 리포트용 복합 인덱스
CREATE INDEX idx_weekly_stats ON ai_analysis_logs(
  timestamp DESC,
  result_success,
  env_is_kakao_in_app,
  env_is_mobile
);
```

---

## 🔌 API 엔드포인트

### 1. POST /api/analytics/ai-analysis

**용도**: 단일 로그 즉시 전송 (성공 케이스 우선)

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <token> (옵션, 클라이언트 인증용)
```

**Request Body**:
```json
{
  "sessionId": "session_1234567890_abc123",
  "userId": "user_uid_123", // 옵션
  "timestamp": 1234567890000, // 클라이언트 타임스탬프 (ms)
  "env": {
    "isKakaoInApp": true,
    "isMobile": true,
    "platform": "android",
    "userAgent": "Mozilla/5.0..."
  },
  "request": {
    "endpoint": "https://api.example.com/analyze",
    "fileSize": 245678,
    "fileType": "image/jpeg",
    "hasAuth": true
  },
  "result": {
    "success": true,
    "latency": 2345,
    "retryCount": 0,
    "httpStatus": 200,
    "isSlow": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "logId": "server_generated_uuid",
  "receivedAt": "2024-01-01T12:00:00Z"
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR" | "SERVER_ERROR",
  "message": "상세 에러 메시지"
}
```

**HTTP 상태 코드**:
- `200 OK`: 성공
- `400 Bad Request`: 스키마 검증 실패
- `500 Internal Server Error`: 서버 오류

---

### 2. POST /api/analytics/ai-analysis/batch

**용도**: 배치 로그 전송 (실패 케이스 또는 주기적 전송)

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <token> (옵션)
```

**Request Body**:
```json
{
  "logs": [
    {
      "sessionId": "session_1234567890_abc123",
      "userId": "user_uid_123",
      "timestamp": 1234567890000,
      "env": { ... },
      "request": { ... },
      "result": { ... }
    },
    // ... 최대 100개까지
  ]
}
```

**Response**:
```json
{
  "success": true,
  "receivedCount": 10,
  "processedCount": 10,
  "failedCount": 0,
  "accepted": 10,
  "rejected": 0,
  "logIds": ["uuid1", "uuid2", ...]
}
```

**필드 설명**:
- `accepted`: 검증 통과 후 저장된 로그 수
- `rejected`: 검증 실패 또는 저장 실패한 로그 수
- `processedCount` = `accepted` + `rejected`

**부분 실패 시**:
```json
{
  "success": true,
  "receivedCount": 10,
  "processedCount": 8,
  "failedCount": 2,
  "logIds": ["uuid1", "uuid2", ...],
  "errors": [
    {
      "index": 3,
      "error": "VALIDATION_ERROR",
      "message": "필수 필드 누락"
    },
    {
      "index": 7,
      "error": "SERVER_ERROR",
      "message": "DB 저장 실패"
    }
  ]
}
```

**제한사항**:
- `logs` 배열 최대 100개
- 요청 크기 최대 5MB
- 초당 10회 제한 (rate limiting)

---

### 3. GET /api/analytics/ai-analysis/stats

**용도**: 주간 통계 조회 (수동 확인 또는 리포트 생성용)

**Query Parameters**:
```
startDate: string (ISO 8601, 예: 2024-01-01T00:00:00Z)
endDate: string (ISO 8601, 예: 2024-01-08T00:00:00Z)
groupBy?: 'day' | 'hour' | 'none' (기본값: 'none')
```

**Response**:
```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-08T00:00:00Z"
  },
  "summary": {
    "total": 1250,
    "success": 1150,
    "failed": 100,
    "successRate": 92.0,
    "sampleSize": 1250,
    "avgLatency": 2456,
    "p95Latency": 4123,
    "p99Latency": 5234,
    "slowRequests": 125,
    "slowRate": 10.0
  },
  "byEnvironment": {
    "kakaoInApp": {
      "total": 450,
      "success": 380,
      "failed": 70,
      "successRate": 84.4,
      "avgLatency": 3123,
      "slowRequests": 68,
      "slowRate": 15.1
    },
    "mobile": {
      "total": 800,
      "success": 730,
      "failed": 70,
      "successRate": 91.3,
      "avgLatency": 2789,
      "slowRequests": 95,
      "slowRate": 11.9
    },
    "desktop": {
      "total": 450,
      "success": 420,
      "failed": 30,
      "successRate": 93.3,
      "avgLatency": 1890,
      "slowRequests": 12,
      "slowRate": 2.7
    }
  },
  "byErrorCode": {
    "NETWORK_FAILED": 45,
    "AUTH_REQUIRED": 20,
    "FILE_TOO_LARGE": 15,
    "SERVER_ERROR": 10,
    "UNKNOWN": 10
  },
  "byDay": [
    // groupBy='day'일 때만 포함
    {
      "date": "2024-01-01",
      "total": 180,
      "success": 165,
      "successRate": 91.7
    },
    // ...
  ]
}
```

**제한사항**:
- `startDate`와 `endDate` 간격 최대 90일
- 인증 필요 (관리자 권한 권장)

---

## 📈 주간 리포트 집계 기준

### 집계 기간
- **기본**: 지난 주 월요일 00:00 ~ 일요일 23:59:59 (UTC)
- **크론 실행**: 매주 월요일 오전 9시 (KST)

### 집계 항목

1. **전체 요약**
   - 총 요청 수
   - 성공/실패 수 및 성공률
   - 평균/P95/P99 latency
   - 느린 요청(4초 이상) 수 및 비율

2. **환경별 비교**
   - 카카오 인앱 vs 외부 브라우저
   - 모바일 vs 데스크탑
   - 성공률, 평균 latency, 느린 요청 비율

3. **에러 코드별 분포**
   - 상위 5개 에러 코드
   - 각 에러의 발생 횟수 및 비율

4. **트렌드 (주간 리포트 v2 확장 가능)**
   - 전주 대비 성공률 변화
   - 전주 대비 평균 latency 변화
   - 환경별 성공률 추이

### 리포트 형식

**Slack 메시지 예시**:
```
📊 AI 분석 성공률 주간 리포트 (2024-01-01 ~ 2024-01-07)

📈 전체 요약
• 총 요청: 1,250건
• 성공률: 92.0% (1,150/1,250)
• 평균 응답 시간: 2.5초
• 느린 요청: 125건 (10.0%)

🌐 환경별 비교
• 카카오 인앱: 84.4% 성공률 (380/450)
• 모바일 전체: 91.3% 성공률 (730/800)
• 데스크탑: 93.3% 성공률 (420/450)

⚠️ 주요 에러
• NETWORK_FAILED: 45건 (3.6%)
• AUTH_REQUIRED: 20건 (1.6%)
• FILE_TOO_LARGE: 15건 (1.2%)

💡 인사이트
• 카카오 인앱 성공률이 외부 브라우저 대비 8.9%p 낮음
• 외부 브라우저 유도 UX 유지 권장
```

**이메일 HTML 형식**: 동일한 내용을 HTML로 포맷팅

---

## 🔒 스키마 버전 관리

### 버전 필드 사용

모든 로그에 `version: 'v1'` 필드 포함

**향후 스키마 변경 시**:
1. 새로운 필드는 **옵션**으로 추가 (하위 호환)
2. 기존 필드는 **절대 삭제 불가**
3. 새 버전(v2) 로그는 `version: 'v2'`로 구분
4. 집계 시 버전별로 분리 처리

---

## ⚠️ 운영 고려사항

### 1. Rate Limiting
- 단일 로그: 초당 100회
- 배치 로그: 초당 10회
- 통계 조회: 초당 5회

### 2. 데이터 보관
- **활성 데이터**: 최근 90일 (빠른 조회용)
- **아카이브**: 90일 이상 (저용량 저장, 느린 조회)

### 3. 실패 처리
- 클라이언트 전송 실패 → 로컬 큐에 보관, 재시도
- 서버 저장 실패 → 에러 로그 기록, 클라이언트에는 200 반환 (중복 허용)

### 4. 개인정보 보호
- `userAgent`는 디버깅용이므로 필요시 마스킹
- `userId`는 옵션이므로 익명화 가능

---

## ✅ 검증 체크리스트

스펙 확정 전 확인:

- [x] 클라이언트 스키마와 100% 호환
- [x] 집계에 필요한 필드 모두 포함
- [x] 인덱싱 전략 명확
- [x] 버전 관리 계획 수립
- [x] 하위 호환성 보장
- [x] 에러 처리 방안 포함
- [x] 운영 제한사항 정의

---

## 📝 다음 단계

1. **서버 구현**: DB 테이블 생성, API 엔드포인트 구현
2. **클라이언트 통합**: `aiAnalysisLogger.ts` 서버 전송 활성화
3. **크론잡 설정**: 주간 리포트 자동 집계 및 전송
4. **모니터링**: API 성능, 에러율, 데이터 품질 추적

---

**스펙 잠금일**: 2024년
**다음 리뷰**: v2 필요 시 (최소 3개월 후)

