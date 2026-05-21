# 🔥 Firestore 구조 다이어그램 + 절대 규칙 문서 (헌법)

## 📋 목표

이 문서는 **"이 프로젝트의 헌법"**입니다.

한 번 정리해두면 다시는 이 이슈로 시간 안 날립니다.

팀원/미래의 나/AI 전부 이해하게 만드는 최종본입니다.

---

## 🎯 핵심 원칙 (3가지)

1. **members 문서 ID = uid**: 절대 규칙
2. **team_members는 보조 인덱스**: 권한 판단에 사용 안 함
3. **팀/멤버 생성은 서버 only**: Functions만 가능

---

## 1️⃣ Firestore 구조 다이어그램 (정본)

```
/users/{uid}
  - email
  - name
  - createdAt
  - ...

/teams/{teamId}
  - name
  - ownerUid
  - plan: "free" | "pro"
  - region
  - sportType
  - createdAt
  |
  ├─ /members/{uid}          ⭐️ 핵심 (권한의 기준)
  |     - uid
  |     - role: "admin" | "member"
  |     - status: "active" | "inactive"
  |     - joinedAt
  |
  ├─ /blog
  ├─ /blog_posts
  ├─ /fees
  └─ /auditLogs

/team_members/{teamId_uid}   (보조 인덱스)
  - teamId
  - uid
  - role
  - status
```

---

## 2️⃣ 절대 규칙 (이거 어기면 버그 난다)

### 🔑 RULE 1. 팀 권한의 단일 진실 소스 (Single Source of Truth)

**✅ 오직 여기만 믿는다**

```
teams/{teamId}/members/{uid}
```

**❌ 금지**

- `team_members`로 권한 판단 금지
- `users` 문서에 team 정보 넣지 말 것
- `members` 문서 ID 랜덤 ❌❌❌

---

### 🔑 RULE 2. members 문서 ID = uid (강제)

**절대 규칙**: `teams/{teamId}/members/{uid}`의 문서 ID는 반드시 `uid`와 일치해야 합니다.

**❌ 금지 구조**

```
members/{randomId}
  uid: "iUZB8Rj..."
```

**✅ 정답 구조**

```
members/{uid}
  uid: "{uid}"
```

**📌 이유**

- 프론트/Functions/Rules 전부 `doc(uid)` 기준
- `addDoc()` → 절대 사용 금지
- `setDoc(doc(uid))` → 중복 생성 원천 차단

---

### 🔑 RULE 3. members 생성/수정은 서버만

**클라이언트에서 가능한 것**

- 읽기
- 본인 status 조회

**서버에서만 가능한 것**

- 멤버 추가
- role 변경
- 강제 탈퇴
- admin 승격

**📌 이유**

- 권한 위조 방지
- 중복 생성 방지
- 데이터 오염 방지

---

### 🔑 RULE 4. team_members 컬렉션의 정체

**team_members = 조회용 캐시 / 역인덱스**

**용도**

- "내가 속한 팀 목록 빠르게 조회"
- 모바일 첫 로딩 최적화

**금지**

- ❌ 권한 체크
- ❌ 관리자 판단
- ❌ 멤버 여부 판단

**👉 없어도 서비스는 정상 동작**

---

### 🔑 RULE 5. 멤버 추가 플로우 (표준)

1. 서버에서 team 존재 확인
2. `members/{uid}` 존재 여부 확인
3. 없으면 `setDoc(members/{uid})`
4. `team_members` 인덱스 생성

**이미 있으면?**

- `status === inactive` → `active`로 복구
- role 변경 시 `updateDoc`

---

### 🔑 RULE 6. Firestore Rules 핵심 조건 (개념)

```javascript
match /teams/{teamId}/members/{uid} {
  allow read: if request.auth.uid == uid
    || isAdmin(teamId);
  
  allow write: if false; // 서버 only
}
```

**👉 members는 사람이 직접 고치지 않는다**

**절대 규칙**: `team_members` 컬렉션은 조회 최적화용 역인덱스입니다. 권한 판단에 사용하지 않습니다.

#### ✅ 용도

- "이 유저가 어떤 팀에 속해있나?" 빠르게 찾기
- 팀 목록/초대/알림 최적화
- 복잡한 쿼리 최적화

