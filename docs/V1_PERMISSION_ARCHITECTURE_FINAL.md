# 🔐 YAGO VIBE v1 권한 아키텍처 (최종 확정)

## 📋 개요

YAGO VIBE v1 권한 시스템은 **2단계 구조**로 설계되었습니다:
- **플랫폼 레벨**: 서비스 전체 권한
- **팀 레벨**: 팀 내부 권한

---

## 1️⃣ 권한 레벨 구조

```
플랫폼 (users/{uid}.role)
   ↓
팀 (teams/{teamId}/members/{uid}.role)
```

---

## 2️⃣ 플랫폼 권한 (users 컬렉션)

### 위치
```
users/{uid}
```

### 구조
```typescript
{
  role: "ADMIN" | "USER"
}
```

### 의미

| role  | 의미      |
| ----- | ------- |
| ADMIN | 플랫폼 관리자 |
| USER  | 일반 사용자  |

### 규칙

- **반드시 대문자**
- `"ADMIN"` 또는 `"USER"`만 허용
- `"admin"`, `"Admin"` 같은 소문자/혼합 금지
- 신규 사용자 생성 시 기본값: `"USER"`

### 코드 예시

```typescript
// ✅ 올바른 사용
const isAdmin = user.role === "ADMIN";
const isUser = user.role === "USER";

// ❌ 잘못된 사용
const isAdmin = user.role === "admin"; // 소문자 금지
```

---

## 3️⃣ 팀 권한 (teams 컬렉션)

### 위치
```
teams/{teamId}/members/{uid}
```

### 구조
```typescript
{
  role: "owner" | "admin" | "member"
}
```

### 의미

| role   | 의미       |
| ------ | -------- |
| owner  | 팀장       |
| admin  | 코치 / 부팀장 |
| member | 팀원       |

### 규칙

- **반드시 소문자**
- `"owner"`, `"admin"`, `"member"`만 허용
- `"OWNER"`, `"Owner"` 같은 대문자/혼합 금지

### 코드 예시

```typescript
// ✅ 올바른 사용
const isOwner = member.role === "owner";
const isAdmin = member.role === "admin";
const isMember = member.role === "member";

// ❌ 잘못된 사용
const isOwner = member.role === "OWNER"; // 대문자 금지
```

---

## 4️⃣ 권한 우선순위

```
ADMIN (플랫폼)
   ↓
owner (팀장)
   ↓
admin (팀 코치)
   ↓
member (팀원)
   ↓
USER (일반 사용자)
```

### 설명

- **ADMIN**: 모든 팀 관리 가능, 모든 플랫폼 기능 접근
- **owner**: 자신의 팀만 관리, 팀 설정 변경 가능
- **admin**: 팀 관리 일부 가능, 팀원 초대/추방 가능
- **member**: 일반 팀원, 팀 정보 조회만 가능
- **USER**: 일반 사용자, 팀 가입/생성 가능

---

## 5️⃣ Firestore 데이터 규칙

### users 컬렉션

```typescript
users/{uid}
{
  role: "ADMIN"  // 또는 "USER"
}
```

### teams 컬렉션

```typescript
teams/{teamId}/members/{uid}
{
  role: "owner"  // 또는 "admin" 또는 "member"
}
```

---

## 6️⃣ 코드 규칙

### 플랫폼 권한 체크

```typescript
// ✅ 올바른 방법
import { isAdmin } from "@/utils/hasRole";
const isAdmin = isAdmin(profile); // toUpperCase() 내부 처리

// 또는 직접 체크
const isAdmin = profile.role?.toUpperCase() === "ADMIN";
```

### 팀 권한 체크

```typescript
// ✅ 올바른 방법
const isOwner = member.role === "owner";
const isAdmin = member.role === "admin";
const isMember = member.role === "member";
```

---

## 7️⃣ 신규 사용자 생성 규칙

회원가입 시 자동 설정:

```typescript
users/{uid}
{
  role: "USER"  // 기본값 (대문자)
}
```

### 구현 위치

- `src/utils/userProfile.ts`
- `ensureUserProfile()`: 전화번호 기반 가입
- `ensureEmailUserProfile()`: 이메일 기반 가입

---

## 8️⃣ Firestore Rules 개선 (현재 문제)

### 현재 상태

```javascript
match /{document=**} {
  allow read, write: if true;  // 테스트 모드
}
```

**문제**: 프로덕션에서 모든 사용자가 모든 데이터에 접근 가능

