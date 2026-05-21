# 🧪 QR 로그인 자동 완화 실험 분석 가이드

## 🎯 목적

자동 완화 플래그가 실제로 효과가 있었는지 Before/After 비교 분석하여, 영구 적용 후보를 자동으로 제안합니다.

---

## 📊 데이터 모델 (Firestore)

### 1️⃣ 실험 메타데이터

```
experiments/{experimentId} {
  flag: "smsUXVariant_v2" | "extendedExpire" | "mobileUXBoost",
  startedAt: Timestamp,
  endedAt: Timestamp | null,
  ttlMinutes: number,
  triggerReason: string, // 어떤 알림에서 시작됐는지
  status: "running" | "completed" | "invalid",
}
```

### 2️⃣ 실험 결과

```
experimentResults/{experimentId} {
  experimentId: string,
  flag: string,
  before: {
    successRate: number,
    smsFailRate: number,
    avgDuration: number,
    expiredRate: number,
    sampleSize: number,
  },
  after: {
    successRate: number,
    smsFailRate: number,
    avgDuration: number,
    expiredRate: number,
    sampleSize: number,
  },
  delta: {
    successRate: number, // After - Before
    smsFailRate: number,
    avgDuration: number,
    expiredRate: number,
  },
  verdict: "positive" | "neutral" | "negative",
  confidence: number, // 0~1 (샘플 크기 기반)
  analyzedAt: Timestamp,
}
```

---

## 🔄 실험 플로우

### 1. 실험 시작 (자동 완화 플래그 적용 시)

```
Critical 알림 발생
  ↓
자동 완화 플래그 적용
  ↓
실험 생성 (experiments 컬렉션)
```

### 2. 실험 진행 (TTL 기간)

- Before: 플래그 적용 전 30분 통계 수집
- After: 플래그 적용 후 30분 통계 수집

### 3. 실험 종료 (TTL 만료 후)

```
TTL 만료 감지 (10분마다 체크)
  ↓
Before/After 통계 비교
  ↓
판정 (positive/neutral/negative)
  ↓
실험 결과 저장 (experimentResults)
  ↓
Slack 리포트 전송
```

---

## 📊 판정 기준

### Positive (영구 적용 후보)
- 성공률 +3% 이상
- 또는 SMS 실패율 -2% 이상
- 또는 만료율 -2% 이상

### Negative (자동 완화 비활성 유지)
- 성공률 -3% 이상

### Neutral (효과 불명확)
- 그 외 모든 경우

---

## 📊 Slack 실험 결과 리포트 예시

### ✅ Positive 예시

```
🧪 ✅ *QR 로그인 자동 완화 실험 결과* (Positive)

플래그: SMS UX Variant v2
기간: 142건 (Before: 71건, After: 71건)

변화:
- 성공률: +4.2% ✅
- SMS 실패율: -3.1% ✅
- 평균 로그인 시간: -8초 ✅
- 세션 만료율: +0.5% ➖

신뢰도: 71%

📌 판정:
→ 영구 적용 후보로 추천
```

### ❌ Negative 예시

```
🧪 ❌ *QR 로그인 자동 완화 실험 결과* (Negative)

플래그: 모바일 UX Boost
기간: 45건 (Before: 22건, After: 23건)

변화:
- 성공률: -2.8% ❌
- SMS 실패율: +1.2% ❌
- 평균 로그인 시간: +5초 ❌
- 세션 만료율: +1.5% ❌

신뢰도: 22%

📌 판정:
→ 자동 완화 비활성 유지
```

### ➖ Neutral 예시

```
🧪 ➖ *QR 로그인 자동 완화 실험 결과* (Neutral)

플래그: QR 만료 시간 +60초
기간: 30건 (Before: 15건, After: 15건)

변화:
- 성공률: +0.5% ➖
- SMS 실패율: -0.3% ➖
- 평균 로그인 시간: +2초 ➖
- 세션 만료율: -1.2% ➖

신뢰도: 15%

📌 판정:
→ 효과 불명확 (추가 데이터 필요)
```

---

## 🚀 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:analyzeQRLoginExperiments
firebase deploy --only firestore:rules
```

---

## ✅ 완료 상태

| 항목 | 상태 |
|------|------|
| 실험 메타데이터 구조 | ✅ 완료 |
| 실험 결과 구조 | ✅ 완료 |
| 실험 생성 (자동 완화 시) | ✅ 완료 |
| Before/After 통계 집계 | ✅ 완료 |
| 판정 로직 | ✅ 완료 |
| 실험 분석 스케줄 함수 | ✅ 완료 |
| Slack 실험 결과 리포트 | ✅ 완료 |
| Firestore Rules | ✅ 완료 |
| 린터 오류 | ✅ 없음 |

---

## 🏁 전체 시스템 레벨 (현재)

| 단계 | 상태 |
|------|------|
| 감지 | ✅ 완료 |
| 판단 | ✅ 완료 |
| 추천 | ✅ 완료 |
| 자동 완화 | ✅ 완료 |
| **효과 검증** | ✅ **완료** |
| 영구 개선 제안 | 🔜 (다음 단계) |

---

## 🔜 다음 단계 (선택)

### 실험 결과 → 영구 설정 반영 자동 제안

- Positive 실험 결과를 기반으로 영구 설정 제안
- 관리자 승인 후 영구 적용
- 또는 자동 PR 생성

원하면 바로 이어서 진행 가능합니다.

---

**이제 시스템은 스스로 효과를 증명하는 단계까지 완성되었습니다.** ✅
