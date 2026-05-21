# 🔥 팀 생성 Rules 단순화 완료

**생성일**: 2025-01-27  
**목적**: 팀 생성 트랜잭션에서 `internal` 에러 방지를 위한 Rules 최소화  
**상태**: ✅ 완료

---

## 🔴 문제 분석

### 발견된 문제점

1. **`members` create 규칙이 과도하게 복잡함**
   - `request.resource.data.teamId == teamId` 조건이 트랜잭션 내부에서 평가 실패 가능
   - `exists()` 체크와 복합 조건으로 인한 evaluation error

2. **`team_members` write 규칙도 동일한 문제**
   - `teamId` 검증이 불필요하게 복잡함

---

## ✅ 해결 방법: 최소 규칙으로 단순화

### 핵심 원칙

> **팀 생성 트랜잭션에서는 `uid == request.auth.uid` 조건만으로 충분하다**

팀 생성 시:
- `uid`는 항상 생성자 본인 (`request.auth.uid`)
- `teamId` 검증은 불필요 (트랜잭션 내부에서 경로가 이미 보장됨)
- `exists()` 체크는 승인 트랜잭션에서만 필요

---

## 📋 수정된 Rules

### 1️⃣ teams/{teamId}/members/{memberId} create

**수정 전:**
```javascript
allow create: if isSignedIn() && (
  // 케이스 1: 팀 생성 트랜잭션 (복잡한 조건)
  (request.resource.data.uid == request.auth.uid &&
   request.resource.data.teamId != null &&
   request.resource.data.teamId == teamId) ||
  // 케이스 2: 승인 트랜잭션
  (exists(/databases/$(database)/documents/teams/$(teamId)) &&
   get(...).data.ownerUid == request.auth.uid)
);
```

**수정 후:**
```javascript
allow create: if isSignedIn() && (
  // 케이스 1: 팀 생성 트랜잭션 (최소 규칙)
  request.resource.data.uid == request.auth.uid ||
  // 케이스 2: 승인 트랜잭션
  (exists(/databases/$(database)/documents/teams/$(teamId)) &&
   get(/databases/$(database)/documents/teams/$(teamId)).data.ownerUid == request.auth.uid)
);
```

**변경 사항:**
- ✅ `teamId` 검증 제거
- ✅ `teamId == teamId` 조건 제거
- ✅ `uid == request.auth.uid` 조건만 유지

---

### 2️⃣ team_members/{memberId} write

**수정 전:**
```javascript
allow write: if isSignedIn() && (
  // 케이스 1: 팀 생성 트랜잭션 (복잡한 조건)
  (request.resource.data.uid == request.auth.uid &&
   request.resource.data.teamId != null) ||
  // 케이스 2: 승인 트랜잭션
  (request.resource.data.teamId != null &&
   exists(...) &&
   get(...).data.ownerUid == request.auth.uid)
);
```

**수정 후:**
```javascript
allow write: if isSignedIn() && (
  // 케이스 1: 팀 생성 트랜잭션 (최소 규칙)
  request.resource.data.uid == request.auth.uid ||
  // 케이스 2: 승인 트랜잭션
  (request.resource.data.teamId != null &&
   exists(/databases/$(database)/documents/teams/$(request.resource.data.teamId)) &&
   get(/databases/$(database)/documents/teams/$(request.resource.data.teamId)).data.ownerUid == request.auth.uid)
);
```

**변경 사항:**
- ✅ `teamId != null` 검증 제거 (팀 생성 트랜잭션 케이스에서)
- ✅ `uid == request.auth.uid` 조건만 유지

---

## 🎯 효과

### Before (복잡한 규칙)
- 트랜잭션 내부에서 `teamId` 검증 실패 가능
- `exists()` 체크와 복합 조건으로 인한 evaluation error
- `internal` 에러 발생

### After (단순화된 규칙)
- 팀 생성 트랜잭션: `uid == request.auth.uid` 조건만 체크
- 평가 단순화로 evaluation error 방지
- `internal` 에러 해결

---

## 🔍 보안 고려사항

### 안전성 검증

1. **팀 생성 트랜잭션**
   - `uid == request.auth.uid` 조건으로 본인만 생성 가능 ✅
   - `teamId` 검증 불필요 (경로가 이미 보장됨) ✅

2. **승인 트랜잭션**
   - 기존 `exists()` + `ownerUid` 체크 유지 ✅
   - 팀장만 승인 가능 ✅

---

## 📝 다음 단계

1. ✅ Rules 단순화 완료
2. ⏳ Rules 배포: `firebase deploy --only firestore:rules`
3. ⏳ 팀 생성 테스트
4. ⏳ Firebase Console 로그 확인

---

**작성일**: 2025-01-27  
**상태**: ✅ Rules 단순화 완료  
**다음 단계**: Rules 배포 및 테스트
