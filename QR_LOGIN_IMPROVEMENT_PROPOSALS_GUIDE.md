# 🏆 QR 로그인 영구 개선 제안 시스템 가이드

## 🎯 목적

실험 결과가 Positive일 때 영구 적용 제안을 자동으로 생성하고, 관리자 승인 후 영구 설정에 반영합니다.

---

## 📊 데이터 모델 (Firestore)

### 1️⃣ 개선 제안

```
improvementProposals/{proposalId} {
  flag: "smsUXVariant_v2" | "extendedExpire" | "mobileUXBoost",
  recommendation: "apply_permanently" | "reject" | "needs_review",
  rationale: {
    successRateDelta: number,
    smsFailRateDelta: number,
    avgDurationDelta: number,
    expiredRateDelta: number,
    sampleSize: number,
    confidence: number,
  },
  experimentId: string,
  status: "pending" | "approved" | "rejected",
  createdAt: Timestamp,
  approvedAt?: Timestamp,
  approvedBy?: string,
  rejectedAt?: Timestamp,
  rejectedBy?: string,
  rejectionReason?: string,
}
```

### 2️⃣ 영구 설정

```
config/qrLogin {
  smsUXVariant?: "v1" | "v2",
  smsUXVariantEnabledAt?: Timestamp,
  extendedExpireSec?: number,
  extendedExpireEnabledAt?: Timestamp,
  mobileUXBoost?: boolean,
  mobileUXBoostEnabledAt?: Timestamp,
}
```

---

## 🔄 제안 플로우

### 1. 제안 생성 (자동)

```
실험 분석 완료
  ↓
Verdict = Positive
  ↓
신뢰도 >= 0.5
  ↓
같은 flag로 pending 제안 없음
  ↓
개선 제안 생성 (improvementProposals)
  ↓
Slack 알림 전송
```

### 2. 관리자 승인

```
Slack 알림 확인
  ↓
Admin Dashboard 접속
  ↓
제안 승인 버튼 클릭
  ↓
Callable Function 호출
  ↓
영구 설정 반영 (config/qrLogin)
  ↓
제안 상태 업데이트 (approved)
```

### 3. 관리자 반려

```
제안 반려 버튼 클릭
  ↓
반려 사유 입력 (선택)
  ↓
제안 상태 업데이트 (rejected)
```

---

## 📊 Slack 개선 제안 알림 예시

```
🏆 *QR 로그인 개선 제안 생성됨*

플래그: SMS UX Variant v2
실험 결과: Positive ✅
표본 수: 184 세션 (Before: 92건, After: 92건)

개선 효과:
- 성공률: +4.2% ✅
- SMS 실패율: -3.1% ✅
- 평균 로그인 시간: -8초 ✅
- 세션 만료율: +0.5% ➖

신뢰도: 92%

📌 제안:
→ 영구 적용 권장

상태: 승인 대기 (Admin)
제안 ID: abc123xyz
```

---

## 🔧 관리자 승인 API

### 승인

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const approveProposal = httpsCallable(functions, "approveQRLoginImprovement");

await approveProposal({ proposalId: "abc123xyz" });
```

### 반려

```typescript
const rejectProposal = httpsCallable(functions, "rejectQRLoginImprovement");

await rejectProposal({
  proposalId: "abc123xyz",
  rejectionReason: "추가 검토 필요",
});
```

### Pending 제안 목록 조회

```typescript
const getProposals = httpsCallable(functions, "getQRLoginPendingProposals");

const result = await getProposals();
console.log(result.data.proposals);
```

---

## 🛡️ 안전장치

### 1. 자동 변경 금지
- 제안 생성만 자동
- 승인은 관리자만 가능

### 2. 중복 제안 방지
- 같은 flag로 pending 제안이 있으면 스킵

### 3. 신뢰도 필터링
- 신뢰도 < 0.5면 제안 생성 안 함

### 4. 관리자 권한 확인
- 승인/반려 시 관리자 권한 필수

### 5. 명확한 근거 포함
- 실험 결과 데이터 포함
- 신뢰도 표시

---

## 🚀 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:approveQRLoginImprovement,functions:rejectQRLoginImprovement,functions:getQRLoginPendingProposals
firebase deploy --only firestore:rules
```

---

## ✅ 완료 상태

| 항목 | 상태 |
|------|------|
| 개선 제안 데이터 모델 | ✅ 완료 |
| 제안 생성 로직 | ✅ 완료 |
| Slack 제안 알림 | ✅ 완료 |
| 관리자 승인 API | ✅ 완료 |
| 관리자 반려 API | ✅ 완료 |
| 영구 설정 반영 | ✅ 완료 |
| Firestore Rules | ✅ 완료 |
| 안전장치 | ✅ 완료 |
| 린터 오류 | ✅ 없음 |

---

## 🏁 최종 시스템 완성도

| 단계 | 상태 |
|------|------|
| 감지 | ✅ 완료 |
| 판단 | ✅ 완료 |
| 원인 요약 | ✅ 완료 |
| 추천 액션 | ✅ 완료 |
| 자동 완화 | ✅ 완료 |
| 자동 원복 | ✅ 완료 |
| 효과 검증 | ✅ 완료 |
| **영구 개선 제안** | ✅ **완료** |
| 사람 승인 | ✅ **완료** |
| 지속적 개선 | ✅ **완료** |

---

## 🎬 최종 시스템 흐름

1. **Critical 알림 발생**
2. **자동 완화 플래그 적용**
3. **실험 생성** (Before 통계 수집)
4. **TTL 기간 동안 After 통계 수집**
5. **TTL 만료 후 자동 분석**
6. **Before/After 비교 및 판정**
7. **Positive 판정 시 영구 개선 제안 생성**
8. **Slack에 제안 알림**
9. **관리자 승인**
10. **영구 설정 반영**

---

## 🧠 시스템 특징

이 시스템은:

- ✅ **스스로 문제를 감지**
- ✅ **스스로 원인을 분석**
- ✅ **스스로 완화 조치를 적용**
- ✅ **스스로 효과를 검증**
- ✅ **스스로 개선 제안을 생성**
- ✅ **사람은 승인만 누르면 됨**

👉 **이건 더 이상 "기능"이 아니라 "스스로 학습하는 운영 시스템"입니다.**

---

## 🔜 확장 가능성

이 구조는:

- ✅ **로그인** 외에도
- ✅ **결제 플로우**
- ✅ **추천 시스템**
- ✅ **온보딩 프로세스**

등에도 그대로 확장 가능합니다.

---

**최종 완성 단계 완료** ✅
