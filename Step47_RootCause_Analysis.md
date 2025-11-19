# Step 47: 멀티모달 상관분석 → Root Cause 카드 자동 생성

텍스트 키워드 패턴과 오디오 신호 특성(SNR, RMS, 속도 등)을 결합 분석하여 품질 이상의 가능한 원인을 추정하고 대시보드에 카드 형태로 표시합니다.

## 📋 아키텍처

```
Firestore: teams/{teamId}/reports/{reportId}/qualityReports/{ts}
    └─(Trigger)→ Functions: rootcauseAnalyzer (Step47)
                  ├─ 호출 → Cloud Run: audio-features (librosa)
                  ├─ 텍스트 키워드 통계 + 오디오 특성 상관 분석
                  ├─ Root Cause 카드 생성/저장
                  └─ (옵션) Slack 요약 알림
```

## 🚀 배포 절차

### 1단계: Cloud Run 서비스 배포

#### 1.1 Docker 이미지 빌드

```bash
export PROJECT_ID="your-project"
export REGION="asia-northeast3"

cd step47-audio-features

# Docker 이미지 빌드
gcloud builds submit --tag gcr.io/$PROJECT_ID/step47-audio-features:latest
```

#### 1.2 Cloud Run에 배포

```bash
gcloud run deploy step47-audio-features \
  --image gcr.io/$PROJECT_ID/step47-audio-features:latest \
  --region=$REGION \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=2Gi \
  --timeout=300 \
  --max-instances=20 \
  --concurrency=10
```

**보안 권장사항**:
- 실서비스에서는 `--allow-unauthenticated` 제거
- Functions에서 OIDC 토큰으로 인증 호출

#### 1.3 서비스 URL 확인

```bash
gcloud run services describe step47-audio-features \
  --region=$REGION \
  --format="value(status.url)"
```

### 2단계: Functions 배포

#### 2.1 환경 변수 설정

```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set \
  audio_features.url="https://step47-audio-features-asia-northeast3-xxxxx.run.app/analyze" \
  slack.webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

또는 `.env` 파일 사용 (Firebase Functions v2):

```env
AUDIO_FEATURES_URL=https://step47-audio-features-asia-northeast3-xxxxx.run.app/analyze
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### 2.2 Functions 배포

```bash
cd functions
npm install node-fetch
cd ..
firebase deploy --only functions:rootcauseAnalyzer
```

### 3단계: 프론트엔드 통합

이미 구현된 컴포넌트:
- `src/components/RootCauseCard.tsx` - Root Cause 카드 표시
- `Step42_AIInsightsDashboard.tsx` - 리포트 대시보드 통합
- `TeamInsightsDashboard.tsx` - 팀 대시보드 통합

## 🔍 분석 알고리즘

### 1. 오디오 특징 추출

- **SNR (Signal-to-Noise Ratio)**: 신호 대 노이즈 비율 (dB)
- **RMS (Root Mean Square)**: 신호 강도
- **ZCR (Zero Crossing Rate)**: 주파수 변화율
- **Spectral Centroid**: 스펙트럼 중심 주파수
- **Speech Blocks/min**: 발화 블록 수 (분당) - 말속도 추정

### 2. Root Cause 추정 규칙

#### (a) 노이즈/마이크 문제
- **조건**: `SNR < 12 dB`
- **점수**: `(12 - SNR) / 10`
- **증거**: SNR 값, overallScore

#### (b) 발화 속도 문제
- **과속**: `blocks/min > 180`
- **저하**: `blocks/min < 60`
- **점수**: 0.6 ~ 0.7

#### (c) 키워드 편중
- **조건**: `coverage < 0.92` AND `키워드 빈도 >= 3`
- **점수**: 0.5
- **증거**: coverage, 편중된 키워드 목록

#### (d) Overlaps/Gaps 과다
- **Gaps**: `gaps > 10` → "무성 구간 과다"
- **Overlaps**: `overlaps > 8` → "타임스탬프 중첩/정렬 불안정"
- **점수**: 0.6

