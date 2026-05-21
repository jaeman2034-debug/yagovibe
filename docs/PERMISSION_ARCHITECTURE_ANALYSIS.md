# 🔥 권한 구조 분석 및 문제점 체크

## 📋 현재 권한 구조

### 1️⃣ 플랫폼 레벨 (서비스 전체)

**위치**: `users/{uid}`

```typescript
{
  role: "ADMIN" | "USER"  // 대문자
}
```

| role | 의미 |
|------|------|
| ADMIN | 플랫폼 책임자 / 서비스 관리자 |
| USER | 일반 사용자 (기본값) |

**현재 코드 상태**:
- ✅ `hasRole.ts`: `role.toUpperCase() === "ADMIN"` 체크 (정상)
- ✅ `useAdmin.ts`: `role === "ADMIN"` 체크 (정상)
- ⚠️ `src/types/user.ts`: UserProfile 타입 정의 누락 (수정 완료)

---

### 2️⃣ 팀 레벨

**위치**: `teams/{teamId}/members/{uid}`

```typescript
{
  role: "owner" | "admin" | "member"  // 소문자
}
```

| role | 의미 |
|------|------|
| owner | 팀장 (팀 생성자) |
| admin | 코치 / 부팀장 |
| member | 팀원 |

**현재 코드 상태**:
- ✅ `permissions.ts`: `type TeamRole = "owner" | "admin" | "member"` (정상)
- ✅ `createTeamSimple.ts`: `role: "owner"` (수정 완료)
- ✅ `teamInviteLink.ts`: `role: "member"` (수정 완료)
- ✅ `updateTeamMemberRole.ts`: 소문자로 통일 (수정 완료)

---

## 🔍 발견된 문제점

### ❌ 문제 1: UserProfile 타입 정의 누락

**위치**: `src/types/user.ts`

**문제**:
- `src/utils/hasRole.ts`에서 `import type { UserProfile } from "@/types/user"` 시도
- 실제로는 `src/types/user.ts`에 UserProfile 정의가 없음
- `src/hooks/useMyProfile.ts`에만 로컬 정의 존재

**해결**: ✅ `src/types/user.ts`에 UserProfile 타입 추가 완료

---

### ⚠️ 문제 2: Firestore Rules가 테스트 모드

**위치**: `firestore.rules`

**현재 상태**:
```javascript
match /{document=**} {
  allow read, write: if true;  // 전체 허용
}
```

**문제**:
- 프로덕션에서 role 기반 보안 규칙이 작동하지 않음
- 모든 사용자가 모든 데이터에 접근 가능

**권장 해결**:
```javascript
function isGlobalAdmin() {
  return isSignedIn()
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
}
```

---

### ⚠️ 문제 3: role 값 대소문자 혼용 가능성

**현재 코드**:
- `hasRole.ts`: `toUpperCase()` 사용하여 대소문자 무시
- `useAdmin.ts`: `role === "ADMIN"` 체크 (대문자만)

**문제**:
- Firestore에 `role: "admin"` (소문자)로 저장되면 `useAdmin`이 false 반환
- `hasRole`은 정상 작동 (대소문자 무시)

**권장 해결**:
- Firestore에 저장 시 항상 대문자로 저장: `"ADMIN"`, `"USER"`
- 또는 모든 체크 로직에서 `toUpperCase()` 사용

---

### ⚠️ 문제 4: 협회/리그 권한 구조 부재

**현재 구조**:
```
플랫폼 (users.role)
  ↓
팀 (teams/{teamId}/members.role)
```

**부족한 부분**:
- 협회/리그 레벨 권한 구조 없음
- 예: "노원구 축구협회 책임자" 같은 중간 레벨 권한 없음

**향후 확장 고려**:
```
플랫폼 (users.role: SUPER_ADMIN | ADMIN | USER)
  ↓
협회/리그 (associations/{id}/members.role: owner | admin | member)
  ↓
팀 (teams/{teamId}/members.role: owner | admin | member)
```

