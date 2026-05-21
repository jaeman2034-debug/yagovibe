# 🔥 통합 테스트 실행 가이드

## 📋 테스트 전 확인사항

✅ **Cloud Functions 배포 완료 확인**
- `onTeamMemberCreate` ✅
- `onTeamMemberDelete` ✅
- `onTeamMemberUpdate` ✅
- `createTeam` ✅

✅ **로그 모니터 실행 중**
```bash
firebase functions:log
```

---

## 🚀 방법 1: 자동화 테스트 스크립트 (권장)

### 준비

1. **테스트용 팀 생성** (브라우저에서)
   - `/sports/soccer/team/create` 접속
   - 팀 생성 후 `teamId`와 `ownerUid` 기록

2. **환경 변수 설정**
```bash
# PowerShell
$env:TEST_TEAM_ID="your-team-id"
$env:TEST_OWNER_UID="your-owner-uid"
$env:TEST_MEMBER_UID="test-member-uid"  # 선택사항
```

### 실행

```bash
cd functions
npm run test:integration
```

또는

```bash
npx ts-node scripts/test-team-integration.ts
```

### 결과 확인

- ✅ 모든 테스트 통과 → Step 1 완료
- ❌ 실패 항목 → 로그 확인 후 수정

---

## 🖱️ 방법 2: 수동 테스트 (브라우저 + Firestore)

### 테스트 1: 팀 생성

**브라우저**:
1. `/sports/soccer/team/create` 접속
2. 팀 정보 입력 후 생성
3. 생성된 팀의 `teamId` 기록

**Firestore Console 확인**:
```
teams/{teamId}
```
- ✅ `memberCount = 1`
- ✅ `membership = "non-member"`
- ✅ `regionCode` 존재
- ✅ `status = "active"`

```
teams/{teamId}/members/{uid}
```
- ✅ `role = "owner"`
- ✅ `status = "active"`

---

### 테스트 2: team_members 자동 생성

**Firestore Console 확인**:
```
team_members/{uid}_{teamId}
```
- ✅ 문서 존재
- ✅ `teamId` = 생성한 팀 ID
- ✅ `userId` = 소유자 UID
- ✅ `role = "owner"`
- ✅ `status = "active"`

**Functions 로그 확인**:
```
✅ [onTeamMemberCreate] team_members 인덱스 생성 완료
✅ [onTeamMemberCreate] memberCount 증가 완료
```

---

### 테스트 3: 팀원 추가

**브라우저**:
1. `/teams/:teamId/manage` 접속
2. 멤버 추가 (다른 사용자 UID 입력)
3. 추가 완료 대기 (3-5초)

**Firestore Console 확인**:
```
teams/{teamId}/members/{newUid}
```
- ✅ 문서 생성됨

```
team_members/{newUid}_{teamId}
```
- ✅ 인덱스 생성됨

```
teams/{teamId}
```
- ✅ `memberCount` 증가 (예: 1 → 2)

**Functions 로그 확인**:
```
✅ [onTeamMemberCreate] triggered
✅ team_members index created
✅ memberCount incremented
```

---

### 테스트 4: 팀원 삭제

**브라우저**:
1. `/teams/:teamId/manage` 접속
2. 멤버 삭제
3. 삭제 완료 대기 (3-5초)

**Firestore Console 확인**:
```
team_members/{uid}_{teamId}
```
- ✅ 문서 삭제됨

```
teams/{teamId}
```
- ✅ `memberCount` 감소 (예: 2 → 1)

**Functions 로그 확인**:
```
✅ [onTeamMemberDelete] triggered
✅ team_members index removed
✅ memberCount decremented
```

---

### 테스트 5: Role 변경

**브라우저**:
1. `/teams/:teamId/manage` 접속
2. 멤버 role 변경 (예: `member` → `admin`)
3. 변경 완료 대기 (3-5초)

**Firestore Console 확인**:
```
teams/{teamId}/members/{uid}
```
- ✅ `role = "admin"` (변경된 값)

```
team_members/{uid}_{teamId}
```
- ✅ `role = "admin"` (동기화됨)

**Functions 로그 확인**:
```
✅ [onTeamMemberUpdate] triggered
✅ team_members.role updated
```

---

### 테스트 6: 권한 접근

**브라우저 테스트**:

| 역할 | URL | 예상 결과 |
|------|-----|----------|
| owner | `/teams/:teamId/manage` | ✅ 접근 가능 |
| admin | `/teams/:teamId/manage` | ✅ 접근 가능 |
| member | `/teams/:teamId/manage` | ❌ 차단 (EmptyState) |

**확인 사항**:
- owner/admin: 관리 페이지 표시
- member: "권한이 없습니다" 메시지 표시

---

### 테스트 7: Legacy Redirect

**브라우저 테스트**:

1. **기존 경로 접속**:
   ```
   /me/team/:teamId/manage
   ```
   또는
   ```
   /mypage/team/:teamId/manage
   ```

2. **예상 결과**:
   - 자동으로 `/teams/:teamId/manage`로 리다이렉트
   - URL이 변경됨

**확인 사항**:
- ✅ 리다이렉트 작동
- ✅ 새 URL에서 정상 작동

---

## 📊 Step 1 완료 기준

다음 6개가 모두 ✅이면 **운영 안정화 완료**:

- [ ] `createTeam` 정상
- [ ] `team_members` 생성
- [ ] `memberCount` 증가
- [ ] `memberCount` 감소
- [ ] `role` 변경 sync
- [ ] Legacy redirect 정상

---

## 🐛 문제 발생 시

### Cloud Function이 트리거되지 않음

1. **Functions 로그 확인**:
```bash
firebase functions:log --limit 100
```

2. **에러 확인**:
   - 트리거 설정 확인
   - Firestore Rules 확인
   - 함수 배포 상태 확인

### memberCount가 업데이트되지 않음

1. **Functions 로그 확인**
2. **수동 동기화** (임시):
```typescript
// Firestore Console에서
const teamRef = doc(db, "teams", teamId);
await updateDoc(teamRef, {
  memberCount: 1  // 실제 멤버 수로 수정
});
```

### team_members 인덱스가 생성되지 않음

1. **Functions 로그 확인**
2. **멤버 status 확인** (비활성 멤버는 동기화 안 됨)
3. **수동 생성** (임시):
```typescript
const indexRef = doc(db, "team_members", `${userId}_${teamId}`);
await setDoc(indexRef, {
  teamId,
  userId,
  role: "member",
  status: "active",
  createdAt: serverTimestamp()
});
```

---

## ✅ 테스트 완료 후

모든 테스트 통과 시:

1. **결과 기록**:
   - 테스트 날짜
   - 통과한 테스트 목록
   - 발견된 이슈 (있다면)

2. **Step 2 준비**:
   - `TEAM_GAME_SYSTEM_DESIGN.md` 검토
   - 팀 경기 기록 시스템 구현 시작

---

## 📝 테스트 결과 템플릿

```markdown
## 테스트 결과

**날짜**: 2025-01-XX
**테스터**: [이름]

### 결과
- [x] 테스트 1: 팀 생성 ✅
- [x] 테스트 2: team_members 생성 ✅
- [x] 테스트 3: 팀원 추가 ✅
- [x] 테스트 4: 팀원 삭제 ✅
- [x] 테스트 5: Role 변경 ✅
- [x] 테스트 6: 권한 접근 ✅
- [x] 테스트 7: Legacy Redirect ✅

### 발견된 이슈
없음

### 결론
✅ Step 1 완료 - 운영 안정화 완료
```