### 권장 해결

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 플랫폼 관리자 확인 함수
    function isPlatformAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }
    
    // users 컬렉션
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid || isPlatformAdmin();
    }
    
    // teams 컬렉션
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // 팀 권한은 애플리케이션 레벨에서 체크
      
      match /members/{memberId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == memberId || isPlatformAdmin();
      }
    }
  }
}
```

---

## 9️⃣ 데이터 마이그레이션

### users 컬렉션

| 기존    | 수정    |
| ----- | ----- |
| admin | ADMIN |
| Admin | ADMIN |
| user  | USER  |
| User  | USER  |

### teams 컬렉션

| 기존     | 수정     |
| ------ | ------ |
| LEADER | owner  |
| MEMBER | member |
| leader | owner  |
| member | member (이미 정상) |

---

## 🔟 Cursor 개발자 최종 작업 지시

### ✅ 완료된 작업

1. **UserProfile 타입 정의 추가** (`src/types/user.ts`)
2. **신규 사용자 role 기본값 설정** (`src/utils/userProfile.ts`)
   - `role: "user"` → `role: "USER"` (대문자)
3. **팀 role 소문자 통일**
   - `createTeamSimple.ts`: `role: "owner"`
   - `teamInviteLink.ts`: `role: "member"`
   - `updateTeamMemberRole.ts`: 소문자 타입 정의
4. **권한 체크 로직 개선**
   - `hasRole.ts`: `toUpperCase()` 사용
   - `useAdmin.ts`: `toUpperCase()` 사용

### 📋 추가 작업 필요

1. **role validation 상수 추가** ✅
   - `src/lib/team/roleConstants.ts` 생성 완료
   - `src/utils/platformRoleConstants.ts` 생성 완료

2. **Firestore Rules 보안 강화** (향후)
   - 테스트 모드 → 프로덕션 모드 전환
   - role 기반 접근 제어 구현

3. **Firestore 데이터 마이그레이션** (수동)
   - 기존 `users.role` 값 대문자로 통일
   - 기존 `teams.members.role` 값 소문자로 통일

---

## 1️⃣1️⃣ 향후 확장 (v2)

### 협회/리그 권한 추가

```
associations/{associationId}/members/{uid}
{
  role: "owner" | "admin" | "member"
}
```

### 구조

```
플랫폼 (users.role)
  ↓
협회 (associations/{id}/members.role)
  ↓
팀 (teams/{teamId}/members.role)
```

---

## 📊 현재 상태 평가

| 항목              | 상태       |
| --------------- | -------- |
| 권한 구조           | ✅ 정상     |
| 타입 정의           | ✅ 완료     |
| 코드 구조           | ✅ 정리 완료  |
| 신규 사용자 role 설정 | ✅ 완료     |
| Firestore Rules | ⚠️ 테스트 모드 (향후 개선) |
| 데이터 마이그레이션    | ⚠️ 수동 작업 필요 |

---

## 🔥 확인 사항

### Firestore 실제 데이터 확인

1. Firebase Console 접속
2. Firestore Database → `users` 컬렉션
3. `jaeman2034@gmail.com` 계정의 uid 문서 확인
4. `role` 필드 값 확인:
   - `"ADMIN"` (대문자) ✅
   - `"USER"` (대문자) ✅
   - `"admin"` (소문자) ⚠️ 수정 필요
   - `undefined` ⚠️ 기본값 설정 필요

---

## 📝 다음 단계

1. **Firestore 실제 데이터 확인**
   - `users/{uid}.role` 값 확인
   - `jaeman2034@gmail.com` 계정 role 확인

2. **Firestore Rules 보안 강화** (향후)
   - role 기반 접근 제어 구현

3. **협회/리그 권한 구조 설계** (v2)
   - `associations/{id}/members/{uid}` 컬렉션 설계

---

## 📚 관련 파일

- `src/types/user.ts`: UserProfile 타입 정의
- `src/utils/hasRole.ts`: 권한 체크 유틸
- `src/hooks/useAdmin.ts`: 관리자 권한 확인 훅
- `src/utils/userProfile.ts`: 신규 사용자 프로필 생성
- `src/lib/team/createTeamSimple.ts`: 팀 생성 (owner role)
- `src/lib/team/teamInviteLink.ts`: 팀 초대 (member role)
- `src/lib/team/roleConstants.ts`: 팀 role 상수
- `src/utils/platformRoleConstants.ts`: 플랫폼 role 상수