#### ❌ 금지

- 권한 판별/관리자 체크에 사용 ❌
- `members` 대신 사용 ❌
- Source of Truth로 사용 ❌

#### ✅ Source of Truth

**진짜 권한 소스는 항상 이것**:

```
teams/{teamId}/members/{uid}
```

#### 🔥 이유

- `team_members`는 선택적 컬렉션 (없어도 서비스 동작)
- `members` 서브컬렉션이 단일 진실 소스
- 권한 체크는 항상 `members/{uid}`에서 수행

---

## 3️⃣ 🚨 자주 발생한 실수 TOP 5 (이번에 다 겪은 것들)

1. ❌ `addDoc`으로 members 생성
2. ❌ uid 필드는 있는데 문서 ID는 랜덤
3. ❌ `team_members`로 권한 체크
4. ❌ emulator / prod 혼용
5. ❌ Rules보다 프론트를 먼저 의심

**👉 지금 전부 해결됨 👍**

---

## 4️⃣ ✅ 현재 상태 판정

- [x] `members/{uid}` 구조 정상
- [x] admin 권한 정상
- [x] 프론트 팀 관리 화면 정상 진입
- [x] Firestore 구조 이해 완료

**🔥 여기까지 오면 "팀/권한" 파트는 완성이다**

---

## 5️⃣ 기존 내용 (상세 설명)

**절대 규칙**: 팀 생성과 멤버 생성은 오직 Cloud Functions에서만 가능합니다.

#### ❌ 금지 (프론트엔드)

```typescript
// 프론트에서 직접 생성 금지
addDoc(collection(db, "teams"), { ... });
setDoc(doc(db, "teams", teamId, "members", uid), { ... });
```

#### ✅ 허용 (Cloud Functions)

```typescript
// Functions에서만 생성 가능
export const createTeam = onCall(async (request) => {
  // 트랜잭션으로 팀 + 멤버 생성
  await db.runTransaction(async (tx) => {
    tx.set(teamRef, teamData);
    tx.set(memberRef, memberData);
  });
});
```

#### 🔥 이유

- 보안/일관성 최고
- 클라이언트 변조 위험 최소
- 트랜잭션으로 원자성 보장
- 중복 생성 방지 가드 포함

---

## 3️⃣ 중복 생성 방지 가드

### ✅ 원칙

1. **문서 ID = uid**: 원천적으로 중복 불가
2. **트랜잭션 사용**: 존재 확인 후 생성
3. **setDoc + merge: false**: 이미 존재하면 에러

### ✅ 가드 로직

```typescript
await db.runTransaction(async (tx) => {
  const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
  const memberSnap = await tx.get(memberRef);
  
  // 이미 존재하면 에러
  if (memberSnap.exists()) {
    throw new HttpsError("already-exists", "이미 이 팀의 멤버입니다.");
  }
  
  // 존재하지 않으면 생성
  tx.set(memberRef, {
    uid,
    role: "member",
    status: "active",
    joinedAt: serverTimestamp(),
  });
});
```

---

## 4️⃣ 초대/가입 시나리오 가드

### ✅ 케이스 A: 이미 멤버

```typescript
if (memberDoc.exists()) {
  throw new HttpsError("already-exists", "이미 이 팀의 멤버입니다.");
}
```

### ✅ 케이스 B: 탈퇴 후 재가입

```typescript
if (memberDoc.exists() && memberDoc.data().status === "inactive") {
  // 재활성화
  await updateDoc(memberRef, {
    status: "active",
    rejoinedAt: serverTimestamp(),
  });
  return;
}
```

### ✅ 케이스 C: admin 승격

```typescript
// updateMemberRole 함수 사용
// member → admin: owner만 가능
if (currentRole === "member" && newRole === "admin") {
  if (callerUid !== ownerUid) {
    throw new HttpsError("permission-denied", "admin 권한 부여는 팀 생성자만 가능합니다.");
  }
}
```

---

## 5️⃣ role 덮어쓰기 방지

### ✅ 원칙

