# Step 47: 멀티모달 상관분석 → Root Cause 카드 자동 생성 - 구현 검토

## ✅ 구현 완료 확인

### 1. Cloud Run 서비스 (Python, librosa)

**파일**: `step47-audio-features/app.py`

- [x] **FastAPI 기반 REST API**
  - 엔드포인트: `/analyze`
  - 엔드포인트: `/health` (헬스 체크)

- [x] **오디오 특징 추출**
  - ✅ SNR (Signal-to-Noise Ratio) - 신호 대 노이즈 비율 (dB)
  - ✅ RMS (Root Mean Square) - 신호 강도
  - ✅ ZCR (Zero Crossing Rate) - 주파수 변화율
  - ✅ Spectral Centroid - 스펙트럼 중심 주파수
  - ✅ Speech Blocks/min - 발화 블록 수 (분당, 말속도 추정)

- [x] **오디오 처리**
  - 오디오 URL 다운로드
  - librosa로 오디오 로드 및 분석
  - 임시 파일 자동 정리

- [x] **배포 설정**
  - `Dockerfile` - Python 3.10, FFmpeg 포함
  - `requirements.txt` - 의존성 관리

### 2. Functions 트리거 (Root Cause 분석기)

**파일**: `functions/src/step47.rootcause.ts`

- [x] **트리거 설정**
  - `onDocumentCreated`: `teams/{teamId}/reports/{reportId}/qualityReports/{ts}`
  - 품질 리포트 생성 시 자동 실행

- [x] **오디오 특징 추출**
  - Cloud Run 서비스 호출 (`/analyze`)
  - 캐싱: 동일 `audioUrl` 재분석 방지
  - `audioFeatures` 필드를 리포트 문서에 저장

- [x] **텍스트 키워드 통계**
  - 최근 N=20개 품질 리포트 분석
  - 키워드 빈도 측정
  - `keywordHits` 객체 생성

- [x] **멀티모달 상관 분석**
  - 텍스트 키워드 + 오디오 특성 결합 분석
  - 규칙 기반 Root Cause 추정:
    - (a) 노이즈/마이크 문제: `SNR < 12 dB`
    - (b) 발화 속도 문제: `blocks/min > 180` (과속) 또는 `< 60` (저하)
    - (c) 키워드 편중: `coverage < 0.92` AND `키워드 빈도 >= 3`
    - (d) Overlaps/Gaps 과다: `gaps > 10` 또는 `overlaps > 8`

- [x] **결과 저장**
  - 상위 3개 원인 선택 (점수 내림차순)
  - `teams/{teamId}/reports/{reportId}/rootCauses/{ts}` 저장
  - `teams/{teamId}.latestRootCause` 업데이트

- [x] **알림 발송**
  - Slack 알림 (선택, `SLACK_WEBHOOK_URL` 설정 시)

### 3. 프론트엔드 컴포넌트

**파일**: `src/components/RootCauseCard.tsx`

- [x] **UI 컴포넌트**
  - Root Cause 카드 형태로 표시
  - 요약 (가장 높은 점수의 원인)
  - 원인 목록 (점수, 증거)
  - 오디오 특징 표시 (SNR, RMS, Blocks/min, 길이)
  - 품질 지표 표시 (Score, Coverage, Gaps, Overlaps)

- [x] **스타일링**
  - 빨간색 강조 (문제 원인)
  - 아이콘 사용 (AlertCircle, Mic, Volume2, Gauge)
  - 반응형 디자인 (모바일/데스크톱)

### 4. 대시보드 통합

- [x] **Step42_AIInsightsDashboard.tsx**
  - 리포트별 Root Cause 카드 표시
  - `teams/{teamId}/reports/{reportId}/rootCauses` 컬렉션에서 최근 분석 결과 로드
  - 이상 탐지 알림 배너 다음에 표시

- [x] **TeamInsightsDashboard.tsx**
  - 팀 레벨 최근 Root Cause 표시
  - `teams/{teamId}.latestRootCause` 필드에서 로드
  - 실시간 업데이트 (onSnapshot)

### 5. 배포 및 설정

- [x] **배포 스크립트**: `scripts/deploy_step47.sh`
- [x] **문서**: `Step47_RootCause_Analysis.md`
- [x] **Functions export**: `functions/src/index.ts`

## 📊 데이터 흐름 검증

