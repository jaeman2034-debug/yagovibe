# Step 51: Global Quality Command Center (통합 품질 관제 센터)

모든 팀의 품질, 튜닝, 예측, 이상 상태를 통합 대시보드에서 실시간 관제하고, 전역 필터 기반 drill-down 탐색 및 AI Control Actions를 제공합니다.

## 📋 목표

1. 모든 팀의 품질, 튜닝, 예측, 이상 상태를 통합 대시보드에서 실시간 관제
2. 전역 필터(기간, 팀, 상태, 모델 버전) 기반 drill-down 탐색
3. "AI Control Actions" - 관리자 클릭 한 번으로 팀별 리포트 재튜닝, 모델 재로드
4. "Global KPI Summary" - 품질 점수 트렌드, 알람 발생률, 평균 개선율

## 🚀 구현 사항

### 1. Backend API - 통합 통계

**파일**: `functions/src/step51.getGlobalStats.ts`

- **엔드포인트**: `GET /getGlobalStats`
- **기능**:
  - 모든 팀의 최신 품질 지표 집계
  - Root Cause, Tuning, Simulation 결과 통합
  - 전역 KPI 계산 (평균 점수, 커버리지, 알림 수 등)
  - 필터링 지원 (teamId, startDate, endDate, modelVersion)

- **출력**:
  ```typescript
  {
    updatedAt: string;
    summary: TeamSummary[];
    globalKPI: {
      avgScore: number;
      avgCoverage: number;
      totalAlerts: number;
      totalAnomalies: number;
      totalTeams: number;
      teamsWithTuning: number;
      avgPredictedScore: number;
    };
  }
  ```

### 2. Backend API - AI Control Actions

**파일**: `functions/src/step51.triggerActions.ts`

- **엔드포인트**: `POST /triggerActions`
- **지원 액션**:
  - `retuning`: 팀별 재튜닝 트리거
  - `reloadModel`: 모델 재로드 (특정 URL 또는 최신 모델)
  - `runSimulation`: 예측 시뮬레이션 실행
  - `clearAlerts`: 알림 해결 (상태 변경)

### 3. Frontend - Global Quality Command Center

**파일**: `src/pages/admin/GlobalQualityCenter.tsx`

- **기능**:
  - 전역 필터 (팀, 기간, 모델 버전)
  - Global KPI Summary 카드
  - Team Grid View (팀별 주요 지표)
  - Quality Trend Chart (팀별 품질 트렌드)
  - AI Control Actions 패널
  - 실시간 갱신 (30초마다)

- **권한**: 관리자 전용 (`isAdminUser()` 체크)

### 4. 라우트 설정

**파일**: `src/App.tsx`

- 경로: `/app/admin/global-quality`
- 관리자 전용 페이지

## 📊 주요 기능

### Team Grid View

- 팀별 주요 지표:
  - Score, Coverage, 예측 점수
  - Root Cause 요약
  - 튜닝 횟수, 알림 수
  - 이상 탐지 배지 (anomalyCount > 0)

### Quality Trend Chart

- 팀별 품질 트렌드 시각화
- Score, Coverage, Predicted 비교
- Recharts LineChart 사용

### AI Control Actions

- 개별 팀 액션:
  - 재튜닝
  - 시뮬레이션
  - 알림 해결
- 전역 액션:
  - 최신 모델 재로드
  - 전체 팀 재튜닝
  - 전체 시뮬레이션 실행

### Global KPI Summary

- 평균 품질 점수
- 총 알림 수 (이상 탐지 포함)
- 활성 팀 수 (튜닝 적용 팀 포함)
- 평균 예측 점수

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:getGlobalStats,functions:triggerActions
```

### 2. 환경 변수 설정

```bash
firebase functions:config:set \
  predictor.url="https://quality-predictor-asia-northeast3-xxxxx.run.app" \
  model.bucket="yago-models"
```

### 3. 프론트엔드 접근

```
/admin/global-quality 경로로 접근
(관리자 권한 필요)
```

## 📈 사용 시나리오

### 시나리오 1: 전체 팀 상태 확인

1. Global Quality Command Center 접근
2. Global KPI Summary 확인
3. Team Grid View에서 각 팀 상태 확인

### 시나리오 2: 특정 팀 필터링

1. 팀 필터 선택
2. 해당 팀의 상세 정보 확인
3. 재튜닝 또는 시뮬레이션 실행

### 시나리오 3: 기간별 분석

1. 시작일/종료일 설정
2. 해당 기간의 데이터만 표시
3. 트렌드 차트에서 변화 확인

### 시나리오 4: 모델 버전별 필터링

1. 모델 버전 선택 (ML Model / Linear)
2. 해당 모델을 사용한 팀만 표시
3. 모델 성능 비교

## 🎨 확장 아이디어

### 1. 실시간 WebSocket Feed

- Firestore `onSnapshot` 사용
- 실시간 업데이트 (30초 폴링 대신)

### 2. AI Insight Widget

- ChatGPT API로 "주간 품질 인사이트 카드" 자동 생성
- 트렌드 분석 및 개선 제안

### 3. Global Health Score

- 모든 팀의 평균 점수, 표준편차, 안정성 지수 계산
- 종합 건강도 점수 표시

### 4. Drill-down 탐색

- 팀 카드 클릭 시 상세 페이지로 이동
- 리포트별 상세 분석

## 🔍 모니터링

### API 호출 모니터링

```bash
firebase functions:log --only getGlobalStats,triggerActions
```

### 성능 최적화

- 30초 폴링 간격
- 필터링으로 데이터 양 제한
- 페이지네이션 (향후 구현)

## 🐛 문제 해결

### 데이터가 표시되지 않을 때

1. 관리자 권한 확인
2. Functions 배포 확인
3. API 엔드포인트 URL 확인 (`VITE_FUNCTIONS_ORIGIN`)

### 액션이 실행되지 않을 때

1. Functions 로그 확인
2. 환경 변수 확인 (PREDICTOR_URL, MODEL_BUCKET)
3. Cloud Run 서비스 상태 확인

## 📚 다음 단계

- Step 52: 실시간 WebSocket Feed (Firestore onSnapshot)
- Step 53: AI Insight Widget (ChatGPT API)
- Step 54: Drill-down 상세 페이지

