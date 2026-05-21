# 🔄 team_members → teams/{teamId}/members/{uid} 마이그레이션 가이드

## ✅ 완료된 작업

### 1️⃣ TeamContext 구조 변경
- **기존**: `team_members` 루트 컬렉션 조회
- **변경**: `teams/{teamId}/members/{uid}` 서브컬렉션 조회
- **위치**: `src/context/TeamContext.tsx`

### 2️⃣ 마이그레이션 스크립트 작성
- **위치**: `scripts/migrate-team-members.ts`
- **기능**: `team_members` → `teams/{teamId}/members/{uid}` 자동 복사

### 3️⃣ Firestore Rules 업데이트
- **위치**: `firestore.rules`
- **변경**: `teams/{teamId}/members/{uid}` 구조 기준으로 권한 체크

---

## 🚀 마이그레이션 실행 방법

### 방법 1: Functions로 실행 (권장)

```typescript
// functions/src/migrateTeamMembers.ts 생성 후
import { migrateTeamMembers } from "../scripts/migrate-team-members";

// HTTP 함수로 노출
export const runTeamMembersMigration = onRequest(async (req, res) => {
  await migrateTeamMembers();
  res.json({ ok: true });
});
```

### 방법 2: 로컬 스크립트 실행

```bash
# TypeScript 실행
npx ts-node scripts/migrate-team-members.ts
```

### 방법 3: Firestore Console에서 수동 복사

1. **team_members 컬렉션 열기**
   - Firestore Console → `team_members` 컬렉션

2. **문서 확인**
   - `uid`: `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`
   - `teamId`: `7EVuSVuWeIYBxybFsHXE`
   - `role`: `admin`

3. **teams/{teamId}/members/{uid} 문서 생성**
   - 경로: `teams/7EVuSVuWeIYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2`
   - 필드:
     ```json
     {
       "role": "admin",
       "joinedAt": Timestamp.now()
     }
     ```

4. **ownerUid 확인 (선택)**
   - `teams/7EVuSVuWeIYBxybFsHXE` 문서 확인
   - `ownerUid` 필드가 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`인지 확인

---

## 📋 마이그레이션 체크리스트

### 사전 확인
- [ ] `team_members` 컬렉션에 데이터 존재 확인
- [ ] `teams/{teamId}` 문서 존재 확인
- [ ] 백업 완료 (선택)

### 마이그레이션 실행
- [ ] 마이그레이션 스크립트 실행
- [ ] 성공/실패 로그 확인
- [ ] `teams/{teamId}/members/{uid}` 문서 생성 확인

### 검증
- [ ] 페이지 새로고침
- [ ] "우리 팀 관리" 클릭
- [ ] 정상 진입 확인

### 후속 작업 (선택)
- [ ] `team_members` 컬렉션 삭제 (마이그레이션 완료 후)
- [ ] Firestore Rules에서 `team_members` 관련 규칙 제거

---

## 🔍 데이터 구조 비교

### ❌ 기존 구조 (team_members)
```
team_members/{docId}
  ├─ uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
  ├─ teamId: "7EVuSVuWeIYBxybFsHXE"
  └─ role: "admin"
```

### ✅ 새 구조 (teams/{teamId}/members/{uid})
```
teams/{teamId}
  └─ members/{uid}
      ├─ role: "admin"
      └─ joinedAt: Timestamp
```

---

## 🛡️ Firestore Rules 변경 사항

### 기존 (team_members 기준)
```javascript
match /team_members/{memberId} {
  allow read: if isSignedIn() && (
    request.auth.uid == resource.data.uid ||
    isTeamAdmin(resource.data.teamId)
  );
}
```

### 변경 (teams/{teamId}/members/{uid} 기준)
```javascript
match /teams/{teamId}/members/{memberId} {
  allow read: if request.auth != null && (
    request.auth.uid == memberId ||
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) ||
    // 관리자 체크
  );
}
```

---

## ⚠️ 주의사항

### 마이그레이션 전
- **백업**: `team_members` 컬렉션 데이터 백업 (선택)
- **테스트**: 개발 환경에서 먼저 테스트

### 마이그레이션 후
- **검증**: "우리 팀 관리" 정상 작동 확인
- **정리**: `team_members` 컬렉션 삭제 (선택)

---

## 🧪 검증 방법

### 1. 콘솔 로그 확인
정상 작동 시 다음 로그가 표시됩니다:
```
✅ [TeamContext.refreshTeam] 팀 찾음: {
  teamId: "7EVuSVuWeIYBxybFsHXE",
  memberPath: "teams/7EVuSVuWeIYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}
```

### 2. Firestore Console 확인
- 경로: `teams/7EVuSVuWeIYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2`
- 필드: `role`, `joinedAt` 존재 확인

### 3. 기능 테스트
- "우리 팀 관리" 클릭
- 정상 진입 확인
- 권한 기반 기능 정상 작동 확인

---

**작성일**: 2024년
**상태**: ✅ 마이그레이션 준비 완료