1. **팀 생성 시**: `role: "admin"`만 가능
2. **가입 시**: `role: "member"`만 가능 (admin 불가)
3. **role 변경**: `updateMemberRole` 함수로만 가능

### ✅ 가드 규칙

```typescript
// joinTeam: admin role 입력 시 에러
if (role === "admin") {
  throw new HttpsError("permission-denied", "admin 권한은 팀 생성 시에만 부여됩니다.");
}

// updateMemberRole: 팀 생성자(owner)의 role 변경 금지
if (targetUid === ownerUid) {
  throw new HttpsError("permission-denied", "팀 생성자의 권한은 변경할 수 없습니다.");
}
```

---

## 6️⃣ Firestore Rules (최종)

### ✅ teams/{teamId}

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능
  allow read: if request.auth != null;
  
  // 생성: Functions만 가능 (프론트 차단)
  allow create: if false; // 🔥 서버 only
  
  // 수정: Owner만 가능
  allow update: if request.auth != null && 
                 request.auth.uid in resource.data.get('owners', []);
  
  // 삭제: 금지
  allow delete: if false;
}
```

### ✅ teams/{teamId}/members/{uid}

```javascript
match /members/{memberId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if request.auth != null && (
    request.auth.uid == memberId ||
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid))
  );
  
  // 생성: Functions만 가능 (프론트 차단)
  allow create: if false; // 🔥 서버 only
  
  // 수정: OWNER, ADMIN만 가능
  allow update: if request.auth != null && (
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
    (exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == "admin")
  );
  
  // 삭제: 금지 (Soft Delete만 허용)
  allow delete: if false;
}
```

---

## 7️⃣ 체크리스트 (최종 확인)

### ✅ 데이터 구조

- [x] `teams/{teamId}/members/{uid}` 존재
- [x] 문서 ID = uid (랜덤 ID 아님)
- [x] `role: "admin"` 또는 `"member"`
- [x] `status: "active"`

### ✅ 코드 규칙

- [x] 프론트에서 `addDoc` 사용 안 함
- [x] 프론트에서 `setDoc` 사용 안 함 (Functions만)
- [x] `doc(db, "teams", teamId, "members", uid)` 사용
- [x] 랜덤 ID members 문서 정리(삭제)

### ✅ Functions

- [x] `createTeam`: 팀 + 멤버 트랜잭션 생성
- [x] `joinTeam`: 가입 시 members/{uid} 생성
- [x] `updateMemberRole`: role 변경 검증

### ✅ Rules

- [x] `teams/{teamId}` 생성: Functions만 가능
- [x] `teams/{teamId}/members/{uid}` 생성: Functions만 가능

---

## 8️⃣ 마이그레이션 가이드

### ✅ 기존 랜덤 ID members 문서 정리

```typescript
// 1. 모든 teams 조회
const teamsSnap = await getDocs(collection(db, "teams"));

// 2. 각 팀의 members 서브컬렉션 조회
for (const teamDoc of teamsSnap.docs) {
  const teamId = teamDoc.id;
  const membersSnap = await getDocs(
    collection(db, "teams", teamId, "members")
  );
  
  // 3. 문서 ID ≠ uid인 문서 찾기
  for (const memberDoc of membersSnap.docs) {
    const memberData = memberDoc.data();
    const uid = memberData.uid;
    
    // 4. 문서 ID가 uid와 다르면
    if (memberDoc.id !== uid) {
      // 올바른 위치에 문서 생성
      await setDoc(
        doc(db, "teams", teamId, "members", uid),
        {
          ...memberData,
          migratedAt: serverTimestamp(),
        },
        { merge: false }
      );
      
      // 기존 문서 삭제
      await deleteDoc(memberDoc.ref);
    }
  }
}
```

---

## 📝 요약 (한 줄씩)

1. **members 문서 ID = uid**: 절대 규칙
2. **team_members는 보조 인덱스**: 권한 판단에 사용 안 함
3. **팀/멤버 생성은 서버 only**: Functions만 가능
4. **중복 생성 방지**: 트랜잭션 + exists 체크
5. **role 덮어쓰기 방지**: 가입 시 member만, 변경은 함수로만

---

**작성일**: 2024년  
**상태**: ✅ 완료 (절대 규칙 고정)

