# 🔥 G-④ 관측 데이터 리뷰 체크리스트 (2주 후)

## 📊 데이터 수집 기간
- **시작일**: [배포일 기록]
- **종료일**: [배포일 + 14일]
- **최소 샘플 수**: 100건 이상 권장

---

## 🎯 핵심 지표 분석 (판결 기준)

### 1️⃣ 요약 체류 시간 (summary_view_duration)

#### 데이터 추출
```javascript
// 브라우저 콘솔에서
const events = JSON.parse(localStorage.getItem('ai_observation_events') || '[]');
const durationEvents = events.filter(e => e.metric === 'summary_view_duration');
const avgDuration = durationEvents.reduce((sum, e) => sum + e.durationMs, 0) / durationEvents.length / 1000; // 초
console.log('평균 체류 시간:', avgDuration, '초');
```

#### 판결 기준
- ✅ **평균 < 3초** → G-④-③ (접기/펼치기) 진행
- ⏸️ **평균 ≥ 3초** → 현재 상태 유지

#### 추가 분석
- 신뢰도별 체류 시간 (HIGH/MEDIUM/LOW/UNAVAILABLE)
- 환경별 체류 시간 (INAPP_BROWSER/MOBILE/DESKTOP)
- 이탈 이유 분포 (scroll_away vs unmount)

---

### 2️⃣ 재시도 클릭률 (retry_click_rate)

#### 데이터 추출
```javascript
const retryEvents = events.filter(e => e.metric === 'retry_click_rate');
const totalRetries = retryEvents.length;

// 신뢰도별 재시도 분류
const lowRetries = retryEvents.filter(e => e.confidenceLevel === 'LOW').length;
const unavailableRetries = retryEvents.filter(e => e.confidenceLevel === 'UNAVAILABLE').length;

// 전체 LOW/UNAVAILABLE 세션 수 (AIAnalysisLog에서 계산)
// confidence_distribution 데이터와 비교 필요
```

#### 판결 기준
- ✅ **LOW 재시도율 < 20%** → 톤/가이드 문구 조정 검토
- ✅ **UNAVAILABLE 재시도율 < 30%** → 외부 브라우저 유도 강화 검토
- ⏸️ **기준 이상** → 현재 상태 유지

---

### 3️⃣ 신뢰도 분포 (confidence_distribution)

#### 데이터 추출
```javascript
// AIAnalysisLog에서 계산
const logs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]');

// 환경 × 신뢰도 매트릭스
const distribution = {
  INAPP_BROWSER: { HIGH: 0, MEDIUM: 0, LOW: 0, UNAVAILABLE: 0 },
  EXTERNAL_BROWSER: { HIGH: 0, MEDIUM: 0, LOW: 0, UNAVAILABLE: 0 },
  MOBILE: { HIGH: 0, MEDIUM: 0, LOW: 0, UNAVAILABLE: 0 },
  DESKTOP: { HIGH: 0, MEDIUM: 0, LOW: 0, UNAVAILABLE: 0 },
};

logs.forEach(log => {
  const env = log.meta.environment || (log.env.isKakaoInApp ? 'INAPP_BROWSER' : (log.env.isMobile ? 'MOBILE' : 'DESKTOP'));
  // confidenceLevel은 별도 계산 필요 (logComplete에 저장되지 않음)
});
```

#### 판결 기준
- ✅ **UNAVAILABLE > 30%** → 외부 브라우저 유도 강화
- ⚠️ **인앱 브라우저 UNAVAILABLE 비율이 외부의 2배 이상** → 즉시 대응

---

### 4️⃣ 외부 브라우저 전환 ROI (B단계 연계)

#### 데이터 추출
- `ai_analysis_logs`에서 `flowId`가 있는 세션 추적
- 인앱 → 외부 전환 후 성공률 비교

#### 판결 기준
- ✅ **외부 전환 ROI ≥ +10%p** → E/F (정책 자동화/A·B) 착수
- ⏸️ **+10%p 미만** → 현재 상태 유지

---

## 📋 리뷰 실행 체크리스트

### 준비 단계
- [ ] 로컬 스토리지 데이터 백업 (`localStorage` 전체 export)
- [ ] 최소 샘플 수 확인 (100건 이상)
- [ ] 데이터 수집 기간 확인 (14일 이상)

### 분석 단계
- [ ] 요약 체류 시간 평균 계산
- [ ] 신뢰도별 체류 시간 분포 확인
- [ ] 재시도 클릭 이벤트 수 집계
- [ ] 신뢰도 분포 매트릭스 생성
- [ ] 환경별 비교 분석

### 판결 단계
- [ ] 요약 체류 < 3초 → G-④-③ 진행 결정
- [ ] LOW 재시도율 < 20% → 톤 정책 수정 결정
- [ ] UNAVAILABLE > 30% → 외부 브라우저 유도 강화 결정
- [ ] 외부 전환 ROI ≥ +10%p → E/F 착수 결정

### 문서화
- [ ] 분석 결과 요약 문서 작성
- [ ] 판결 근거 기록
- [ ] 다음 액션 아이템 정의

---

## 🔧 데이터 추출 스크립트 (편의용)

```javascript
// 브라우저 콘솔에서 실행
(function() {
  const events = JSON.parse(localStorage.getItem('ai_observation_events') || '[]');
  const logs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]');
  
  console.log('=== G-④ 관측 데이터 요약 ===');
  console.log('관측 이벤트 수:', events.length);
  console.log('AI 분석 로그 수:', logs.length);
  
  // 요약 체류 시간
  const durationEvents = events.filter(e => e.metric === 'summary_view_duration');
  if (durationEvents.length > 0) {
    const avgDuration = durationEvents.reduce((sum, e) => sum + e.durationMs, 0) / durationEvents.length / 1000;
    console.log('\n📊 요약 체류 시간:');
    console.log('  평균:', avgDuration.toFixed(2), '초');
    console.log('  샘플 수:', durationEvents.length);
  }
  
  // 재시도 클릭
  const retryEvents = events.filter(e => e.metric === 'retry_click_rate');
  console.log('\n🔄 재시도 클릭:');
  console.log('  총 재시도 수:', retryEvents.length);
  console.log('  LOW:', retryEvents.filter(e => e.confidenceLevel === 'LOW').length);
  console.log('  UNAVAILABLE:', retryEvents.filter(e => e.confidenceLevel === 'UNAVAILABLE').length);
  
  // 신뢰도 분포 (간략)
  const successLogs = logs.filter(l => l.result.success);
  console.log('\n✅ 성공률:');
  console.log('  전체:', logs.length);
  console.log('  성공:', successLogs.length);
  console.log('  성공률:', ((successLogs.length / logs.length) * 100).toFixed(1) + '%');
})();
```

---

## 🎯 다음 액션 결정 매트릭스

| 지표 | 조건 | 액션 |
|------|------|------|
| 요약 체류 | < 3초 | G-④-③ 진행 |
| LOW 재시도율 | < 20% | 톤 정책 수정 |
| UNAVAILABLE | > 30% | 외부 브라우저 유도 강화 |
| 외부 전환 ROI | ≥ +10%p | E/F 착수 |

**모든 조건 미충족 시**: 현재 상태 유지 (G-④ 완료 상태 고수)

---

## 📝 참고사항

- 모든 판결은 **숫자 기반**으로만 진행
- 회의 없이 데이터가 결정하도록 설계됨
- 2주 관측 기간 중 코드 변경 금지 (데이터 오염 방지)

