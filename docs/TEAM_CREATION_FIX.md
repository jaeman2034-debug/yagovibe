# 🔥 팀 생성 코드 수정 완료

## 🚨 발견된 문제

### 문제 1: teamId 불일치
- `teams` 문서 ID: `yF4JLErgK294dnyiHOcc`
- `team_members.teamId`: `RebopABHiarIVQONL5jm`
- **결과**: Ghost team 발생

### 문제 2: 중복 필드
- `uid`와 `userId` 둘 다 존재
- **결과**: 데이터 일관성 문제

### 문제 3: teams/{teamId}/members 누락
- `TeamOnboarding.tsx`에서 `teams/{teamId}/members` 생성 안 함
- **결과**: 권한 체크 실패 가능

---

## ✅ 수정 완료

### 1. TeamOnboarding.tsx
**변경 사항**:
- ✅ `teamId` 변수에 `teamRef.id` 저장
- ✅ `teams/{teamId}/members/{uid}` 생성 추가
- ✅ `team_members` 문서 ID 형식: `${uid}_${teamId}`
- ✅ `team_members.teamId`가 `teamRef.id`와 일치하도록 보장
- ✅ `userId`만 사용 (uid 제거)

**수정 전**:
```typescript
const teamRef = await addDoc(collection(db, "teams"), {...});
await addDoc(collection(db, "team_members"), {
  teamId: teamRef.id, // ❌ addDoc 사용 (문서 ID 랜덤)
  uid: user.uid, // ❌ uid 사용
});
```

**수정 후**:
```typescript
const teamRef = await addDoc(collection(db, "teams"), {...});
const teamId = teamRef.id; // ✅ 변수에 저장

// ✅ teams/{teamId}/members/{uid} 생성
await setDoc(doc(db, "teams", teamId, "members", user.uid), {
  userId: user.uid, // ✅ userId만 사용
  role: "owner",
  status: "active",
  joinedAt: serverTimestamp(),
});

// ✅ team_members 역인덱스 생성
await setDoc(doc(db, "team_members", `${user.uid}_${teamId}`), {
  teamId: teamId, // ✅ teamRef.id와 일치 보장
  userId: user.uid, // ✅ userId만 사용
  role: "owner",
  status: "active",
  createdAt: serverTimestamp(),
  joinedAt: serverTimestamp(),
});
```

---

### 2. createTeamSimple.ts
**변경 사항**:
- ✅ `team_members`에서 `uid` 필드 제거
- ✅ `userId`만 사용

**수정 전**:
```typescript
await setDoc(doc(db, "team_members", `${ownerUid}_${teamId}`), {
  userId: ownerUid,
  uid: ownerUid, // ❌ 중복 필드
  teamId,
  ...
});
```

**수정 후**:
```typescript
await setDoc(doc(db, "team_members", `${ownerUid}_${teamId}`), {
  teamId, // ✅ teamRef.id와 일치 보장
  userId: ownerUid, // ✅ userId만 사용
  ...
});
```

---

## 🔥 핵심 원칙 (절대 규칙)

### 1. teamId 일치 보장
```typescript
const teamRef = await addDoc(collection(db, "teams"), {...});
const teamId = teamRef.id; // ✅ 변수에 저장

// ✅ 모든 곳에서 teamId 사용
await setDoc(doc(db, "team_members", `${uid}_${teamId}`), {
  teamId: teamId, // ✅ teamRef.id와 일치
});
```

### 2. userId만 사용
```typescript
// ✅ 올바른 방법
{
  userId: user.uid,
  // uid 필드 없음
}

// ❌ 잘못된 방법
{
  userId: user.uid,
  uid: user.uid, // ❌ 중복
}
```

### 3. teams/{teamId}/members 필수 생성
```typescript
// ✅ 권한 소스 생성 (필수)
await setDoc(doc(db, "teams", teamId, "members", uid), {
  userId: uid,
  role: "owner",
  status: "active",
  joinedAt: serverTimestamp(),
});

// ✅ 역인덱스 생성 (조회 최적화)
await setDoc(doc(db, "team_members", `${uid}_${teamId}`), {
  teamId: teamId,
  userId: uid,
  role: "owner",
  status: "active",
  createdAt: serverTimestamp(),
  joinedAt: serverTimestamp(),
});
```

---

## 📋 수정된 파일

1. ✅ `src/pages/team/TeamOnboarding.tsx`
2. ✅ `src/lib/team/createTeamSimple.ts`

---

## 🚀 다음 단계

### 1. 기존 데이터 정리 (수동)
Firestore Console에서:
1. `team_members` 문서 확인
2. `teamId`가 실제 `teams` 문서 ID와 일치하는지 확인
3. 불일치 시 수정 또는 삭제

### 2. Ghost team 자동 정리
- ✅ `useMyTeams.ts`에서 이미 구현됨
- Ghost team 감지 시 `team_members` 자동 삭제

### 3. 데이터 마이그레이션 (선택)
- 기존 `team_members` 문서에서 `uid` 필드 제거
- `userId`만 남기기

---

## ✅ 완료 상태

| 문제 | 상태 | 해결 방법 |
|------|------|----------|
| teamId 불일치 | ✅ 해결 | `teamId` 변수 사용, 일치 보장 |
| 중복 필드 (uid/userId) | ✅ 해결 | `userId`만 사용 |
| teams/{teamId}/members 누락 | ✅ 해결 | 생성 로직 추가 |

---

## 🎯 최종 구조 (안정화)

### 팀 생성 플로우
```
1. teams/{teamId} 생성
   ↓
2. teams/{teamId}/members/{uid} 생성 (권한 소스)
   ↓
3. team_members/{uid}_{teamId} 생성 (역인덱스)
   ↓
4. teamId 일치 보장 ✅
```

### team_members 스키마 (최종)
```typescript
{
  teamId: string; // ✅ teams 문서 ID와 일치
  userId: string; // ✅ userId만 사용
  role: "owner" | "admin" | "member";
  status: "active";
  createdAt: Timestamp;
  joinedAt: Timestamp;
}
```
