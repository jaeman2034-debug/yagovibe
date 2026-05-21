# 🔍 팀 생성 Rules vs Payload 1:1 매칭 분석

**생성일**: 2025-01-27  
**목적**: Firestore Rules와 createTeam payload를 1:1로 매칭하여 문제 지점 찾기  
**상태**: 🔍 분석 중

---

## 📋 현재 Rules 구조

### 1️⃣ teams/{teamId}

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능
  allow read: if isSignedIn();
  
  // 생성: 로그인 사용자 모두 가능
  allow create: if isSignedIn(); // ✅ 단순 조건
  
  // 수정: 팀 소유자만
  allow update: if isSignedIn() && (
    resource.data.ownerUid == request.auth.uid ||
    request.auth.uid in resource.data.get('owners', [])
  );
  
  // 삭제: 금지
  allow delete: if false;
}
```

**분석:**
- ✅ `allow create: if isSignedIn();`만 있음
- ✅ 추가 필드 검증 없음
- ✅ Cloud Functions는 Admin SDK 사용하므로 이론적으로는 Rules 우회해야 함

---

### 2️⃣ teams/{teamId}/members/{memberId}

```javascript
match /members/{memberId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if isSignedIn();
  
  // 생성: 승인 트랜잭션 중 팀장만 가능
  allow create: if isSignedIn() &&
    exists(/databases/$(database)/documents/teams/$(teamId)) &&
    get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid;
  
  // 수정: 팀 소유자만
  allow update: if isSignedIn() && (
    get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid ||
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', [])
  );
  
  // 삭제: 팀 소유자만
  allow delete: if isSignedIn() && 
    get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid;
}
```

**⚠️ 문제 발견:**
- `allow create` 조건: `exists(/databases/$(database)/documents/teams/$(teamId))`
- **트랜잭션 내부에서 teams 문서를 생성하고 바로 members를 생성하는데, 아직 commit 전이므로 `exists()` 체크가 실패할 수 있음**

---

### 3️⃣ team_members/{memberId}

```javascript
match /team_members/{memberId} {
  // 읽기: 로그인 사용자 모두 가능
  allow read: if isSignedIn();
  
  // 쓰기: 승인 트랜잭션 중 팀장만 가능
  allow write: if isSignedIn() &&
    request.resource.data.teamId != null &&
    exists(/databases/$(database)/documents/teams/$(request.resource.data.teamId)) &&
    get(/databases/$(database)/documents/teams/$(request.resource.data.teamId)).data.ownerUid == request.auth.uid;
}
```

**⚠️ 문제 발견:**
- `allow write` 조건: `exists(/databases/$(database)/documents/teams/$(teamId))`
- **트랜잭션 내부에서 teams 문서를 생성하고 바로 team_members를 생성하는데, 아직 commit 전이므로 `exists()` 체크가 실패할 수 있음**

---

## 🔴 핵심 문제 발견

### 문제: 트랜잭션 내부에서 `exists()` 체크 실패

**시나리오:**
1. 트랜잭션 시작
2. `transaction.set(teamRef, teamData)` - teams 문서 생성 (아직 commit 안 됨)
3. `transaction.set(memberRef, memberData)` - members 문서 생성 시도
4. Rules 체크: `exists(/databases/$(database)/documents/teams/$(teamId))`
5. ❌ **트랜잭션이 commit 전이므로 `exists()`는 false 반환**
6. Rules reject → internal 에러

---

## ✅ 해결 방법

### 방법 1: Rules에서 트랜잭션 내부 생성 허용 (권장)

**teams/{teamId}/members/{memberId}:**
```javascript
match /members/{memberId} {
  // 생성: 팀 생성 트랜잭션 중이거나, 승인 트랜잭션 중
  allow create: if isSignedIn() && (
    // 🔥 팀 생성 트랜잭션: ownerUid가 본인이고, teams 문서가 없거나 생성 중
    (request.resource.data.uid == request.auth.uid &&
     request.resource.data.teamId != null) ||
    // 승인 트랜잭션: 팀장이 승인하는 경우
    (exists(/databases/$(database)/documents/teams/$(teamId)) &&
     get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid)
  );
}
```

**team_members/{memberId}:**
```javascript
match /team_members/{memberId} {
  // 쓰기: 팀 생성 트랜잭션 중이거나, 승인 트랜잭션 중
  allow write: if isSignedIn() && (
    // 🔥 팀 생성 트랜잭션: ownerUid가 본인
    (request.resource.data.uid == request.auth.uid &&
     request.resource.data.teamId != null) ||
    // 승인 트랜잭션: 팀장이 승인하는 경우
    (request.resource.data.teamId != null &&
     exists(/databases/$(database)/documents/teams/$(request.resource.data.teamId)) &&
     get(/databases/$(database)/documents/teams/$(request.resource.data.teamId)).data.ownerUid == request.auth.uid)
  );
}
```

---

### 방법 2: Cloud Functions에서 Rules 우회 확인 (확인 필요)

**이론:**
- Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회해야 함
- 하지만 실제로는 Rules 체크를 받을 수 있음

**확인 방법:**
- Firebase Console → Functions → Logs
- 실제 에러 메시지 확인

---

## 📋 체크리스트

- [ ] teams/{teamId}/members/{memberId} create 규칙 확인
- [ ] team_members/{memberId} write 규칙 확인
- [ ] 트랜잭션 내부 exists() 체크 문제 확인
- [ ] Rules 수정 적용

---

**작성일**: 2025-01-27  
**상태**: 🔍 문제 발견 - 트랜잭션 내부 exists() 체크 문제  
**다음 단계**: Rules 수정
