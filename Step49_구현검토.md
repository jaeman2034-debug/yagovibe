# Step 49: Digital Twin Simulator (예측 시뮬레이터 & 디지털 트윈) - 구현 검토

## ✅ 구현 완료 확인

### 1. Cloud Run ML Predictor

**파일**: `step49-quality-predictor/app.py`

- [x] **FastAPI 기반 REST API**
  - 엔드포인트: `POST /predict`
  - 엔드포인트: `POST /predict_batch` (멀티 시나리오 비교)
  - 엔드포인트: `GET /health` (헬스 체크)

- [x] **ML 모델 지원**
  - LightGBM 모델 로드 (`model_quality_predictor.pkl`)
  - 모델이 없으면 간단한 선형 회귀 사용 (가중치 기반)
  - `joblib`을 사용한 모델 로드

- [x] **입력 특징 처리**
  - 범주형 인코딩: `vad_aggressiveness`, `noise_suppression`
  - 숫자형 특징: `snr_db`, `speech_blocks_per_min`, `coverage`, `gaps`, `overlaps`

- [x] **출력**
  - `predicted_score`: 예상 품질 점수 (0.0 ~ 1.0)
  - `confidence`: 예측 신뢰도 (0.0 ~ 1.0)
  - `model_used`: "actual" (실제 모델) 또는 "linear" (간단한 선형 회귀)

### 2. Functions digitalTwinSimulator

**파일**: `functions/src/step49.digitalTwin.ts`

- [x] **트리거 설정**
  - `onDocumentCreated("tuningLogs/{logId}")`
  - 튜닝 로그 생성 시 자동 실행

- [x] **가상 품질 예측 실행**
  - 팀 문서에서 최근 Root Cause 읽기
  - 튜닝 파라미터 추출 (`log.decisions`)
  - ML 예측 API 호출 (`${PREDICTOR_URL}/predict`)
  - 시뮬레이션 결과 저장

- [x] **Firestore 기록**
  - `teams/{teamId}/simulations/{ts}` 컬렉션에 저장
  - 팀 문서에 `latestSimulation` 요약 저장

### 3. Firestore 기록 구조

- [x] **simulations 컬렉션**
  - 경로: `teams/{teamId}/simulations/{ts}`
  - 필드:
    - `createdAt`: 생성 시각
    - `params`: 튜닝 파라미터 (vad_aggressiveness, noise_suppression 등)
    - `payload`: 입력 특징 (snr_db, speech_blocks_per_min, coverage 등)
    - `predicted`: 예측 결과 (predicted_score, confidence, model_used)
    - `rootRef`: Root Cause 참조 (reportId, summary, causes)

- [x] **teams/{teamId}.latestSimulation**
  - 최근 시뮬레이션 요약 저장
  - `predictedScore`, `confidence`, `createdAt`

### 4. 대시보드 카드

**파일**: `src/components/SimulationResultCard.tsx`

- [x] **예측 점수 표시**
  - 예상 품질 점수 (predicted_score)
  - 예측 신뢰도 (confidence)
  - 모델 타입 (ML Model 또는 Linear)

- [x] **파라미터 표시**
  - 적용된 파라미터 목록 (params)
  - 입력 특징 (payload: SNR, Blocks/min, Coverage, Gaps, Overlaps)

- [x] **비교 표시**
  - 기준 점수와 비교 (baseline)
  - 개선/악화 여부 (delta)
  - 시각적 표시 (TrendingUp/TrendingDown 아이콘)

### 5. 대시보드 통합

- [x] **Step42_AIInsightsDashboard**
  - 최근 3개 시뮬레이션 결과 표시
  - `teams/{teamId}/simulations` 컬렉션에서 로드
  - 기준 점수와 비교 (qualityMetrics.overallScore)

- [x] **TeamInsightsDashboard**
  - 최근 시뮬레이션 요약 표시
  - `teams/{teamId}.latestSimulation` 필드에서 로드
  - 실시간 업데이트 (onSnapshot)

## 📊 데이터 흐름 검증

```
1. tuningLogs/{logId} 생성 (Step 48)
   ↓
2. digitalTwinSimulator 트리거
   ├─ teams/{teamId}/latestRootCause 읽기
   ├─ 튜닝 파라미터 추출
   ├─ ML 예측 API 호출 (/predict)
   └─ teams/{teamId}/simulations/{ts} 저장 ✅
   ↓
3. teams/{teamId}.latestSimulation 업데이트 ✅
   ↓
4. SimulationResultCard 표시 (대시보드) ✅
   ├─ 예측 점수 표시
   ├─ 파라미터 표시
   └─ 기준 점수와 비교
```

