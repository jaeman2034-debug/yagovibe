# Step 48: Closed-Loop Tuning (자동 보정 루프) - 구현 검토

## ✅ 구현 완료 확인

### 1. tuningLoop Function

**파일**: `functions/src/step48.tuningLoop.ts`

- [x] **스케줄러 설정**
  - `onSchedule("every 6 hours")` - 6시간마다 자동 실행
  - 시간대: `Asia/Seoul`
  - 리전: `asia-northeast3`

- [x] **Root Cause 분석**
  - 모든 팀 조회: `db.collection("teams").get()`
  - 최근 Root Cause 읽기: `teams/{teamId}.latestRootCause`
  - Root Cause가 없으면 스킵

- [x] **보정 액션 결정**
  - Root Cause 라벨 기반 매핑
  - 정책 기반 액션 결정 (`determineAction`)
  - 모듈별 액션: ASR, TTS, NLU

- [x] **파라미터 자동 보정**
  - `applyTuningAction` 함수로 실제 API 호출
  - 환경 변수 `ENABLE_TUNING_API`로 제어
  - API 호출 실패해도 로그는 저장 (나중에 수동 적용 가능)

- [x] **결과 기록**
  - `tuningLogs` 컬렉션에 저장
  - 팀 문서에 `lastTuning` 갱신
  - `lastTunedAt` 타임스탬프 업데이트

### 2. 정책 관리

**파일**: `functions/src/step48.tuningLoop.ts` - `getDefaultPolicy()`

- [x] **기본 정책 제공**
  - `policyId: "default"`
  - 임계값 정의: `thresholds` 객체
  - 액션 매핑: `actions` 객체

- [x] **Firestore policies 컬렉션 지원**
  - `db.collection("policies").doc("default").get()`
  - 정책이 없으면 기본 정책 사용
  - 팀별 정책 지원: `teamData.policyId`

- [x] **동적 조정**
  - 정책 업데이트 시 자동 반영
  - 다음 실행 시 새 정책 기준으로 실행

### 3. 피드백 학습

**파일**: `functions/src/step48.tuningLoop.ts` - `evaluateTuningFeedback()`

- [x] **자동 평가**
  - Step 47의 `rootcauseAnalyzer`에서 자동 호출
  - 비동기 실행 (에러 무시)

- [x] **deltaScore 계산**
  - 튜닝 이후 리포트들의 평균 점수 계산
  - 기준 점수와 비교: `deltaScore = avgScore - baselineScore`
  - 최근 10개 리포트 분석

- [x] **Reinforcement Score**
  - 개선 시: `deltaScore > 0.05` → `+1`
  - 악화 시: `deltaScore < -0.05` → `-1`
  - 변화 없음: `-0.05 <= deltaScore <= 0.05` → `0`

- [x] **피드백 저장**
  - `tuningLogs` 문서에 `feedback` 필드 추가
  - `deltaScore`, `avgScore`, `baselineScore`, `reinforcementScore` 저장

### 4. 대시보드 통합

**파일**: `src/components/TuningCard.tsx`

- [x] **튜닝 결과 카드**
  - 최근 보정 시각 표시
  - 수정된 파라미터 목록 (모듈별 색상 구분)
  - 보정 효과 표시 (deltaScore, reinforcement score)

- [x] **품질 개선 추이**
  - 피드백 데이터 기반 트렌드 그래프
  - 최근 5개 튜닝 이력 표시
  - 점수 변화량 시각화

**파일**: `src/components/Step42_AIInsightsDashboard.tsx`

- [x] **튜닝 결과 로드**
  - 팀 문서에서 `lastTuning` 읽기
  - `tuningLogs` 컬렉션에서 피드백 트렌드 로드
  - `TuningCard` 컴포넌트에 전달

- [x] **UI 통합**
  - Root Cause 카드 다음에 표시
  - 실시간 업데이트 (Firestore 구독)

## 📊 데이터 흐름 검증

```
1. Root Cause 분석 (Step 47)
   ↓
2. tuningLoop 실행 (6시간마다)
   ├─ teams 조회
   ├─ latestRootCause 읽기
   ├─ 보정 액션 결정 (정책 기반)
   ├─ API 호출 (ENABLE_TUNING_API=true)
   └─ tuningLogs 저장
   ↓
3. evaluateTuningFeedback (Root Cause 분석 후 자동)
   ├─ 튜닝 이후 리포트 분석
   ├─ deltaScore 계산
   └─ reinforcementScore 저장
   ↓
4. TuningCard 표시
   ├─ lastTuning 읽기
   ├─ tuningLogs에서 트렌드 로드
   └─ 대시보드에 표시
```

## 🔍 주요 기능 확인

### 보정 액션 매핑

