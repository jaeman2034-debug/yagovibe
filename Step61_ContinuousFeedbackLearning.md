# Step 61: Continuous Feedback Learning Loop (운영자 피드백 기반 학습 루프)

인사이트 생성 품질을 스스로 개선하는 AI 피드백 시스템입니다. 운영자가 남긴 승인/반려/코멘트를 기반으로 Copilot이 학습하여 더 정확한 요약·추천을 생성하게 합니다.

## 📋 목표

1. 운영자의 피드백(approve/reject/comment)을 데이터화
2. Copilot/Insight Generator의 문장 생성 가중치를 동적으로 조정
3. 주간 단위로 품질 지표(Feedback Precision / Improvement Rate) 산출
4. "AI Feedback Trainer"가 자체 Fine-Tune Loop를 수행

## 🧩 전체 구조

```
[insightReports/{id}]
 ┣ summary / highlights / comments / status
 ┗ reviewHistory (approve / reject)
        ↓
[Functions: feedbackCollector]
        ↓
[feedbackDataset/{sampleId}]
 ┣ text
 ┣ decision (approve/reject)
 ┣ deltaScore
 ┣ reviewerComment
 ┣ embedding
 ┗ updatedAt
        ↓
[Functions: feedbackTrainer]
        ↓
[LLM Adapter: insightGenerator-v2]
```

## 🗄️ 데이터 모델

### feedbackDataset/{sampleId}

