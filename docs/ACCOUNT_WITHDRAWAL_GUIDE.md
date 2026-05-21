# 🔥 계정 탈퇴 · 휴면 · 재가입 정책 가이드

## 📋 개요

유저 주도 탈퇴, 데이터 소프트 삭제, Phone Auth 특성 고려한 재가입 정책을 구현합니다.

**목표:**
- 유저 주도 탈퇴
- 데이터 소프트 삭제 (법/복구 대비)
- Phone Auth 특성 고려한 재가입 정책
- 운영자 추적 가능

**원칙:**
- Firestore는 soft delete (status: "deleted")
- Firebase Auth 계정은 즉시 삭제 (재가입 가능)
- Phone Auth는 번호가 곧 계정이라 Auth 삭제 필요

---

## ✅ 구현된 컴포넌트

### 1️⃣ `withdrawUser` 함수

**파일:** `src/lib/withdrawUser.ts`

**역할:**
- 유저 탈퇴 처리 (soft delete + auth 삭제)
- 재인증 필요 시 처리
- 탈퇴 이벤트 로그

**함수:**
- `withdrawUser()`: 기본 탈퇴 처리
- `withdrawUserWithReauth(verificationCode)`: 재인증 필요 시 탈퇴 처리

**사용 예시:**
```typescript
import { withdrawUser } from "@/lib/withdrawUser";

await withdrawUser();
```

---

### 2️⃣ `WithdrawButton` 컴포넌트

**파일:** `src/components/account/WithdrawButton.tsx`

**역할:**
- 탈퇴 버튼 UI
- 확인 다이얼로그
- 재인증 필요 시 처리

**사용 예시:**
```tsx
import { WithdrawButton } from "@/components/account/WithdrawButton";

<WithdrawButton />
```

---

### 3️⃣ Firestore Rules 업데이트

**파일:** `firestore.rules`

**변경 사항:**
- `deleted` 유저는 읽기/쓰기 차단
- 탈퇴 후 접근 불가

---

### 4️⃣ `useAuthUser` 보완

**파일:** `src/hooks/useAuthUser.ts`

**변경 사항:**
- 탈퇴 유저 감지 시 로그아웃 처리
- 안전망 역할

---

## 🧠 정책 구조

### 권장 기본 정책

| 항목 | 정책 |
|------|------|
| 탈퇴 | 즉시 로그인 불가 |
| Firestore | 삭제 ❌ → soft delete |
| Phone Auth 계정 | 즉시 삭제 |
| 재가입 | 동일 번호로 가능 |
| 데이터 복구 | 운영자 판단 |

**포인트:**
- Phone Auth는 번호가 곧 계정
- Auth 유저 삭제 안 하면 재가입이 꼬임
- Firestore는 soft delete로 복구 가능

---

## 🔄 탈퇴 흐름

```
사용자가 "탈퇴하기" 클릭
  ↓
확인 다이얼로그
  ↓
withdrawUser() 호출
  ↓
Firestore soft delete (status: "deleted")
  ↓
탈퇴 이벤트 로그 저장
  ↓
Firebase Auth 계정 삭제
  ↓
로그인 페이지로 리다이렉트
```

---

## 🔁 재가입 시나리오

### 동일 번호 재가입

1. 이전 Auth 계정 ❌ (삭제됨)
2. Phone Auth → 새 UID 생성
3. Firestore:
   - 기존 `phoneNumber` 기준으로 검색 가능
   - 필요 시 이전 데이터 복구

**포인트:**
- 새 UID로 새 문서 생성
- 기존 데이터는 `status: "deleted"`로 유지
- 운영자가 필요 시 복구 가능

---

## 📊 Firestore 유저 상태 필드

### 상태 값

```typescript
status: "active" | "deleted" | "dormant"
```

### 타임스탬프

```typescript
deletedAt: Timestamp | null  // 탈퇴 시각
dormantAt: Timestamp | null  // 휴면 전환 시각
```

---