## 🔍 주요 기능 확인

### ML 예측 API

- [x] LightGBM 모델 지원 (실제 모델 파일이 있으면 사용)
- [x] 간단한 선형 회귀 폴백 (모델이 없을 때)
- [x] 범주형 인코딩 (vad_aggressiveness, noise_suppression)
- [x] 배치 예측 지원 (`/predict_batch`)

### 시뮬레이터 트리거

- [x] tuningLogs 문서 생성 시 자동 실행
- [x] Root Cause 데이터 활용
- [x] 튜닝 파라미터 추출
- [x] 예측 결과 저장

### Firestore 기록

- [x] `teams/{teamId}/simulations` 컬렉션에 저장
- [x] `teams/{teamId}.latestSimulation` 필드 업데이트
- [x] Root Cause 참조 저장

### 대시보드 카드

- [x] SimulationResultCard 컴포넌트
- [x] 예측 점수 및 신뢰도 표시
- [x] 파라미터 목록 표시
- [x] 기준 점수와 비교
- [x] 입력 특징 표시

## 🎯 핵심 요약 확인

### ✅ Cloud Run ML Predictor

- [x] LightGBM 기반 예측 API
- [x] `/predict` 엔드포인트
- [x] 모델 로드 또는 선형 회귀 폴백
- [x] 예측 점수 및 신뢰도 반환

### ✅ Functions digitalTwinSimulator

- [x] tuning 로그 트리거 (`onDocumentCreated`)
- [x] 가상 품질 예측 실행
- [x] ML 예측 API 호출
- [x] 시뮬레이션 결과 저장

### ✅ Firestore 기록

- [x] `teams/{teamId}/simulations/{ts}` 컬렉션
- [x] 시뮬레이션 결과 상세 저장
- [x] `teams/{teamId}.latestSimulation` 요약 저장

### ✅ 대시보드 카드

- [x] SimulationResultCard 컴포넌트
- [x] 예측 점수 표시
- [x] 파라미터 표시
- [x] 기준 점수와 비교
- [x] Step42 및 TeamInsightsDashboard 통합

## 📋 배포 체크리스트

### Cloud Run

- [x] `app.py` 구현 완료
- [x] `requirements.txt` 작성 완료
- [x] `Dockerfile` 작성 완료
- [ ] Docker 이미지 빌드: `gcloud builds submit`
- [ ] Cloud Run 배포: `gcloud run deploy`

### Functions

- [x] `digitalTwinSimulator` 함수 구현 완료
- [x] `index.ts`에 export 추가
- [ ] Functions 배포: `firebase deploy --only functions:digitalTwinSimulator`

### 환경 변수

- [ ] `PREDICTOR_URL` 설정 (Cloud Run 서비스 URL)

### 프론트엔드

- [x] `SimulationResultCard` 컴포넌트 구현
- [x] `Step42_AIInsightsDashboard` 통합
- [x] `TeamInsightsDashboard` 통합

## 🐛 알려진 제한사항

### ML 모델

- 실제 모델 파일이 없으면 간단한 선형 회귀 사용
- 모델 파일은 Docker 이미지에 포함하거나 Cloud Storage에서 로드 필요

### 예측 API

- API 호출 실패 시 기본값(0)으로 저장
- 타임아웃: 10초

### 시뮬레이션

- Root Cause가 없으면 시뮬레이션 스킵
- 튜닝 파라미터가 없으면 기본값 사용

## ✅ 최종 확인

모든 구현이 완료되었으며, 핵심 요약과 일치합니다.

### 구현 완료 항목

- ✅ Cloud Run ML Predictor: LightGBM 기반 예측 API (`/predict`)
- ✅ Functions digitalTwinSimulator: tuning 로그 트리거로 가상 품질 예측 실행
- ✅ Firestore 기록: `teams/{teamId}/simulations` 컬렉션
- ✅ 대시보드 카드: SimulationResultCard로 예측 점수와 파라미터 표시

### 다음 단계

1. Cloud Run 서비스 배포
2. Functions 배포
3. 환경 변수 설정
4. 테스트: tuningLogs 생성 후 시뮬레이션 확인