- [x] 노이즈/SNR 저하 → `ASR.noise_suppression = "strong"`
- [x] 발화 속도 과다 → `ASR.vad_aggressiveness = "high"`
- [x] 발화 속도 저하 → `ASR.vad_aggressiveness = "low"`
- [x] 키워드 편중 → `NLU.entity_weight_balance = "rebalance"`
- [x] 무성 구간 과다 → `TTS.silence_trim = "enable"`
- [x] 타임스탬프 중첩 → `TTS.timestamp_alignment = "strict"`

### 정책 구조

```typescript
{
  policyId: "default",
  thresholds: {
    snr: 12,
    speed_high: 180,
    speed_low: 60,
    gaps: 10,
    overlaps: 8
  },
  actions: {
    snr_low: { module: "ASR", param: "noise_suppression", value: "strong" },
    speed_high: { module: "ASR", param: "vad_aggressiveness", value: "high" },
    // ...
  }
}
```

### 튜닝 로그 구조

```typescript
{
  teamId: string;
  createdAt: Date;
  decisions: Array<{
    action: TuningAction;
    score: number;
    timestamp: Date;
  }>;
  policyId: string;
  feedback?: {
    deltaScore: number;
    avgScore: number;
    baselineScore: number;
    reinforcementScore: number;
    evaluatedAt: Date;
  };
}
```

## 🎯 핵심 요약 확인

### ✅ tuningLoop Function

- [x] 6시간마다 실행
- [x] 최근 Root Cause 분석
- [x] ASR/TTS/NLU 파라미터 자동 보정
- [x] `tuningLogs` 컬렉션에 결과 기록
- [x] 팀 문서에 `lastTuning` 갱신

### ✅ 정책 관리

- [x] Firestore `policies` 컬렉션 지원
- [x] 임계값 동적 관리 (`thresholds`)
- [x] 액션 동적 관리 (`actions`)
- [x] 기본 정책 제공

### ✅ 피드백 학습

- [x] deltaScore 기반 계산
- [x] Reinforcement Score (+1/-1)
- [x] 튜닝 로그에 피드백 저장
- [x] 자동 평가 (Step 47 통합)

### ✅ 대시보드 통합

- [x] 최근 튜닝 결과 표시
- [x] 품질 개선 추이 그래프
- [x] TuningCard 컴포넌트
- [x] Step42 대시보드 통합

## 📋 배포 체크리스트

### Functions

- [x] `tuningLoop` 함수 구현 완료
- [x] `evaluateTuningFeedback` 함수 구현 완료
- [x] `index.ts`에 export 추가
- [ ] Functions 배포: `firebase deploy --only functions:tuningLoop`

### 환경 변수

- [ ] `ASR_API_URL` 설정 (선택)
- [ ] `TTS_API_URL` 설정 (선택)
- [ ] `NLU_API_URL` 설정 (선택)
- [ ] `ENABLE_TUNING_API=true` (실제 API 호출 활성화)

### Firestore

- [ ] `policies/default` 문서 생성 (또는 기본 정책 사용)
- [ ] `tuningLogs` 컬렉션 인덱스 생성 (필요 시)

### 프론트엔드

- [x] `TuningCard` 컴포넌트 구현
- [x] `Step42_AIInsightsDashboard` 통합
- [x] 튜닝 결과 로드 로직 구현

## 🐛 알려진 제한사항

### API 호출

- 현재는 `ENABLE_TUNING_API=false` 기본값 (로깅만)
- 실제 API 호출하려면 환경 변수 설정 필요
- API 호출 실패해도 로그는 저장 (나중에 수동 적용 가능)

### 피드백 평가

- 최소 10개 리포트 필요 (튜닝 이후)
- 기준 점수가 없으면 평가 불가 (기본값 0.7 사용)

### 정책 관리

- 팀별 정책은 `teamData.policyId`로 지정 가능
- 정책이 없으면 기본 정책 사용

## ✅ 최종 확인

모든 구현이 완료되었으며, 핵심 요약과 일치합니다.

### 구현 완료 항목

- ✅ tuningLoop Function: 6시간마다 실행, Root Cause 분석, 파라미터 보정, tuningLogs 저장
- ✅ 정책 관리: Firestore policies 컬렉션, 임계값·액션 동적 관리
- ✅ 피드백 학습: deltaScore 기반 reinforcement score, 정책 자동 개선
- ✅ 대시보드 통합: 최근 튜닝 결과, 품질 개선 추이 표시

### 다음 단계

1. Functions 배포: `firebase deploy --only functions:tuningLoop`
2. 환경 변수 설정 (API 엔드포인트)
3. 기본 정책 생성 (Firestore)
4. 테스트: Root Cause 생성 후 튜닝 실행 확인

