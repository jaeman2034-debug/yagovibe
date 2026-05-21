# 🔥 Phase 1-5 통합 테스트 체크리스트

**생성일**: 2025-01-XX  
**목적**: 팀 도메인 리팩토링 완료 후 운영 안정화 검증  
**상태**: ✅ 준비 완료

---

## 📋 테스트 전 준비사항

### 1. Cloud Functions 배포 확인

```bash
# 배포 명령어
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate

# 또는 전체 배포
firebase deploy --only functions
```

**확인 사항**:
- [ ] `createTeam` 함수 배포 완료
- [ ] `onTeamMemberCreate` 함수 배포 완료
- [ ] `onTeamMemberDelete` 함수 배포 완료
- [ ] `onTeamMemberUpdate` 함수 배포 완료
- [ ] Firebase Console에서 함수 상태 확인

---

## 🧪 테스트 시나리오

### 테스트 1: 팀 생성 (createTeam)

**목적**: 팀 생성 시 모든 필드가 올바르게 설정되는지 확인

**실행**:
1. 팀 생성 API 호출 또는 UI에서 팀 생성
2. Firestore에서 `teams/{teamId}` 문서 확인

**검증 항목**:
- [ ] `memberCount = 1` (생성자가 첫 멤버)
- [ ] `membership = "non-member"` (기본값)
- [ ] `regionCode` 필드 존재 및 올바른 값 (예: "SEOUL_NOWON")
- [ ] `region` 필드 존재 (한글 지역명)
- [ ] `status = "active"`
- [ ] `ownerUid` 필드 존재

**확인 쿼리**:
```typescript
// Firestore Console 또는 코드에서
const teamDoc = await getDoc(doc(db, "teams", teamId));
const teamData = teamDoc.data();

console.log({
  memberCount: teamData.memberCount,        // 예상: 1
  membership: teamData.membership,         // 예상: "non-member"
  regionCode: teamData.regionCode,         // 예상: "SEOUL_NOWON" 등
  status: teamData.status,                 // 예상: "active"
});
```

---

### 테스트 2: 팀원 추가 (onTeamMemberCreate)

**목적**: 멤버 추가 시 인덱스 동기화 및 memberCount 증가 확인

**실행**:
1. `teams/{teamId}/members/{newUid}` 문서 생성
2. Cloud Function 트리거 확인
3. 결과 확인

**검증 항목**:
- [ ] `team_members/{userId}_{teamId}` 인덱스 문서 생성됨
- [ ] `team_members` 문서의 `role` 필드 올바름
- [ ] `team_members` 문서의 `status = "active"`
- [ ] `teams/{teamId}.memberCount` 증가 (예: 1 → 2)
- [ ] Cloud Functions 로그에 성공 메시지

**확인 쿼리**:
```typescript
// 1. 인덱스 확인
const indexDoc = await getDoc(
  doc(db, "team_members", `${userId}_${teamId}`)
);
console.log("인덱스 생성:", indexDoc.exists()); // 예상: true

// 2. memberCount 확인
const teamDoc = await getDoc(doc(db, "teams", teamId));
const memberCount = teamDoc.data()?.memberCount;
console.log("memberCount:", memberCount); // 예상: 이전값 + 1
```

**주의사항**:
- 비활성 멤버(`status !== "active"`)는 동기화되지 않아야 함
- 이미 존재하는 멤버 추가 시 중복 방지 확인

---

### 테스트 3: 팀원 삭제 (onTeamMemberDelete)

**목적**: 멤버 삭제 시 인덱스 삭제 및 memberCount 감소 확인

**실행**:
1. `teams/{teamId}/members/{uid}` 문서 삭제
2. Cloud Function 트리거 확인
3. 결과 확인

**검증 항목**:
- [ ] `team_members/{userId}_{teamId}` 인덱스 문서 삭제됨
- [ ] `teams/{teamId}.memberCount` 감소 (예: 2 → 1)
- [ ] `memberCount`가 0 미만으로 내려가지 않음
- [ ] Cloud Functions 로그에 성공 메시지