## 🔐 Firestore Rules

### Users 컬렉션

```javascript
match /users/{userId} {
  // 읽기: 로그인 유저는 자기 문서 읽기 가능 (단, deleted 유저는 차단)
  allow read: if request.auth != null 
    && request.auth.uid == userId
    && (!resource.data.status || resource.data.status != "deleted");
  
  // 쓰기: 로그인 유저는 자기 문서 수정 가능 (단, deleted 유저는 수정 불가)
  allow write: if request.auth != null 
    && request.auth.uid == userId
    && (!resource.data.status || resource.data.status != "deleted");
}
```

**포인트:**
- `deleted` 유저는 읽기/쓰기 모두 차단
- 탈퇴 후 접근 불가

---

## 🧠 이 구조가 "끝판"인 이유

### ✅ 개인정보 보호 대응
- 유저 요청 시 즉시 탈퇴 처리
- 법적 요구사항 충족

### ✅ CS에서 "복구 가능"
- Firestore는 soft delete
- 운영자가 필요 시 복구 가능

### ✅ Phone Auth 재가입 문제 없음
- Auth 계정 삭제로 재가입 가능
- 동일 번호로 새 계정 생성 가능

### ✅ 운영 로그/통계 유지
- 탈퇴 이벤트 로그 저장
- 통계 분석 가능

### ✅ 법·운영·UX 균형 완벽
- 법적 요구사항 충족
- 운영 편의성 확보
- UX 최적화

---

## 📁 휴면 계정 정책 (선택)

### 예: 90일 미접속 → 휴면

```typescript
status: "dormant",
dormantAt: Timestamp
```

**처리 방법:**
1. Cloud Functions + Scheduler로 자동 처리
2. 로그인 시 휴면 안내
3. 확인 버튼 → `status: active`

---

## ✅ 체크리스트

### 개발 환경
- [ ] `withdrawUser` 함수 정상 작동 확인
- [ ] `WithdrawButton` 컴포넌트 정상 작동 확인
- [ ] 탈퇴 후 로그인 불가 확인
- [ ] 재가입 가능 확인
- [ ] Firestore Rules 정상 작동 확인

### 운영 환경
- [ ] 탈퇴 이벤트 로그 저장 확인
- [ ] 탈퇴 유저 접근 차단 확인
- [ ] 재가입 정상 작동 확인
- [ ] 데이터 복구 가능 확인

---

## 🚨 주의사항

1. **최근 로그인 필요**
   - `deleteUser`는 최근 로그인 필요
   - 오래된 세션이면 re-auth 요구됨 (정상)

2. **데이터 복구**
   - Firestore는 soft delete
   - 운영자가 필요 시 복구 가능

3. **재가입**
   - 동일 번호로 재가입 가능
   - 새 UID로 새 문서 생성

---

## 📞 문제 해결

### 문제: 탈퇴 시 "최근 로그인이 필요합니다" 오류

**원인:**
- `deleteUser`는 최근 로그인 필요
- 오래된 세션

**해결:**
1. 다시 로그인 후 탈퇴
2. 또는 `withdrawUserWithReauth` 사용

---

### 문제: 재가입 시 이전 데이터가 보임

**원인:**
- 기존 문서가 `status: "deleted"`로 유지됨
- 새 UID로 새 문서 생성 필요

**해결:**
1. 새 UID로 새 문서 생성 (정상)
2. 기존 데이터는 `status: "deleted"`로 유지
3. 운영자가 필요 시 복구 가능

---

## 🎯 성공 기준

### 개발 환경
- ✅ 탈퇴 버튼 클릭 시 탈퇴 처리
- ✅ 탈퇴 후 로그인 불가
- ✅ 재가입 가능
- ✅ 탈퇴 이벤트 로그 저장

### 운영 환경
- ✅ 탈퇴 유저 접근 차단
- ✅ 재가입 정상 작동
- ✅ 데이터 복구 가능
- ✅ 법적 요구사항 충족
