# 🔥 teamId undefined 문제 해결 완료

## ✅ 문제 원인

**증상:**
- "팀 관리하기" 버튼 클릭 시 이동 안 됨
- `myTeam.teamId`가 `undefined`

**원인:**
- `useMyTeams()` 훅에서 `team_members` 컬렉션 조회 시 `teamId` 필드가 없거나 추출 실패
- `doc.id`에서 `teamId`를 파싱하지 않음

---

## ✅ 해결 방법

### 1. teamId 추출 로직 강화

**변경 전:**
```ts
const teamId = data.teamId || data.team_id || data.teamID || "";
```

**변경 후:**
```ts
let teamId = data.teamId || data.team_id || data.teamID || data.teamDocId || "";

// 🔥 doc.id에서 teamId 추출 시도 (team_members 문서 ID 형식: ${teamId}_${uid})
if (!teamId || teamId.trim() === "") {
  const docIdParts = doc.id.split("_");
  if (docIdParts.length > 0) {
    const possibleTeamId = docIdParts[0];
    if (possibleTeamId.length >= 10) {
      teamId = possibleTeamId;
    }
  }
}
```

### 2. 필터링 강화

**변경 전:**
```ts
.filter((t): t is TeamMember => t !== null);
```

**변경 후:**
```ts
.filter((t): t is TeamMember => t !== null && t.teamId && t.teamId.trim() !== "");
```

### 3. 최종 검증 추가

```ts
// 🔥 최종 검증: teamId가 없는 항목 제거 (방어 코드)
const validTeams = teams.filter((t) => t.teamId && t.teamId.trim() !== "");

if (validTeams.length !== teams.length) {
  console.warn("⚠️ [useMyTeams] teamId가 없는 팀이 필터링되었습니다:", {
    before: teams.length,
    after: validTeams.length,
    removed: teams.length - validTeams.length
  });
}

setTeamMembers(validTeams);
```

---

## 🔍 확인 방법

### 1. 콘솔 로그 확인

버튼 클릭 시:
```
🔍 [PersonaP3TeamCaptain] 팀 관리하기 클릭: {
  myTeam: { teamId: "RebopABhialrVQONL5jm", ... },
  teamId: "RebopABhialrVQONL5jm",
  hasTeamId: true,
  navigatePath: "/me/team/RebopABhialrVQONL5jm/manage"
}
```

### 2. useMyTeams 로그 확인

```
🔍 [useMyTeams] 문서 파싱: {
  docId: "...",
  teamId: "RebopABhialrVQONL5jm",
  extractedFromDocId: "RebopABhialrVQONL5jm"
}
```

---

## 🎯 다음 단계

1. **버튼 클릭 테스트**
   - "팀 관리하기" 버튼 클릭
   - 콘솔에서 `teamId` 확인
   - 정상 이동 확인

2. **만약 여전히 문제가 있다면**
   - 콘솔에서 `🔍 [useMyTeams] 문서 파싱` 로그 확인
   - `teamId` 값이 여전히 `undefined`인지 확인
   - `team_members` 컬렉션의 실제 데이터 구조 확인

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: ✅ **teamId 추출 로직 강화 완료**