**확인 쿼리**:
```typescript
// 1. 인덱스 삭제 확인
const indexDoc = await getDoc(
  doc(db, "team_members", `${userId}_${teamId}`)
);
console.log("인덱스 삭제:", !indexDoc.exists()); // 예상: true

// 2. memberCount 확인
const teamDoc = await getDoc(doc(db, "teams", teamId));
const memberCount = teamDoc.data()?.memberCount;
console.log("memberCount:", memberCount); // 예상: 이전값 - 1, 최소 0
```

---

### 테스트 4: Role 변경 (onTeamMemberUpdate)

**목적**: 멤버 role 변경 시 인덱스 동기화 확인

**실행**:
1. `teams/{teamId}/members/{uid}.role` 변경 (예: "member" → "admin")
2. Cloud Function 트리거 확인
3. 결과 확인

**검증 항목**:
- [ ] `team_members/{userId}_{teamId}.role` 업데이트됨
- [ ] 변경사항이 없으면 동기화 스킵 (로깅 확인)
- [ ] Cloud Functions 로그에 업데이트 메시지

**확인 쿼리**:
```typescript
// 인덱스 role 확인
const indexDoc = await getDoc(
  doc(db, "team_members", `${userId}_${teamId}`)
);
const indexRole = indexDoc.data()?.role;
const memberDoc = await getDoc(
  doc(db, "teams", teamId, "members", userId)
);
const memberRole = memberDoc.data()?.role;

console.log("Role 동기화:", indexRole === memberRole); // 예상: true
```

**테스트 케이스**:
- [ ] `member` → `admin`
- [ ] `admin` → `member`
- [ ] `owner` → `admin` (권한상 불가능하지만 테스트)
- [ ] status만 변경 (role 변경 없음) → 동기화 스킵 확인

---

### 테스트 5: Legacy Route Redirect

**목적**: 기존 경로가 새 경로로 올바르게 리다이렉트되는지 확인

**실행**:
1. 브라우저에서 `/me/team/:teamId/manage` 접속
2. `/mypage/team/:teamId/manage` 접속
3. `/me/team/:teamId/invite` 접속

**검증 항목**:
- [ ] `/me/team/:teamId/manage` → `/teams/:teamId/manage` 리다이렉트
- [ ] `/mypage/team/:teamId/manage` → `/teams/:teamId/manage` 리다이렉트
- [ ] `/me/team/:teamId/invite` → `/teams/:teamId/invite` 리다이렉트
- [ ] 리다이렉트 후 페이지 정상 로드
- [ ] URL이 `/teams/:teamId/*`로 변경됨

**확인 방법**:
```typescript
// 브라우저 개발자 도구 Network 탭에서
// 1. /me/team/:teamId/manage 요청
// 2. 301/302 리다이렉트 확인
// 3. 최종 URL이 /teams/:teamId/manage인지 확인
```

---

### 테스트 6: 권한 체크 (CaptainOnlyRoute)

**목적**: 팀 관리 페이지 접근 권한이 올바르게 작동하는지 확인

**실행**:
1. owner 계정으로 `/teams/:teamId/manage` 접속
2. admin 계정으로 `/teams/:teamId/manage` 접속
3. member 계정으로 `/teams/:teamId/manage` 접속

**검증 항목**:
- [ ] owner → 접근 허용 ✅
- [ ] admin → 접근 허용 ✅
- [ ] member → 접근 차단, `/me`로 리다이렉트 ✅
- [ ] 비로그인 → `/login`으로 리다이렉트 ✅

**확인 방법**:
```typescript
// 각 역할별로 테스트
// 1. owner/admin: 페이지 정상 로드
// 2. member: 리다이렉트 + 토스트 메시지
// 3. 비로그인: 로그인 페이지로 이동
```

---

### 테스트 7: 팀 목록 조회 성능 (useMyTeams)