### 3. 결과 정렬 및 선택

- 원인들을 점수 내림차순으로 정렬
- 상위 3개만 선택하여 카드에 표시

## 📊 데이터 저장

### Root Cause 카드

```typescript
{
  createdAt: Date,
  metrics: {
    overallScore: number,
    coverage: number,
    gaps: number,
    overlaps: number
  },
  audio: {
    snr_db: number,
    rms_mean: number,
    speech_blocks_per_min: number,
    ...
  },
  textSignals: {
    keywordHits: Record<string, number>
  },
  causes: [
    {
      label: string,
      score: number,
      evidence: string[]
    }
  ],
  summary: string
}
```

### 저장 위치

- `teams/{teamId}/reports/{reportId}/rootCauses/{ts}` - 리포트별 상세 분석
- `teams/{teamId}.latestRootCause` - 팀 레벨 최근 요약

## 🎨 UI 컴포넌트

### RootCauseCard

- **위치**: 리포트 대시보드, 팀 대시보드
- **표시 내용**:
  - 요약 (가장 높은 점수의 원인)
  - 원인 목록 (점수, 증거)
  - 오디오 특징 (SNR, RMS, Blocks/min)
  - 품질 지표 (Score, Coverage, Gaps, Overlaps)

## 🔧 튜닝 포인트

### 임계값 조정

- **SNR**: 기본 12dB (마이크/환경 노이즈에 따라 조정)
- **Blocks/min**: 기본 60~180 (언어/발화 스타일에 따라 조정)
- **Coverage**: 기본 0.92 (정확도 요구사항에 따라 조정)
- **Gaps/Overlaps**: 기본 10/8 (품질 기준에 따라 조정)

### 키워드 사전

- 팀/도메인별 stopwords 관리
- 중요 키워드 사전 유지
- 오인식 편향 탐지 개선

### 캐싱

- 동일 `audioUrl` 재분석 방지
- `audioFeatures` 필드를 리포트 문서에 캐시 저장

## 💰 비용 최적화

### Cloud Run

- **CPU**: 1 vCPU
- **Memory**: 1~2 GiB
- **Concurrency**: 10~20
- **Max Instances**: 20
- **Timeout**: 300초

### Functions

- 트리거: `onDocumentCreated`
- 타임아웃: 540초 (기본값)
- 메모리: 256MB (기본값)

## 🔒 보안

### Cloud Run 인증

실서비스에서는 인증 필요:

```bash
gcloud run deploy step47-audio-features \
  --no-allow-unauthenticated \
  --service-account=functions-sa@PROJECT_ID.iam.gserviceaccount.com
```

Functions에서 OIDC 토큰으로 호출:

```typescript
import { getAuth } from "firebase-admin/auth";

const idToken = await getAuth().createCustomToken(serviceAccountEmail);
const response = await fetch(AUDIO_FEATURES_URL, {
  headers: {
    "Authorization": `Bearer ${idToken}`,
  },
});
```

### 오디오 URL 보안

- 비공개 스토리지면 Signed URL 사용
- URL 검증 및 만료 시간 확인

## 🐛 문제 해결

### 오디오 분석 실패

1. **Cloud Run 로그 확인**:
   ```bash
   gcloud run services logs read step47-audio-features --region=$REGION
   ```

2. **오디오 URL 확인**: 접근 가능한지 확인
3. **타임아웃 확인**: 긴 오디오는 타임아웃 증가 필요

### Root Cause가 생성되지 않을 때

1. **Functions 로그 확인**:
   ```bash
   firebase functions:log --only rootcauseAnalyzer
   ```

2. **트리거 확인**: `qualityReports` 문서 생성 여부
3. **오디오 URL 확인**: 리포트에 `audioUrl` 필드 존재 여부

## 📚 다음 단계

- Step 48: 머신러닝 기반 Root Cause 예측 (AutoML)
- Step 49: Root Cause 히스토리 트렌드 분석
- Step 50: 자동 개선 제안 시스템

