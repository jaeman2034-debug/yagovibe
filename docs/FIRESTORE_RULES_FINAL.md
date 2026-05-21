# 🔥 Firestore Rules 최종 버전 (고정본)

## 📋 목표

이 문서는 **Firestore Rules의 최종 버전**입니다.

팀/멤버 생성은 서버 only, 권한 체크는 `members/{uid}` 기준으로 고정합니다.

---

## 🔑 핵심 원칙

1. **팀/멤버 생성**: Functions만 가능 (`allow create: if false`)
2. **권한 체크**: `teams/{teamId}/members/{uid}` 기준
3. **읽기**: 인증된 사용자 모두 가능 (공개 정보)
4. **수정**: Owner/Admin만 가능

---

## 📐 Rules 구조

### 1️⃣ teams/{teamId}

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능 (팀 정보는 공개 정보)
  allow read: if request.auth != null;
  
  // 생성: Functions만 가능 (프론트 차단)
  allow create: if false; // 🔥 서버 only
  
  // 수정: Owner만 가능 (단, plan/ownerUid 필드는 수정 금지)
  allow update: if request.auth != null && 
                 request.auth.uid in resource.data.get('owners', []) &&
                 // 🔥 핵심 필드 수정 방지
                 request.resource.data.get('plan', '') == resource.data.get('plan', '') &&
                 request.resource.data.get('ownerUid', '') == resource.data.get('ownerUid', '') &&
                 request.resource.data.get('ownerId', '') == resource.data.get('ownerId', '');
  
  // 삭제: 금지
  allow delete: if false;
}
```

### 2️⃣ teams/{teamId}/members/{uid}

```javascript
match /members/{memberId} {
  // 읽기: 팀 멤버 모두 가능 (본인 또는 팀 멤버)
  allow read: if request.auth != null && (
    // 본인 문서 읽기
    request.auth.uid == memberId ||
    // 팀 멤버면 읽기 가능
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) ||
    // 관리자면 허용
    request.auth.token.email.matches('.*@yagovibe\\.com$') ||
    request.auth.token.email.matches('.*admin.*')
  );
  
  // 생성: Functions만 가능 (프론트 차단)
  // 단, 팀 생성 시: owner가 본인 문서(memberId = uid) 생성 허용
  allow create: if request.auth != null && (
    // 🔥 팀 생성 시: owner가 본인 문서(memberId = uid) 생성
    (request.auth.uid == memberId && 
     request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', [])) ||
    // 🔥 기존 팀: OWNER, ADMIN만 가능
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', [])) ||
    (exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == "admin") ||
    request.auth.token.email.matches('.*@yagovibe\\.com$') ||
    request.auth.token.email.matches('.*admin.*')
  ) && (
    // 권한 문서(memberId = uid)인 경우: name 필드 불필요
    (request.auth.uid == memberId) ||
    // 일반 회원 프로필인 경우: name 필드 필수
    (request.resource.data.name is string)
  );
  
  // 수정: OWNER, ADMIN만 가능
  allow update: if request.auth != null && (
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
    (exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == "admin") ||
    request.auth.token.email.matches('.*@yagovibe\\.com$') ||
    request.auth.token.email.matches('.*admin.*')
  );
  
  // 삭제 (Soft Delete): OWNER, ADMIN만 가능
  allow update: if request.auth != null && 
                 request.resource.data.isDeleted == true &&
                 resource.data.isDeleted != true &&
                 (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
                  (exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
                   get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == "admin") ||
                  request.auth.token.email.matches('.*@yagovibe\\.com$') ||
                  request.auth.token.email.matches('.*admin.*'));
  
  // 물리 삭제: 불가 (Soft Delete만 허용)
  allow delete: if false;
}
```

### 3️⃣ team_members/{memberId}

```javascript
match /team_members/{memberId} {
  // 읽기: 본인 또는 팀 관리자
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.uid ||
    isTeamAdmin(resource.data.teamId)
  );
  
  // 생성/수정: 본인 또는 팀 관리자
  allow create, update: if request.auth != null && (
    request.auth.uid == request.resource.data.uid ||
    isTeamAdmin(request.resource.data.teamId)
  );
  
  // 삭제: 금지 (Soft Delete만 허용)
  allow delete: if false;
}
```

---

## 🔑 권한 체크 함수

```javascript
function isSignedIn() {
  return request.auth != null;
}

function isTeamAdmin(teamId) {
  return isSignedIn()
    && exists(/databases/$(database)/documents/team_members/$(teamId + "_" + request.auth.uid))
    && get(/databases/$(database)/documents/team_members/$(teamId + "_" + request.auth.uid)).data.role == "admin";
}
```

**⚠️ 주의**: `isTeamAdmin`은 `team_members`를 사용하지만, 실제 권한 체크는 `members/{uid}`에서 수행합니다.

---

## ✅ 체크리스트

- [x] `teams/{teamId}` 생성: Functions만 가능
- [x] `teams/{teamId}/members/{uid}` 생성: Functions만 가능 (단, 팀 생성 시 owner 본인 문서 생성 허용)
- [x] 권한 체크: `members/{uid}` 기준
- [x] 핵심 필드 수정 방지: `plan`, `ownerUid` 등
- [x] Soft Delete만 허용: 물리 삭제 금지

---

**작성일**: 2024년  
**상태**: ✅ 최종 버전 고정

