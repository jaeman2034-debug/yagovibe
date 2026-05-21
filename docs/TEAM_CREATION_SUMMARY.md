# 🔥 팀 생성 코드 완전 정리

## ✅ 현재 상태

### 1. TeamOnboarding.tsx ✅
**위치**: `src/pages/team/TeamOnboarding.tsx`

**team_members 생성**: ✅ 완료
- 문서 ID: `${user.uid}_${teamId}` ✅
- 필드: `teamId`, `userId`, `role: "owner"`, `status: "active"` ✅

---

### 2. createTeamSimple.ts ✅
**위치**: `src/lib/team/createTeamSimple.ts`

**team_members 생성**: ✅ 완료
- 문서 ID: `${ownerUid}_${teamId}` ✅
- 필드: `teamId`, `userId`, `role: "owner"`, `status: "active"` ✅

---

### 3. Cloud Function createTeam ⚠️
**위치**: `functions/src/createTeam.ts`

**team_members 생성**: ✅ 완료
- 문서 ID: `${teamId}_${uid}` ⚠️ **형식 다름**
- 필드: `teamId`, `userId`, `role: "admin"`, `status: "active"` ✅

**문제**: 문서 ID 형식이 다름
- 현재: `${teamId}_${uid}`
- 표준: `${uid}_${teamId}`

---

## 🔥 문서 ID 형식 통일 필요

### 현재 상황
- `TeamOnboarding.tsx`: `${uid}_${teamId}` ✅
- `createTeamSimple.ts`: `${uid}_${teamId}` ✅
- `createTeam` (Cloud Function): `${teamId}_${uid}` ❌

### 표준 형식
```
${userId}_${teamId}
```

**이유**:
- `useMyTeams`에서 `userId`로 쿼리
- 문서 ID에서 `teamId` 추출 시 두 번째 부분 사용

---

## 🛠 수정 필요

### Cloud Function createTeam.ts
**변경 전**:
```typescript
const teamMemberRef = db.collection("team_members").doc(`${teamId}_${uid}`);
```

**변경 후**:
```typescript
const teamMemberRef = db.collection("team_members").doc(`${uid}_${teamId}`);
```

---

## 📊 팀 생성 경로 정리

### 경로 1: TeamOnboarding.tsx
- **경로**: `/team/onboarding` 또는 `/:type/team/onboarding`
- **team_members 생성**: ✅
- **형식**: `${uid}_${teamId}` ✅

### 경로 2: createTeamSimple.ts
- **사용 위치**: `PersonaP1TeamSearch.tsx`
- **team_members 생성**: ✅
- **형식**: `${uid}_${teamId}` ✅

### 경로 3: Cloud Function createTeam
- **사용 위치**: `TeamCreateForm.tsx` (비회원팀 생성)
- **team_members 생성**: ✅
- **형식**: `${teamId}_${uid}` ❌ **수정 필요**

---

## ✅ 완료 상태

| 경로 | team_members 생성 | 문서 ID 형식 | 상태 |
|------|------------------|-------------|------|
| TeamOnboarding.tsx | ✅ | `${uid}_${teamId}` | ✅ 정상 |
| createTeamSimple.ts | ✅ | `${uid}_${teamId}` | ✅ 정상 |
| createTeam (CF) | ✅ | `${teamId}_${uid}` | ⚠️ 수정 필요 |

---

## 🚀 다음 단계

1. ✅ `TeamOnboarding.tsx` - 완료
2. ✅ `createTeamSimple.ts` - 완료
3. ⚠️ `createTeam` (Cloud Function) - 문서 ID 형식 수정 필요

---

## 💡 참고

현재 Firestore에 있는 `team_members` 문서:
- 문서 ID: `zLAGT9yRGbAiWGVEHxLD` (랜덤 ID)
- 필드: `teamId`, `userId`, `role: "LEADER"`, `status: "active"`

이것은 수동으로 생성된 것으로 보입니다. 앞으로는 자동 생성되므로 문제 없습니다.
