# Step 59: Proactive Insights (그래프 기반 자동 주간 리포트/경보)

Step 57~58의 지식그래프/그래프 코파일럿을 활용해 예약된 그래프 질의를 자동 실행하고, 스토리형 인사이트(요약·하이라이트·경보)를 Slack/Email/TTS로 발행합니다.

## 📋 목표

1. 예약된 그래프 질의 자동 실행
2. 스토리형 인사이트 생성 (요약, 하이라이트, 경보)
3. Slack/Email/TTS 배포
4. 구독 관리 UI 제공

## 🧩 아키텍처 개요

```
[Subscriptions: insightSubs/{subId}]
     ├─ 주기(RRULE) + 팀/필터 + 채널(Slack/Email/TTS)
     └─ 활성/비활성
        ↓ (Scheduler)
[Functions: runProactiveInsights]
     ├─ 그래프 질의 실행 (Neo4j via graphCopilot/직접 Cypher)
     ├─ 스토리 생성 (키 포인트, 변화량, 경보요약)
     ├─ 아티팩트 생성 (Markdown → HTML → PDF, 음성 TTS)
     └─ 배포 (Slack Webhook, Email, Firestore 저장)
```

## 🗄️ 데이터 모델

### insightSubs/{subId}

```typescript
{
  teamId: string;              // 'SOHEUL_FC'
  title: string;               // '주간 품질/경보 인사이트'
  cadence: string;             // 'weekly' | 'daily' | 'custom-RRULE'
  windowDays: number;          // 7
  channels: {
    slack?: boolean;           // Slack 발송 여부
    email?: boolean;           // Email 발송 여부
    tts?: boolean;            // TTS 생성 여부
  };
  isEnabled: boolean;          // 활성/비활성
  createdBy: string;          // uid
  lastRunAt: Timestamp;       // 마지막 실행 시간
  emailTo?: string;           // Email 수신자 (선택)
}
```

### insightReports/{reportId}

```typescript
{
  teamId: string;
  subscriptionId: string;      // 구독 ID
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  summary: string;            // 스토리 요약
  highlights: Array<{         // 하이라이트
    label: string;
    value: string;
    trend: "up" | "down" | "stable";
    severity: "high" | "medium" | "low";
  }>;
  alerts: Array<{              // 경보
    rule: string;
    hits: number;
  }>;
  actions: Array<{             // 제안 조치
    label: string;
    status: string;
  }>;
  metrics: {
    actionRate: number;
    totalEvents: number;
    actedEvents: number;
    qualityScore: number;
  };
  pdfUrl?: string;            // PDF URL (옵션)
  audioUrl?: string;          // TTS URL (옵션)
  createdAt: Timestamp;
}
```

## 📊 Graph 질의 템플릿

### 1. 상위 원인 규칙 Top-N

```cypher
MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)-[:AFFECTS]->(t:Team {id:$teamId})
WHERE datetime(e.ts) > datetime() - duration('P7D')
RETURN p.id AS rule, count(*) AS hits
ORDER BY hits DESC LIMIT 5;
```

### 2. 경보→조치 연결률

```cypher
MATCH (t:Team {id:$teamId})
OPTIONAL MATCH (e:Event)-[:AFFECTS]->(t)
WHERE datetime(e.ts) > datetime() - duration({days: $days})
OPTIONAL MATCH (e)-[:TRIGGERED]->(a:Action)
WITH count(DISTINCT e) AS total, count(DISTINCT a) AS acted
RETURN total, acted, 
       (CASE WHEN total=0 THEN 0.0 ELSE 1.0*acted/total END) AS actionRate
```

### 3. 품질 추세 (Score 평균)

Firestore에서 품질 점수 집계 후 반환

## ⚙️ Functions 구현

### 1. runProactiveInsights (스케줄러)

**파일**: `functions/src/step59.runProactiveInsights.ts`

- **스케줄**: 매주 월요일 09:00 실행
- **기능**:
  1. 활성 구독 조회
  2. 그래프 질의 실행 (topRules, actionRate, qualityTrend)
  3. 스토리 생성
  4. 리포트 저장
  5. Slack/Email/TTS 배포

### 2. getInsightSubs (구독 조회)

**파일**: `functions/src/step59.getInsightSubs.ts`

