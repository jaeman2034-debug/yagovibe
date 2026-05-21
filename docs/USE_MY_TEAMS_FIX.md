# 🔥 useMyTeams.ts 쿼리 필드 수정 완료

## 🚨 발견된 문제

### 문제: 쿼리 필드 불일치
- **코드**: `where("uid", "==", user.uid)`
- **실제 데이터**: `userId` 필드로 저장됨
- **결과**: 팀을 찾지 못함 → 빈 배열 반환

---

## ✅ 수정 완료

### 1. 쿼리 필드 변경
**변경 전**:
```typescript
const q = query(
  teamMembersRef,
  where("uid", "==", user.uid) // ❌ 잘못된 필드명
);
```

**변경 후**:
```typescript
const q = query(
  teamMembersRef,
  where("userId", "==", user.uid) // ✅ 올바른 필드명
);
```

---

### 2. 문서 ID 파싱 로직 수정
**변경 전**:
```typescript
// 형식: "${teamId}_${uid}" 가정
const possibleTeamId = docIdParts[0]; // ❌ 첫 번째 부분
```

**변경 후**:
```typescript
// 형식: "${uid}_${teamId}" (실제 형식)
if (docIdParts.length >= 2) {
  const possibleTeamId = docIdParts[1]; // ✅ 두 번째 부분이 teamId
}
```

---

### 3. 데이터 파싱 로직 개선
**변경 전**:
```typescript
uid: data.uid || data.userId || user.uid || "", // uid 우선
```

**변경 후**:
```typescript
uid: data.userId || data.uid || user.uid || "", // ✅ userId 우선 (uid는 레거시 호환)
```

---

## 🔥 핵심 원칙

### team_members 문서 구조
```typescript
{
  teamId: string; // ✅ teams 문서 ID와 일치
  userId: string; // ✅ 사용자 ID (uid는 레거시)
  role: "owner" | "admin" | "member";
  status: "active";
  createdAt: Timestamp;
  joinedAt: Timestamp;
}
```

### 문서 ID 형식
```
${userId}_${teamId}
```

예: `iUZB8RjKIEhb3uotZ6yqtpWtUQE2_yF4JLErgK294dnyiHOcc`

---

## 📋 수정된 파일

1. ✅ `src/hooks/useMyTeams.ts`
   - 쿼리 필드: `uid` → `userId`
   - 문서 ID 파싱: `${uid}_${teamId}` 형식 지원
   - 데이터 파싱: `userId` 우선

---

## 🚀 예상 결과

### 수정 전
```typescript
// 쿼리: where("uid", "==", user.uid)
// 결과: [] (데이터는 userId 필드로 저장되어 있어서 못 찾음)
```

### 수정 후
```typescript
// 쿼리: where("userId", "==", user.uid)
// 결과: [{ teamId: "yF4JLErgK294dnyiHOcc", ... }] ✅
```

---

## ✅ 완료 상태

| 문제 | 상태 | 해결 방법 |
|------|------|----------|
| 쿼리 필드 불일치 | ✅ 해결 | `uid` → `userId` |
| 문서 ID 파싱 오류 | ✅ 해결 | `${uid}_${teamId}` 형식 지원 |
| 데이터 파싱 우선순위 | ✅ 해결 | `userId` 우선 |

---

## 🎯 최종 확인

이제 `useMyTeams()` 훅이:
1. ✅ `userId` 필드로 올바르게 쿼리
2. ✅ 문서 ID에서 `teamId` 올바르게 추출
3. ✅ 팀 목록 정상 반환

**UI에서 팀을 찾지 못하는 문제가 해결됩니다!** 🚀