```
1. qualityReports 문서 생성
   ↓
2. Functions rootcauseAnalyzer 트리거
   ↓
3. 리포트 메타데이터 로드 (audioUrl, keywords, content)
   ↓
4. Cloud Run audio-features 호출
   ├─ 오디오 다운로드
   ├─ librosa 분석
   └─ 특징 반환 (SNR, RMS, ZCR, Spectral Centroid, Blocks/min)
   ↓
5. 텍스트 키워드 통계 계산
   ├─ 최근 N=20개 품질 리포트 분석
   └─ 키워드 빈도 측정
   ↓
6. 멀티모달 상관 분석
   ├─ 규칙 기반 원인 추정
   ├─ 점수 계산
   └─ 상위 3개 선택
   ↓
7. Root Cause 카드 저장
   ├─ teams/{teamId}/reports/{reportId}/rootCauses/{ts}
   ├─ teams/{teamId}.latestRootCause
   └─ Slack 알림 (선택)
   ↓
8. 대시보드 표시
   ├─ Step42_AIInsightsDashboard (리포트별)
   └─ TeamInsightsDashboard (팀 레벨)
```

## 🔍 주요 기능 확인

### 오디오 특징 추출

- ✅ SNR 계산: 신호 에너지 대비 저에너지 프레임(노이즈) 추정
- ✅ RMS 계산: 프레임별 RMS 평균
- ✅ ZCR 계산: Zero Crossing Rate 평균
- ✅ Spectral Centroid: 스펙트럼 중심 주파수
- ✅ Speech Blocks/min: 유성/무성 전이로 발화 블록 수 추정

### Root Cause 추정 규칙

- ✅ 노이즈/마이크 문제: `SNR < 12 dB` → 점수: `(12 - SNR) / 10`
- ✅ 발화 속도 과다: `blocks/min > 180` → 점수: 0.7
- ✅ 발화 속도 저하: `blocks/min < 60` → 점수: 0.6
- ✅ 키워드 편중: `coverage < 0.92` AND `키워드 빈도 >= 3` → 점수: 0.5
- ✅ 무성 구간 과다: `gaps > 10` → 점수: 0.6
- ✅ 타임스탬프 중첩: `overlaps > 8` → 점수: 0.6

### 결과 정렬 및 선택

- ✅ 점수 내림차순 정렬
- ✅ 상위 3개만 선택
- ✅ 요약 생성: `{top[0].label} 가능성 높음`

## 🎨 UI 표시 확인

### RootCauseCard 컴포넌트

- ✅ 요약 표시 (가장 높은 점수의 원인)
- ✅ 원인 목록 (점수 배지, 증거)
- ✅ 오디오 특징 (SNR, RMS, Blocks/min, 길이)
- ✅ 품질 지표 (Score, Coverage, Gaps, Overlaps)
- ✅ 생성 시간 표시

### 대시보드 통합

- ✅ Step42_AIInsightsDashboard: 리포트별 Root Cause 카드
- ✅ TeamInsightsDashboard: 팀 레벨 최근 Root Cause
- ✅ 실시간 업데이트 (Firestore onSnapshot)

## 🐛 알려진 제한사항

### 오디오 분석

- 타임아웃: 기본 60초 (긴 오디오는 Cloud Run 타임아웃 증가 필요)
- 오디오 URL 접근: 공개 URL 또는 Signed URL 필요
- FFmpeg 의존성: Docker 이미지에 포함

### Root Cause 추정

- 규칙 기반: 머신러닝 기반 예측은 향후 구현 (Step 48)
- 임계값: 초기값 사용, 운영 데이터 기반 조정 필요
- 키워드 사전: 팀/도메인별 커스터마이징 필요

## 📋 배포 체크리스트

### Cloud Run

- [ ] Docker 이미지 빌드 완료
- [ ] Cloud Run 서비스 배포 완료
- [ ] 헬스 체크 통과 (`/health`)
- [ ] 테스트 오디오 분석 성공

### Functions

- [ ] 환경 변수 설정 (`AUDIO_FEATURES_URL`)
- [ ] Functions 배포 완료
- [ ] 트리거 활성화 확인
- [ ] 로그 확인 (에러 없음)

### 프론트엔드

- [ ] RootCauseCard 컴포넌트 표시 확인
- [ ] 대시보드 통합 확인
- [ ] 실시간 업데이트 확인

## ✅ 최종 확인

모든 구현이 완료되었으며, 배포 준비가 완료되었습니다.

### 구현 완료 항목

- ✅ Cloud Run 서비스 (Python, librosa): `/analyze` 엔드포인트
- ✅ Functions 트리거: `rootcauseAnalyzer` - 텍스트 키워드 + 오디오 특성 결합 분석
- ✅ Root Cause 추정: 상위 3개 원인 추정 및 저장
- ✅ RootCauseCard.tsx: 대시보드에 원인/증거/신호값 표시
- ✅ 대시보드 통합: Step42, TeamInsightsDashboard

### 다음 단계

1. Cloud Run 서비스 배포
2. Functions 환경 변수 설정 및 배포
3. 테스트: qualityReports 문서 생성 후 Root Cause 카드 확인
4. 튜닝: 임계값 조정 및 키워드 사전 관리

