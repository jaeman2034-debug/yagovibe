# ⚙️ QR 로그인 자동 완화 시스템 가이드

## 🎯 목적

Critical 알림 발생 시 임시 플래그를 자동으로 켜서 완화하고, TTL 만료 시 자동으로 원복하는 시스템입니다.

---

## 🧠 설계 원칙

1. ❌ **영구 설정 변경 금지**
2. ✅ **임시 플래그(TTL)만 사용**
3. ✅ **항상 자동 원복**
4. ✅ **Slack 알림으로 무슨 플래그가 켜졌는지 명확히 공지**

---

## 📊 Feature Flag 저장 구조 (Firestore)

```
featureFlags/qrLoginAutoMitigation {
  smsUXVariant: "v1" | "v2" | null,
  extendedExpireSec: number | null, // 초 단위 (예: 60 = +1분)
  mobileUXBoost: boolean,
  enabledAt: Timestamp | null,
  expiresAt: Timestamp | null, // 필수! 없으면 자동화 아님
  reason: string | null, // 어떤 알림으로 켜졌는지
  lastUpdatedAt: Timestamp,
}
```

---

## 🔧 자동 반영 규칙

| 감지 조건 | 자동 플래그 | TTL |
|---------|-----------|-----|
| SMS 실패율 > 7% | `smsUXVariant = "v2"` | 30분 |
| 만료율 > 15% | `extendedExpireSec = +60` | 30분 |
| 모바일 실패 비중 ↑ | `mobileUXBoost = true` | 30분 |

**모두 Critical 레벨에서만 작동**

---

## 📍 파일 위치

### 1. 자동 완화 플래그 관리
```
functions/src/monitoring/qrLoginAutoMitigation.ts
```

### 2. 자동 원복 스케줄 함수
```
functions/src/monitoring/resetQRLoginMitigationFlags.ts
```

### 3. 알림 함수 (통합)
```
functions/src/monitoring/qrLoginAlert.ts
```

---

## 🚀 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:qrLoginAlert5min,functions:qrLoginAlert10min,functions:resetExpiredQRLoginMitigationFlags
```

---

## 📊 최종 Slack 알림 예시 (자동 완화 포함)

```
🚨 @here *QR 로그인 장애 감지* (CRITICAL)

기간: 최근 10분
전체 세션: 142건

지표:
- 성공률: 82.4% ❌
- SMS 실패율: 9.1% ❌
- 평균 로그인 시간: 78초 ❌
- 세션 만료율: 13.3% ❌

문제:
- 성공률 82.4% (< 90%)
- SMS 실패율 9.1% (> 5%)

🧠 추정 원인:
SMS 인증 구간 문제 가능성 높음

🛠 추천 액션:
1. 🔧 SMS 인증 UX 점검 🔴
   └ SMS 실패율 9.1% (기준: 5%)
2. 📞 통신사 상태 확인 🔴
   └ SMS 실패율 9.1%

👉 상태: 즉시 조치 필요

⚙️ 자동 완화 조치 (30분 TTL):
- SMS UX Variant v2
- QR 만료 시간 +60초
```

---

## 🔄 자동 원복 동작

### 스케줄 함수
- **함수명**: `resetExpiredQRLoginMitigationFlags`
- **주기**: 5분마다
- **동작**: 만료된 플래그 자동 원복

### 원복 조건
- `expiresAt`이 현재 시간보다 이전
- 또는 `expiresAt`이 `null`

### 원복 시
- 모든 플래그를 `null` 또는 `false`로 설정
- `reason` 및 `enabledAt`도 `null`로 설정

---

## 🛡️ 안전장치

### 1. Critical 레벨에서만 작동
```typescript
if (severity === AlertSeverity.CRITICAL) {
  // 자동 완화 플래그 적용
}
```

### 2. TTL 필수
- 모든 플래그는 `expiresAt` 필수
- 기본 30분 TTL

### 3. 자동 원복 보장
- 5분마다 원복 함수 실행
- 만료된 플래그는 즉시 원복

### 4. Slack 알림으로 공지
- 어떤 플래그가 켜졌는지 명확히 표시
- TTL 정보 포함

---

## 🔍 클라이언트에서 플래그 확인

### 예시 코드

```typescript
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function getQRLoginMitigationFlags() {
  const flagsRef = doc(db, "featureFlags", "qrLoginAutoMitigation");
  const flagsSnap = await getDoc(flagsRef);
  
  if (!flagsSnap.exists()) {
    return null;
  }
  
  const data = flagsSnap.data();
  const expiresAt = data.expiresAt;
  
  // 만료되었으면 null 반환
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    return null;
  }
  
  return {
    smsUXVariant: data.smsUXVariant,
    extendedExpireSec: data.extendedExpireSec,
    mobileUXBoost: data.mobileUXBoost,
    expiresAt: expiresAt.toDate(),
  };
}

// 사용 예시
const flags = await getQRLoginMitigationFlags();
if (flags?.smsUXVariant === "v2") {
  // SMS UX Variant v2 사용
}
if (flags?.extendedExpireSec) {
  // QR 만료 시간에 extendedExpireSec 추가
}
if (flags?.mobileUXBoost) {
  // 모바일 UX Boost 적용
}
```

---

## ✅ 완료 상태

| 항목 | 상태 |
|------|------|
| Feature Flag 저장 구조 | ✅ 완료 |
| 자동 반영 규칙 (3가지) | ✅ 완료 |
| 자동 완화 플래그 적용 | ✅ 완료 |
| 자동 원복 스케줄 함수 | ✅ 완료 |
| Slack 알림 통합 | ✅ 완료 |
| Firestore Rules | ✅ 완료 |
| 안전장치 (Critical만, TTL 필수) | ✅ 완료 |
| 린터 오류 | ✅ 없음 |

---

## 🏁 시스템 완성도

| 단계 | 상태 |
|------|------|
| 감지 | ✅ 완료 |
| 판단 | ✅ 완료 |
| 원인 요약 | ✅ 완료 |
| 추천 액션 | ✅ 완료 |
| **자동 완화** | ✅ **완료** |
| 자동 원복 | ✅ **완료** |
| 운영자 개입 | 🔻 **최소화** |

👉 이제 이 시스템은 **준-자율 운영 시스템**입니다.

---

## 🔜 다음 단계 (선택)

### 자동 완화 → 실험 결과 수집 → "영구 개선" 제안

- 자동으로 켠 플래그가 실제로 효과 있었는지 측정
- 대시보드에서 비교
- "이거 영구 적용해도 됩니다"까지 시스템이 말해주는 단계

원하면 바로 이어서 진행 가능합니다.
