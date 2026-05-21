# 🔥 role 기반 권한 분기 가이드

## 📋 개요

Firestore `users/{uid}.role` 기준으로 권한을 제어하여 운영 페이지/관리자 기능을 안전하게 열 수 있도록 합니다.

**목표:**
- Firestore `users/{uid}.role` 기준 권한 제어
- 라우트 + UI + 보안 규칙까지 일관되게
- 나중에 `manager`, `support` 확장 쉬운 구조

**원칙:**
- 기본값은 무조건 `"user"`
- admin 승격은 콘솔 or 서버에서만
- UI 분기는 보조 수단, 진짜 보안은 Firestore Rules

---

## ✅ 구현된 컴포넌트

### 1️⃣ `hasRole` 유틸

**파일:** `src/utils/hasRole.ts`

**역할:**
- Firestore users/{uid}.role 기준 권한 체크
- 라우트 + UI + 보안 규칙까지 일관되게 사용
- 나중에 manager, support 확장 쉬운 구조

**함수:**
- `hasRole(profile, roles)`: 지정된 역할 중 하나를 가지고 있는지 확인
- `isAdmin(profile)`: 관리자인지 확인
- `isUser(profile)`: 일반 유저인지 확인

**사용 예시:**
```typescript
import { hasRole, isAdmin } from "@/utils/hasRole";
import { useAuthUser } from "@/hooks/useAuthUser";

const { profile } = useAuthUser();

if (isAdmin(profile)) {
  return <AdminPanel />;
}

if (hasRole(profile, ["admin", "manager"])) {
  return <ManagementPanel />;
}
```

---

### 2️⃣ `AdminRoute` 보호 라우트

**파일:** `src/routes/AdminRoute.tsx`

**역할:**
- 관리자만 접근 가능한 라우트 보호
- Firestore users/{uid}.role 기준 권한 제어
- 비관리자는 홈으로 리다이렉트

**사용 예시:**
```tsx
<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminHome />
    </AdminRoute>
  }
/>
```

---

## 🔐 Firestore 보안 규칙

**파일:** `firestore.rules`

**기존 함수:**
```javascript
function isGlobalAdmin() {
  return isSignedIn()
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
}
```

**사용 예시:**
```javascript
// 🔒 관리자 전용 컬렉션
match /admin_data/{docId} {
  allow read, write: if isGlobalAdmin();
}

// 🔒 운영 로그
match /auth_logs/{docId} {
  allow read: if isGlobalAdmin();
  allow write: if request.auth != null;
}
```

**포인트:**
- `isGlobalAdmin()` 함수는 이미 구현되어 있음
- `role == "ADMIN"` (대문자)로 체크
- 클라이언트에서 role을 변경할 수 없음 (Firestore Rules로 보호)

---

## 🎯 UI 레벨 권한 분기

### 헤더 메뉴 예시

```tsx
import { useAuthUser } from "@/hooks/useAuthUser";
import { isAdmin } from "@/utils/hasRole";

function Header() {
  const { profile } = useAuthUser();

  return (
    <nav>
      <a href="/">Home</a>
      <a href="/sports-hub">Sports Hub</a>

      {isAdmin(profile) && (
        <a href="/admin">Admin</a>
      )}
    </nav>
  );
}
```

### 버튼 예시

```tsx
import { useAuthUser } from "@/hooks/useAuthUser";
import { hasRole } from "@/utils/hasRole";

function SomeComponent() {
  const { profile } = useAuthUser();

  return (
    <div>
      <button>일반 버튼</button>

      {hasRole(profile, ["admin", "manager"]) && (
        <button>관리자 전용 버튼</button>
      )}
    </div>
  );
}
```

---

## 🧠 이 구조가 "운영급"인 이유

### ✅ role 하나로 라우트 / UI / DB 통합 제어
- `hasRole` 유틸 하나로 모든 권한 체크 통일
- 라우트, UI, Firestore Rules 모두 동일한 기준 사용

### ✅ admin 권한은 클라에서 못 뚫음
- Firestore Rules에서 `role` 필드 수정 차단
- 클라이언트에서 role 변경 시도해도 실패

### ✅ 로그 / 통계 / 운영툴 확장 쉬움
- `isGlobalAdmin()` 함수로 관리자 전용 컬렉션 보호
- 새로운 관리자 기능 추가 시 동일한 패턴 사용

### ✅ 실서비스에서 그대로 쓰는 패턴
- Firebase 공식 권장 패턴
- 확장 가능한 구조

---

## 📊 role 확장 예시

### 현재 구조
```typescript
role: "user" | "admin";
```

### 확장 구조 (나중에)
```typescript
role: "user" | "admin" | "manager" | "support";
```

### 확장 시 변경 사항
1. `src/types/user.ts`에서 role 타입 확장
2. `hasRole` 유틸은 그대로 사용 (roles 배열에 추가만)
3. Firestore Rules에 `isManager()`, `isSupport()` 함수 추가

---

## ✅ 체크리스트

### 개발 환경
- [ ] `hasRole` 유틸 정상 작동 확인
- [ ] `AdminRoute` 정상 작동 확인
- [ ] 일반 유저가 `/admin` 접근 시 홈으로 리다이렉트 확인
- [ ] 관리자가 `/admin` 접근 시 정상 표시 확인

### 운영 환경
- [ ] Firestore Rules에서 관리자 권한 정상 작동 확인
- [ ] UI 레벨 권한 분기 정상 작동 확인
- [ ] 관리자 전용 컬렉션 접근 제어 확인

---

## 🚨 주의사항

1. **role 기본값**
   - 신규 유저는 무조건 `"user"`로 생성
   - `ensureUserProfile`에서 `role: "user"` 설정 확인

2. **admin 승격**
   - 클라이언트에서 role 변경 불가
   - Firebase Console 또는 Cloud Functions에서만 변경
   - Firestore Rules로 보호됨

3. **UI 분기는 보조 수단**
   - UI에서 버튼 숨기는 것은 UX 개선용
   - 진짜 보안은 Firestore Rules에서 처리
   - 클라이언트는 항상 신뢰할 수 없음

---

## 📞 문제 해결

### 문제: 관리자가 `/admin` 접근 시 홈으로 리다이렉트됨

**원인:**
- `users/{uid}.role`이 `"admin"`이 아님
- Firestore 문서에 `role` 필드가 없음

**해결:**
1. Firebase Console에서 `users/{uid}` 문서 확인
2. `role` 필드를 `"admin"`으로 설정 (또는 `"ADMIN"` - Rules에 따라)
3. `useAuthUser` 훅이 정상 작동하는지 확인

---

### 문제: 일반 유저가 `/admin` 접근 가능

**원인:**
- `AdminRoute`가 제대로 작동하지 않음
- Firestore Rules에서 권한 체크 실패

**해결:**
1. `AdminRoute` 컴포넌트 확인
2. `useAuthUser` 훅이 정상 작동하는지 확인
3. Firestore Rules 확인

---

## 🎯 성공 기준

### 개발 환경
- ✅ 일반 유저가 `/admin` 접근 시 홈으로 리다이렉트
- ✅ 관리자가 `/admin` 접근 시 정상 표시
- ✅ UI에서 관리자 메뉴/버튼 정상 표시/숨김

### 운영 환경
- ✅ Firestore Rules에서 관리자 권한 정상 작동
- ✅ 관리자 전용 컬렉션 접근 제어 정상 작동
- ✅ 클라이언트에서 role 변경 불가