**목적**: team_members 인덱스를 통한 조회가 정상 작동하는지 확인

**실행**:
1. `useMyTeams` 훅 사용
2. 조회 성능 확인
3. 데이터 정확성 확인

**검증 항목**:
- [ ] `team_members` 컬렉션에서 조회됨
- [ ] 조회 속도 빠름 (< 500ms)
- [ ] 반환된 팀 목록 정확함
- [ ] role 정보 포함됨

**확인 쿼리**:
```typescript
// useMyTeams 훅 사용
const { teamMembers, loading } = useMyTeams();

// 확인
console.log({
  teamCount: teamMembers.length,
  teams: teamMembers.map(tm => ({
    teamId: tm.teamId,
    role: tm.role,
  })),
});
```

---

## 🐛 알려진 이슈 및 해결 방법

### 이슈 1: memberCount가 음수가 되는 경우

**원인**: 동시 삭제 또는 트랜잭션 충돌

**해결**: Cloud Function에서 `Math.max(0, count - 1)` 사용 (이미 구현됨)

**확인**:
```typescript
// onTeamMemberDelete에서
const newCount = Math.max(0, currentCount - 1);
```

---

### 이슈 2: team_members 인덱스가 생성되지 않는 경우

**원인**: Cloud Function 미배포 또는 트리거 실패

**해결**:
1. Cloud Functions 배포 상태 확인
2. Firebase Console에서 로그 확인
3. 수동으로 인덱스 생성 후 재테스트

---

### 이슈 3: Legacy redirect가 작동하지 않는 경우

**원인**: 라우트 순서 문제 또는 Navigate 컴포넌트 오류

**해결**:
1. `App.tsx`에서 라우트 순서 확인 (canonical이 먼저)
2. `LegacyTeamRouteRedirect` 컴포넌트 확인
3. 브라우저 캐시 클리어

---

## ✅ 통합 테스트 완료 기준

모든 테스트가 통과되어야 합니다:

- [ ] 테스트 1: 팀 생성 ✅
- [ ] 테스트 2: 팀원 추가 ✅
- [ ] 테스트 3: 팀원 삭제 ✅
- [ ] 테스트 4: Role 변경 ✅
- [ ] 테스트 5: Legacy Redirect ✅
- [ ] 테스트 6: 권한 체크 ✅
- [ ] 테스트 7: 팀 목록 조회 ✅

---

## 📊 성능 기준

- 팀 생성: < 2초
- 멤버 추가/삭제: < 1초 (Cloud Function 포함)
- 팀 목록 조회: < 500ms
- Legacy redirect: < 100ms

---

## 🔄 롤백 계획

문제 발생 시:

1. **Cloud Functions 롤백**:
   ```bash
   firebase functions:delete onTeamMemberCreate
   firebase functions:delete onTeamMemberDelete
   firebase functions:delete onTeamMemberUpdate
   ```

2. **수동 동기화 스크립트 실행** (필요시)

3. **데이터 수정**:
   - `memberCount` 수동 계산 및 업데이트
   - `team_members` 인덱스 수동 생성

---

## 📝 테스트 결과 기록

테스트 실행 후 아래 형식으로 기록:

```markdown
## 테스트 실행 일시
2025-01-XX XX:XX

## 결과
- [ ] 모든 테스트 통과
- [ ] 일부 테스트 실패 (상세 기록)

## 발견된 이슈
1. [이슈 설명]
   - 해결 방법:
   - 상태: 해결됨/미해결

## 다음 단계
- [ ] Step 2 진행 가능
- [ ] 추가 수정 필요
```

---

## 🚀 다음 단계

모든 테스트 통과 후:

**Step 2: 팀 경기 기록 시스템 구축**

예상 작업:
- `team_games` 컬렉션 설계
- 경기 결과 기록 시스템
- 팀 통계 자동 업데이트
- `/teams/:teamId/games` 페이지
- `/teams/:teamId/stats` 페이지
