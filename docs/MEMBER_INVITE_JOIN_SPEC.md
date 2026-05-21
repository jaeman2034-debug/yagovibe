# 🔥 멤버 초대/가입 스펙 (정답 고정본)

## 📋 목표

초대/가입 시나리오 정리 → role 덮어쓰기 방지 → 잘못된 role 변경 방지

---

## 1️⃣ 초대/가입 시나리오 정리

### ✅ 시나리오 종류

1. **팀 생성 시 자동 가입** (`createTeam`)
   - 팀 생성자(owner)가 자동으로 `members/{uid}` 생성
   - `role: "admin"` 고정
   - 트랜잭션으로 처리

2. **초대 링크로 가입** (`joinTeam`)
   - 초대 링크(`/invite/{teamId}`) 클릭
   - 로그인 후 가입 요청
   - `role: "member"` 고정 (admin 불가)

3. **팀 검색 후 가입 요청** (`joinTeam`)
   - 팀 검색 페이지에서 가입 요청
   - 관리자 승인 후 `members/{uid}` 생성
   - `role: "member"` 고정

4. **블로그에서 가입 요청** (`joinTeam`)
   - 공개 블로그에서 "가입하기" 클릭
   - 관리자 승인 후 `members/{uid}` 생성
   - `role: "member"` 고정

### ✅ 플로우 다이어그램

```
[팀 생성]
  ↓
createTeam() (Callable)
  ↓
teams/{teamId} + members/{uid} (role: "admin")
  ↓
완료

[초대/가입]
  ↓
joinTeam() (Callable)
  ↓
members/{uid} 존재 확인
  ↓ (없으면)
members/{uid} 생성 (role: "member")
  ↓
완료
```

---

## 2️⃣ role 덮어쓰기 방지 가드

### ✅ 원칙

1. **팀 생성 시**: `role: "admin"`만 가능
2. **가입 시**: `role: "member"`만 가능 (admin 불가)
3. **role 변경**: `updateMemberRole` 함수로만 가능

### ✅ 가드 규칙

#### createTeam (팀 생성)
- `role: "admin"` 고정
- 팀 생성자만 가능

#### joinTeam (가입)
- `role: "member"` 고정
- `role: "admin"` 입력 시 에러
- 중복 가입 방지 (이미 존재하면 에러)

#### updateMemberRole (role 변경)
- `admin → member`: 가능 (권한 축소)
- `member → admin`: owner만 가능 (권한 확대)
- `admin → admin`: 불필요 (에러)
- `member → member`: 불필요 (에러)
- 팀 생성자(owner)의 role 변경: 금지

---

## 3️⃣ 잘못된 role 변경 방지

### ✅ 검증 로직

```typescript
// 1. 팀 생성자(owner)의 role 변경 금지
if (targetUid === ownerUid) {
  throw new HttpsError("permission-denied", "팀 생성자의 권한은 변경할 수 없습니다.");
}

// 2. 같은 role로 변경 시도 → 불필요
if (currentRole === newRole) {
  throw new HttpsError("failed-precondition", `이미 ${newRole} 권한입니다.`);
}

// 3. member → admin: owner만 가능
if (currentRole === "member" && newRole === "admin") {
  if (callerUid !== ownerUid) {
    throw new HttpsError("permission-denied", "admin 권한 부여는 팀 생성자만 가능합니다.");
  }
}
```

---

## 4️⃣ 중복 생성 방지

### ✅ 가드 규칙

1. **팀 생성 시**: 트랜잭션으로 처리 (중복 불가)
2. **가입 시**: `members/{uid}` 존재 확인 후 생성
3. **문서 ID = uid**: 원천적으로 중복 불가

### ✅ 트랜잭션 가드 예시

```typescript
const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
const memberSnap = await transaction.get(memberRef);

if (memberSnap.exists()) {
  throw new HttpsError("already-exists", "이미 이 팀의 멤버입니다.");
}

transaction.set(memberRef, memberData);
```

---

## 5️⃣ 구현 파일

### Functions

- `functions/src/createTeam.ts`: 팀 생성 (role: "admin" 고정)
- `functions/src/joinTeam.ts`: 팀 가입 (role: "member" 고정)
- `functions/src/updateMemberRole.ts`: role 변경 (검증 포함)

### Frontend

- `src/pages/team/TeamCreate.tsx`: `createTeam` Callable 호출
- `src/pages/team/TeamInvite.tsx`: `joinTeam` Callable 호출 (구현 필요)
- `src/pages/team/TeamSearchPage.tsx`: `joinTeam` Callable 호출 (구현 필요)
- `src/pages/team/TeamBlogPublicPage.tsx`: `joinTeam` Callable 호출 (구현 필요)

---

## ✅ 최종 체크리스트

- [x] 초대/가입 시나리오 정리
- [x] role 덮어쓰기 방지 가드 추가
- [x] 잘못된 role 변경 방지
- [x] 중복 생성 방지 가드
- [x] Functions 구현 (`joinTeam`, `updateMemberRole`)
- [ ] 프론트엔드 호출 구현 (TeamInvite, TeamSearchPage, TeamBlogPublicPage)

---

**작성일**: 2024년  
**상태**: ✅ Functions 구현 완료, 프론트엔드 호출 구현 필요