---

## ✅ 권장 사항

### 1️⃣ 즉시 수정 필요

1. **Firestore Rules 보안 강화**
   - 테스트 모드에서 프로덕션 모드로 전환
   - role 기반 접근 제어 구현

2. **role 값 대소문자 통일**
   - Firestore에 저장 시 항상 대문자: `"ADMIN"`, `"USER"`
   - 또는 모든 체크 로직에서 `toUpperCase()` 사용

### 2️⃣ 단기 개선

1. **UserProfile 타입 통일**
   - ✅ `src/types/user.ts`에 UserProfile 추가 완료
   - 모든 파일에서 `@/types/user`에서 import하도록 통일

2. **권한 체크 로직 일관성**
   - 모든 role 체크에서 `toUpperCase()` 사용
   - 또는 Firestore 저장 시 대문자로 통일

### 3️⃣ 장기 확장

1. **협회/리그 권한 구조 추가**
   - `associations/{id}/members/{uid}` 컬렉션
   - `role: "owner" | "admin" | "member"` (팀과 동일한 구조)

2. **SUPER_ADMIN 추가**
   - `role: "SUPER_ADMIN" | "ADMIN" | "USER"`
   - SUPER_ADMIN: 플랫폼 책임자
   - ADMIN: 운영 관리자

---

## 📊 최종 권한 구조 (현재)

### 플랫폼 레벨
```typescript
users/{uid}
{
  role: "ADMIN" | "USER"  // 대문자
}
```

### 팀 레벨
```typescript
teams/{teamId}/members/{uid}
{
  role: "owner" | "admin" | "member"  // 소문자
}
```

### 권한 우선순위
```
ADMIN (플랫폼) > owner (팀) > admin (팀) > member (팀) > USER (플랫폼)
```

---

## 🔎 확인 필요 사항

### 1️⃣ Firestore 실제 데이터 확인

**확인 방법**:
1. Firebase Console 접속
2. Firestore Database → `users` 컬렉션
3. `jaeman2034@gmail.com` 계정의 uid 문서 확인
4. `role` 필드 값 확인:
   - `"ADMIN"` (대문자) ✅
   - `"admin"` (소문자) ⚠️
   - `undefined` ❌

**예상 결과**:
- `role: "ADMIN"` 또는 `role: undefined` (기본값 없음)

### 2️⃣ 기본 role 값 설정

**현재 문제**:
- 신규 사용자 생성 시 `role` 필드가 없을 수 있음
- `hasRole`, `isAdmin`에서 `profile.role`이 `undefined`면 `false` 반환

**권장 해결**:
- 신규 사용자 생성 시 기본값 `role: "USER"` 설정
- 또는 `hasRole`, `isAdmin`에서 `undefined`를 `"USER"`로 처리

---

## ✅ 체크리스트

- [x] UserProfile 타입 정의 추가 (`src/types/user.ts`)
- [ ] Firestore Rules 보안 강화 (테스트 모드 → 프로덕션)
- [ ] role 값 대소문자 통일 (Firestore 저장 시 대문자)
- [ ] 신규 사용자 기본 role 값 설정 (`"USER"`)
- [ ] `jaeman2034@gmail.com` 계정 role 값 확인
- [ ] 모든 role 체크 로직에서 `toUpperCase()` 사용 확인

---

## 📝 다음 단계

1. **Firestore 실제 데이터 확인**
   - `users/{uid}.role` 값 확인
   - `jaeman2034@gmail.com` 계정 role 확인

2. **기본 role 값 설정**
   - 신규 사용자 생성 시 `role: "USER"` 기본값 설정

3. **Firestore Rules 보안 강화**
   - role 기반 접근 제어 구현

4. **협회/리그 권한 구조 설계** (향후)
   - `associations/{id}/members/{uid}` 컬렉션 설계