```typescript
{
  reportId: string;
  teamId: string;
  text: string;                    // 인사이트 요약
  decision: "approved" | "rejected";
  reviewerComment: string;
  highlights: any[];
  alerts: any[];
  metrics: any;
  reviewer: { uid: string; name: string };
  embedding: number[];             // text-embedding-3-small
  deltaScore: number;              // 승인: +1, 반려: -1
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### modelInsights/{insightId}

```typescript
{
  createdAt: Timestamp;
  improvementNotes: string;         // AI 분석 결과
  improvementRules: string[];      // 개선 규칙 목록
  stats: {
    total: number;
    positives: number;
    negatives: number;
    approvalRate: number;
    improvementRate: number;      // 이전 주 대비 개선율
    embeddingDrift: number;        // 승인 vs 반려 임베딩 거리
  };
  samplesAnalyzed: number;
  positiveExamples: number;
  negativeExamples: number;
}
```

## ⚙️ Functions 구현

### 1. feedbackCollector (피드백 수집)

**파일**: `functions/src/step61.feedbackCollector.ts`

- **트리거**: `onDocumentWritten("insightReports/{id}")`
- **기능**:
  - 승인/반려 상태 변경 감지
  - 피드백 데이터 구성 (text, decision, reviewerComment)
  - OpenAI Embedding 생성 (text-embedding-3-small)
  - `feedbackDataset` 컬렉션에 저장

### 2. feedbackTrainer (주간 학습 루프)

**파일**: `functions/src/step61.feedbackTrainer.ts`

- **스케줄**: 매주 월요일 03:00
- **기능**:
  - 최근 200개 피드백 샘플 수집
  - 승인/반려 샘플 분류
  - OpenAI GPT-4o-mini로 패턴 분석
  - 개선 규칙 생성 (JSON 형식)
  - 통계 계산 (approvalRate, improvementRate, embeddingDrift)
  - `modelInsights` 컬렉션에 저장

### 3. getModelInsights (모델 인사이트 조회)

**파일**: `functions/src/step61.getModelInsights.ts`

- **엔드포인트**: `GET /getModelInsights?limit=20`
- **기능**: 모델 인사이트 조회

### 4. getFeedbackStats (피드백 통계)

**파일**: `functions/src/step61.getModelInsights.ts`

- **엔드포인트**: `GET /getFeedbackStats`
- **기능**: 피드백 데이터셋 통계 조회

## 🖥️ Frontend - FeedbackCenter

**파일**: `src/pages/admin/FeedbackCenter.tsx`

### 기능

- 주요 지표 카드 (Approval Rate, Feedback Density, Total Feedback, Improvement Rate)
- 모델 인사이트 테이블 (날짜, 승인율, 개선률, 샘플 수, 학습결과 요약)
- Self-Improving Loop 설명

### 접근 경로

```
/app/admin/feedback-center
(Owner/Admin 권한 필요)
```

## 📈 주요 지표

| 항목 | 설명 |
|------|------|
| **Approval Rate** | 운영자 승인 비율 (QA 품질 신뢰도) |
| **Feedback Density** | 주간 피드백 건수 |
| **Improvement Rate** | 모델 개선률 (재학습 후 품질 상승 %) |
| **Embedding Drift** | 승인 vs 반려 임베딩 간 코사인 거리 |

## 🔄 Self-Improving Loop

1. **feedbackCollector**가 승인/반려 데이터를 기록
2. **feedbackTrainer**가 매주 패턴을 분석 → 개선 규칙 생성
3. **insightGenerator-v2** (LLM Adapter)가 다음 주 리포트 생성 시 규칙 반영
4. 승인율 상승 → 모델 자동 튜닝 루프 강화

## 🔒 보안/권한

### Step 43 Role System 연동

**Frontend (FeedbackCenter.tsx)**:
- `useRoleAccess` 훅 사용
- Owner/Admin 권한 확인
- 권한 없음 시 접근 차단 UI 표시

**Firestore Rules**:
- `feedbackDataset`: Functions에서만 쓰기 가능
- `modelInsights`: Owner/Admin만 읽기 가능

## 🔧 배포 절차

### 1. 환경 변수 설정

```bash
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"
```

### 2. Functions 배포

```bash
firebase deploy --only functions:feedbackCollector,functions:feedbackTrainer,functions:getModelInsights,functions:getFeedbackStats
```

### 3. 프론트엔드 접근

```
/app/admin/feedback-center
(Owner/Admin 권한 필요)
```

## 📊 사용 시나리오

### 시나리오 1: 자동 피드백 수집

1. 운영자가 인사이트 리포트 승인/반려
2. `feedbackCollector` 트리거
3. 피드백 데이터 + 임베딩 생성
4. `feedbackDataset` 컬렉션에 저장

### 시나리오 2: 주간 학습 루프

1. 매주 월요일 03:00 자동 실행
2. 최근 200개 피드백 샘플 수집
3. AI 분석 실행 (GPT-4o-mini)
4. 개선 규칙 생성
5. 통계 계산 및 저장

### 시나리오 3: 피드백 대시보드 확인

1. Feedback Center 접근
2. 주요 지표 확인
3. 모델 인사이트 기록 확인
4. 개선률 추이 분석

## 🎨 확장 아이디어

### 1. 실시간 피드백 반영

- 피드백 수집 즉시 모델 가중치 업데이트
- 실시간 품질 모니터링

### 2. 팀별 피드백 분석

- 팀별 승인 패턴 분석
- 팀별 맞춤형 인사이트 생성

### 3. A/B 테스트

- 기존 모델 vs 개선 모델 비교
- 승인율 변화 측정

## 🐛 문제 해결

### 문제 1: 피드백이 수집되지 않음

**원인**: `feedbackCollector` 트리거 실패

**해결**:
- Functions 로그 확인
- Firestore 트리거 설정 확인
- `insightReports` 문서 상태 변경 확인

### 문제 2: 학습 루프가 실행되지 않음

**원인**: 스케줄러 설정 오류

**해결**:
```bash
# Firebase Console에서 스케줄러 확인
# 또는 수동 실행
firebase functions:shell
> feedbackTrainer()
```

### 문제 3: 임베딩 생성 실패

**원인**: OpenAI API 키 오류 또는 텍스트 길이 초과

**해결**:
- OpenAI API 키 확인
- 텍스트 길이 제한 (8000자)
- 에러 로그 확인

## 📚 다음 단계

- Step 62: Real-time Feedback Integration
- Step 63: Team-Specific Feedback Analysis
- Step 64: A/B Testing Framework

