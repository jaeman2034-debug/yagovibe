# 🛡️ 프로덕션 안전 테스트 + 롤백 가이드

## 핵심 원칙 (3가지)

1. **데이터는 덮어쓰지 말고 "추가 기록"으로 남긴다**
2. **원복은 Firestore 콘솔 클릭 2번으로 끝나야 한다**
3. **Functions 코드는 "되돌릴 필요 없는 구조"로 간다**

---

## 1️⃣ 테스트 전: "되돌릴 수 있는 상태" 만들기 (2분)

### ✅ A. 테스트 대상 회원 1명만 정한다

- 예: **김상욱** ← 이미 사용 중 OK
- ⚠️ **한 명만 테스트** (여러 명 ❌)

### ✅ B. 현재 상태 스냅샷을 손으로 기록

**Firestore 콘솔에서 확인:**

```
teams/{teamId}/members/{memberId}
```

**확인할 것:**
- `status` (예: "active")
- `unpaidMonths` (예: 1)
- `monthlyFee` (예: 20000)

**📸 이 값들만 기억해두면 롤백 끝** (캡처 떠도 되고, 안 떠도 됨)

---

## 2️⃣ 프로덕션에서 테스트 실행

### 화면에서
1. `[납부 완료 (수동)]` → `[확인]` 클릭

### 정상이라면
- ❌ internal 에러 없음
- ✅ 모달 닫힘
- ✅ 행이 완납 ✔ 표시
- ✅ 버튼 사라짐

---

## 3️⃣ 테스트 직후 Firestore에 생기는 것 (중요)

### ✅ ① fee 기록 (핵심)

**경로:**
```
teams/{teamId}/fees/{YYYY-MM}/items/{memberId}
```

**생성되는 데이터:**
```json
{
  "teamId": "...",
  "memberId": "...",
  "memberName": "김상욱",
  "month": "2025-12",
  "amount": 20000,
  "paid": true,
  "paidAt": "2025-12-17T...",
  "processedBy": "ownerUid",
  "createdBy": "ownerUid",
  "updatedBy": "ownerUid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### ✅ ② audit 로그 (추적용)

**경로:**
```
auditLogs/{autoId}
```

**생성되는 데이터:**
```json
{
  "type": "fee_payment_manual",
  "teamId": "...",
  "memberId": "...",
  "memberName": "김상욱",
  "month": "2025-12",
  "amount": 20000,
  "processedBy": "ownerUid",
  "method": "manual",
  "feeDocumentPath": "teams/{teamId}/fees/{YYYY-MM}/items/{memberId}",
  "rollbackable": true,
  "rollbackPath": "teams/{teamId}/fees/{YYYY-MM}/items/{memberId}",
  "createdAt": "...",
  "uid": "ownerUid"
}
```

### ✅ ③ member 상태 자동 업데이트

**경로:**
```
teams/{teamId}/members/{memberId}
```

**변경되는 필드:**
- `unpaidMonths`: 자동 재계산 (예: 1 → 0)
- `lastCalculatedAt`: 타임스탬프 업데이트

---

## 4️⃣ 🚨 롤백 방법 (진짜 중요)

### 🔁 롤백은 "코드 아님 / 콘솔 클릭"이다

### ✅ STEP 1. fee 기록 삭제

**Firestore 콘솔에서:**

1. `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}` 문서 열기
2. **삭제** 버튼 클릭
3. 확인

**또는 audit 로그에서 찾기:**

1. `auditLogs` 컬렉션 열기
2. `type: "fee_payment_manual"` 필터
3. `rollbackPath` 필드 확인
4. 해당 경로의 문서 삭제

### ✅ STEP 2. member 상태 원복 (선택사항)

**자동 재계산이 필요하면:**

1. `teams/{teamId}/members/{memberId}` 문서 열기
2. 아까 적어둔 값으로:
   - `unpaidMonths`: 원래 값으로 수정 (예: 1)
   - `lastCalculatedAt`: 삭제 또는 원래 값으로
3. **저장**

**또는 Functions 재계산 트리거 (권장):**

- Functions에서 `recalculateUnpaidMonths` 함수를 수동 실행
- 또는 다음 달 fee 조회 시 자동 재계산됨

### ✅ STEP 3. audit 로그는 그대로 둠

- audit 로그는 **삭제하지 않음** (감사 추적용)
- `rollbackable: true` 표시만 있으면 됨

### 🎯 결과

1. 브라우저 새로고침
2. 다시 미납 상태로 표시
3. 버튼 복구
4. 테스트 흔적 0 (audit 로그 제외)

---

## 5️⃣ "이 방식이 왜 안전하냐?"

### ❌ 안 하는 것
- ❌ 기존 데이터 overwrite
- ❌ status 강제 변경
- ❌ batch update 다수 회원

### ✅ 하는 것
- ✔ 테스트 1건만
- ✔ 기록 기반 (fee 문서)
- ✔ 언제든 삭제 가능
- ✔ 로그도 남음 (auditLogs)

### 👉 실서비스에서도 가장 권장되는 운영 방식

---

## 6️⃣ 추가로 더 안전하게 하고 싶다면 (선택)

### 🔐 테스트 전용 표시

**Functions 코드에 이미 포함:**
- `method: "manual"` 필드
- `rollbackable: true` 플래그

**추가 가능한 옵션:**
- `isTest: true` (테스트 전용 표시)
- admin UID가 특정 값일 때만 test flag
- `auditLogs`에 `"manual_test": true` 추가

---

## 7️⃣ 롤백 체크리스트 (빠른 참조)

### 테스트 전
- [ ] 테스트 대상 회원 1명 선택
- [ ] 현재 상태 기록 (`unpaidMonths`, `status` 등)

### 테스트 후
- [ ] fee 문서 생성 확인: `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}`
- [ ] audit 로그 생성 확인: `auditLogs` 컬렉션
- [ ] UI에서 완납 표시 확인

### 롤백 시
- [ ] fee 문서 삭제: `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}`
- [ ] member 상태 원복 (선택): `unpaidMonths` 수정
- [ ] 브라우저 새로고침 후 확인

---

## 한 줄 결론

> **프로덕션 테스트는 위험한 게 아니라, "롤백 설계 없이 하는 테스트"가 위험한 거다. 지금 네 구조는 안전하다.**

---

## 다음 단계

1. ✅ 수동 완납 audit 로그 구조 정리 ← **완료**
2. ✅ "실수로 눌러도 되돌릴 수 있는" UI 개선 (선택사항)
3. ✅ FREE / PRO 정책 최종 확정