- **엔드포인트**: `GET /getInsightSubs`
- **기능**: 모든 구독 조회

### 3. runProactiveInsightsManual (수동 실행)

**파일**: `functions/src/step59.runProactiveInsightsManual.ts`

- **엔드포인트**: `GET /runProactiveInsightsManual?sub=SUBSCRIPTION_ID`
- **기능**: 특정 구독 수동 실행

## 🖥️ Frontend - InsightsCenter

**파일**: `src/pages/admin/InsightsCenter.tsx`

### 기능

- 구독 목록 표시
- 구독별 정보 표시 (팀, 주기, 기간, 채널)
- 수동 실행 버튼
- 마지막 실행 시간 표시
- 활성/비활성 상태 표시

### 접근 경로

```
/app/admin/insights-center
(관리자 권한 필요)
```

## 📝 스토리 구성 규칙

### Headline (1줄)

이번 주 핵심 상황 요약

**예시**: "경보는 감소, 조치 연결률 8% 상승"

### Highlights (3~5개)

- Top 규칙 변화
- 신생 규칙 등장
- 큰 변동 팀
- 조치 연결률
- 품질 점수 추세

### Actions

제안 조치 링크 버튼

- 재튜닝
- 모델 재로드
- 정책 수정

### Risk Callout

임계치 초과 항목 별도 강조

## 🔧 배포 절차

### 1. 환경 변수 설정

```bash
firebase functions:config:set \
  slack.webhook_url="YOUR_SLACK_WEBHOOK_URL" \
  smtp.user="YOUR_EMAIL" \
  smtp.pass="YOUR_PASSWORD" \
  mail.to="admin@yago-vibe.com"
```

### 2. Functions 배포

```bash
firebase deploy --only functions:runProactiveInsights,functions:getInsightSubs,functions:runProactiveInsightsManual
```

### 3. 구독 생성 (Firebase Console)

```javascript
// insightSubs 컬렉션에 문서 추가
{
  teamId: "SOHEUL_FC",
  title: "주간 품질/경보 인사이트",
  cadence: "weekly",
  windowDays: 7,
  channels: {
    slack: true,
    email: true,
    tts: false
  },
  isEnabled: true,
  emailTo: "admin@yago-vibe.com"
}
```

### 4. 프론트엔드 접근

```
/app/admin/insights-center
(관리자 권한 필요)
```

## 📈 사용 시나리오

### 시나리오 1: 자동 주간 리포트

1. 매주 월요일 09:00 자동 실행
2. 활성 구독 조회
3. 각 팀별로 그래프 질의 실행
4. 스토리 생성
5. Slack/Email 발송

### 시나리오 2: 수동 실행

1. Insights Center 접근
2. 구독 카드에서 "지금 실행" 클릭
3. 리포트 생성 및 배포
4. 결과 확인

## 🎨 확장 아이디어

### 1. PDF 아티팩트 생성

- Step 27의 PDF 저장 유틸 재사용
- `insightReports/{id}` 내용을 템플릿 렌더링
- PDF 저장 및 URL 반환

### 2. TTS 아티팩트 생성

- Step 27/52 TTS 파이프라인 재사용
- 핵심 요약을 음성으로 저장
- URL 링크 첨부

### 3. 구독 편집 UI

- 구독 생성/수정/삭제 기능
- 주기 설정 (RRULE 지원)
- 채널 설정 (Slack/Email/TTS)

## 🐛 문제 해결

### 문제 1: 스케줄러가 실행되지 않음

**원인**: 스케줄러 설정 오류

**해결**:
```bash
# Firebase Console에서 스케줄러 확인
# 또는 수동 실행
firebase functions:shell
> runProactiveInsights()
```

### 문제 2: 그래프 질의 실패

**원인**: Neo4j 연결 실패 또는 데이터 없음

**해결**:
- Neo4j 연결 확인
- `graphCopilot` 함수 로그 확인
- 테스트 데이터 생성

### 문제 3: 배포 실패

**원인**: 환경 변수 미설정

**해결**:
```bash
firebase functions:config:get
# 환경 변수 확인 및 설정
```

## 📚 다음 단계

- Step 60: PDF/TTS 아티팩트 생성
- Step 61: 구독 편집 UI
- Step 62: 고급 인사이트 분석

