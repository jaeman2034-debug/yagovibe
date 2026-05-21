# 📊 QR 로그인 기준선 튜닝 사용 가이드

## 🎯 목적

실제 운영 데이터를 기반으로 알림 임계치를 자동으로 계산하고 적용하는 도구입니다.

---

## 📋 사용 절차

### 1단계: 데이터 수집 (24~48시간)

알림 시스템이 배포된 후 최소 24시간, 권장 48시간 동안 실제 트래픽을 수집합니다.

**확인 방법:**
- 대시보드: `/admin/qr-login`
- Firestore: `eventLogs` 및 `qrLoginLogs` 컬렉션

---

### 2단계: 기준선 계산 (Callable Function 호출)

#### 방법 1: Firebase Console에서 호출

1. [Firebase Console](https://console.firebase.google.com) → Functions
2. `getQRLoginTuningResult` 선택
3. "테스트" 탭에서 실행:
   ```json
   {
     "hoursBack": 48,
     "peakHours": [12, 13, 14, 18, 19, 20, 21]
   }
   ```

#### 방법 2: 클라이언트 코드에서 호출

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const getTuningResult = httpsCallable(functions, "getQRLoginTuningResult");

const result = await getTuningResult({
  hoursBack: 48,
  peakHours: [12, 13, 14, 18, 19, 20, 21],
});

console.log("추천 임계치:", result.data);
```

#### 방법 3: cURL로 호출

```bash
curl -X POST \
  https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/getQRLoginTuningResult \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -d '{
    "data": {
      "hoursBack": 48,
      "peakHours": [12, 13, 14, 18, 19, 20, 21]
    }
  }'
```

---

### 3단계: 결과 확인

응답 예시:

```json
{
  "success": true,
  "data": {
    "successRate": {
      "mean": 95.2,
      "min": 88.5,
      "max": 98.1,
      "stdDev": 2.3,
      "p50": 95.5,
      "recommended": 90.6  // 평균 - 2σ
    },
    "smsFailureRate": {
      "mean": 2.1,
      "max": 4.5,
      "stdDev": 1.2,
      "recommended": 4.5  // 평균 + 2σ
    },
    "loginTime": {
      "mean": 35,
      "p50": 32,
      "p95": 55,
      "p99": 75,
      "recommended": 55  // P95
    },
    "expirationRate": {
      "mean": 5.2,
      "max": 8.1,
      "stdDev": 1.5,
      "recommended": 8.2  // 평균 + 2σ
    },
    "timeBased": {
      "peak": {
        "hours": [12, 13, 14, 18, 19, 20, 21],
        "successRate": 93.5,
        "smsFailureRate": 3.2,
        "loginTime": 42,
        "expirationRate": 7.8
      },
      "offPeak": {
        "successRate": 97.1,
        "smsFailureRate": 1.2,
        "loginTime": 28,
        "expirationRate": 3.5
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 4단계: 임계치 코드에 반영

`functions/src/monitoring/qrLoginAlert.ts` 수정:

```typescript
/**
 * 임계치 설정 (실제 데이터 기반 튜닝)
 * 
 * 튜닝 날짜: 2024-01-15
 * 데이터 기간: 최근 48시간
 * 계산 함수: getQRLoginTuningResult
 */
const THRESHOLDS = {
  default: {
    successRate: 91,      // recommended: 90.6 → 91로 반올림
    smsFailureRate: 5,   // recommended: 4.5 → 5로 반올림
    avgLoginTime: 55,    // recommended: 55 (P95)
    expirationRate: 8,   // recommended: 8.2 → 8로 반올림
  },
  peak: {
    successRate: 88,     // peak.successRate - 5% = 93.5 - 5 = 88.5 → 88
    smsFailureRate: 4,   // peak.smsFailureRate + 1% = 3.2 + 1 = 4.2 → 4
    avgLoginTime: 50,    // peak.loginTime + 20% = 42 * 1.2 = 50.4 → 50
    expirationRate: 10,  // peak.expirationRate + 2% = 7.8 + 2 = 9.8 → 10
  },
  offPeak: {
    successRate: 95,     // offPeak.successRate - 2% = 97.1 - 2 = 95.1 → 95
    smsFailureRate: 2,   // offPeak.smsFailureRate + 1% = 1.2 + 1 = 2.2 → 2
    avgLoginTime: 35,    // offPeak.loginTime + 25% = 28 * 1.25 = 35
    expirationRate: 5,   // offPeak.expirationRate + 1.5% = 3.5 + 1.5 = 5
  },
};
```

---

### 5단계: 배포 및 검증

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:qrLoginAlert5min,functions:qrLoginAlert10min
```

배포 후 24시간 모니터링:
- [ ] 알림 빈도 확인 (목표: 하루 0~2회)
- [ ] 오탐 발생 여부 확인
- [ ] 실제 문제 감지 확인

---

## 🔄 지속적 개선

### 주기적 재튜닝 (월 1회 권장)

1. 최근 1주일 데이터로 재계산
2. 임계치 재조정
3. 배포 및 검증

### 자동 튜닝 (고급, 선택)

- 주기적으로 `getQRLoginTuningResult` 호출
- 임계치 자동 업데이트 제안
- 관리자 승인 후 적용

---

## 📊 튜닝 결과 해석

### 성공률 (successRate)

- **mean**: 평균 성공률
- **recommended**: 평균 - 2σ (정상 범위 하한선)
- **해석**: 성공률이 recommended 미만이면 알림

### SMS 실패율 (smsFailureRate)

- **mean**: 평균 SMS 실패율
- **recommended**: 평균 + 2σ (정상 범위 상한선)
- **해석**: SMS 실패율이 recommended 초과하면 알림

### 로그인 시간 (loginTime)

- **p95**: 95%의 사용자가 이 시간 내에 로그인
- **recommended**: P95 (대부분의 사용자 기준)
- **해석**: 평균 로그인 시간이 recommended 초과하면 알림

### 만료율 (expirationRate)

- **mean**: 평균 세션 만료율
- **recommended**: 평균 + 2σ (정상 범위 상한선)
- **해석**: 만료율이 recommended 초과하면 알림

---

## ✅ 체크리스트

- [ ] 24~48시간 데이터 수집 완료
- [ ] `getQRLoginTuningResult` 호출하여 기준선 계산
- [ ] 계산된 값을 `THRESHOLDS`에 반영
- [ ] 시간대별 분리 적용 (피크/오프피크)
- [ ] 배포 및 검증
- [ ] 24시간 모니터링
- [ ] 최종 조정

---

## 🐛 문제 해결

### 기준선 계산 실패

- Firestore 쿼리 오류 확인
- `eventLogs` 및 `qrLoginLogs` 컬렉션에 데이터가 있는지 확인
- Functions 로그 확인: `firebase functions:log --only getQRLoginTuningResult`

### 추천 임계치가 비현실적

- 데이터 기간이 너무 짧을 수 있음 (최소 24시간 권장)
- 피크 시간대 설정이 잘못되었을 수 있음
- 수동으로 조정 필요

---

## 📞 참고

- 튜닝 가이드: `QR_LOGIN_ALERT_TUNING_GUIDE.md`
- 배포 체크리스트: `QR_LOGIN_DEPLOYMENT_CHECKLIST.md`
- 대시보드: `/admin/qr-login`
