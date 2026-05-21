# 🔥 Phase 1-5 통합 테스트 실행 가이드

**생성일**: 2025-01-XX  
**목적**: 7개 테스트 시나리오 순차 실행 가이드  
**예상 시간**: 30-60분

---

## 📋 테스트 전 준비사항

### 1. 환경 확인
- [ ] Firebase 프로젝트 선택됨 (`firebase use`)
- [ ] Cloud Functions 배포 완료
- [ ] Firestore 데이터베이스 접근 가능
- [ ] 테스트용 계정 3개 준비 (owner, admin, member)

### 2. 도구 준비
- [ ] Firebase Console 접속 가능
- [ ] Firestore Console 접속 가능
- [ ] 브라우저 개발자 도구 열기
- [ ] 테스트 결과 기록용 문서 준비

---

## 🧪 테스트 시나리오 실행

### 테스트 1: 팀 생성

**목적**: 팀 생성 시 모든 필드가 올바르게 설정되는지 확인

**실행 방법**:
1. 브라우저에서 `/sports/soccer/team/create` 접속
2. 팀 생성 폼 작성:
   - 팀 이름: "테스트 팀"
   - 지역: "서울시 노원구"
   - 종목: "soccer"
3. 팀 생성 버튼 클릭

**검증 방법**:

**방법 A: Firebase Console**
1. Firestore Console → `teams` 컬렉션
2. 생성된 팀 문서 확인

**방법 B: 코드로 확인**
```typescript
// 브라우저 개발자 도구 Console에서
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase"; // 경로 조정 필요

const teamId = "생성된_팀_ID";
const teamDoc = await getDoc(doc(db, "teams", teamId));
const teamData = teamDoc.data();

console.log("팀 생성 검증:", {
  memberCount: teamData.memberCount,        // 예상: 1
  membership: teamData.membership,         // 예상: "non-member"
  regionCode: teamData.regionCode,         // 예상: "SEOUL_NOWON"
  status: teamData.status,                 // 예상: "active"
  region: teamData.region,                 // 예상: "서울시 노원구"
});

// members 서브컬렉션 확인
const memberDoc = await getDoc(
  doc(db, "teams", teamId, "members", "생성자_UID")
);
const memberData = memberDoc.data();

console.log("멤버 생성 검증:", {
  role: memberData.role,                   // 예상: "owner"
  status: memberData.status,               // 예상: "active"
  userId: memberData.userId,              // 예상: 생성자 UID
});
```

**검증 항목**:
- [ ] `teams/{teamId}.memberCount = 1`
- [ ] `teams/{teamId}.membership = "non-member"`
- [ ] `teams/{teamId}.regionCode` 존재 (예: "SEOUL_NOWON")
- [ ] `teams/{teamId}.status = "active"`
- [ ] `teams/{teamId}/members/{uid}.role = "owner"`
- [ ] `teams/{teamId}/members/{uid}.status = "active"`

**결과 기록**:
```markdown
## 테스트 1 결과
- 실행 일시: 2025-01-XX XX:XX
- 팀 ID: [기록]
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 2: team_members 인덱스 생성

**목적**: 팀 생성 시 team_members 인덱스가 자동 생성되는지 확인

**실행 방법**:
- 테스트 1에서 생성한 팀의 teamId 사용

**검증 방법**:

**Firebase Console**:
1. Firestore Console → `team_members` 컬렉션
2. 문서 ID 형식: `{userId}_{teamId}` 확인
3. 문서 내용 확인

**코드로 확인**:
```typescript
const userId = "생성자_UID";
const teamId = "테스트_1에서_생성한_팀_ID";
const indexDocId = `${userId}_${teamId}`;

const indexDoc = await getDoc(doc(db, "team_members", indexDocId));

console.log("team_members 인덱스 검증:", {
  exists: indexDoc.exists(),               // 예상: true
  teamId: indexDoc.data()?.teamId,        // 예상: teamId와 일치
  userId: indexDoc.data()?.userId,        // 예상: userId와 일치
  role: indexDoc.data()?.role,            // 예상: "owner"
  status: indexDoc.data()?.status,        // 예상: "active"
});
```

**검증 항목**:
- [ ] `team_members/{userId}_{teamId}` 문서 존재
- [ ] `team_members.teamId` = `teams` 문서 ID와 일치
- [ ] `team_members.userId` = 생성자 UID
- [ ] `team_members.role = "owner"`
- [ ] `team_members.status = "active"`

**결과 기록**:
```markdown
## 테스트 2 결과
- 실행 일시: 2025-01-XX XX:XX
- 인덱스 문서 ID: [기록]
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 3: 팀원 추가

**목적**: 멤버 추가 시 인덱스 동기화 및 memberCount 증가 확인

**실행 방법**:
1. 팀 관리 페이지에서 팀원 추가
2. 또는 코드로 직접 생성:
```typescript
// 팀원 추가 (테스트용)
const newMemberUid = "새_멤버_UID";
await setDoc(
  doc(db, "teams", teamId, "members", newMemberUid),
  {
    userId: newMemberUid,
    role: "member",
    status: "active",
    joinedAt: serverTimestamp(),
  }
);
```

**검증 방법**:

**즉시 확인** (Cloud Function 트리거 후):
```typescript
// 1. 인덱스 생성 확인
const newIndexDocId = `${newMemberUid}_${teamId}`;
const newIndexDoc = await getDoc(doc(db, "team_members", newIndexDocId));

console.log("팀원 추가 인덱스 검증:", {
  exists: newIndexDoc.exists(),            // 예상: true
  role: newIndexDoc.data()?.role,          // 예상: "member"
});

// 2. memberCount 증가 확인
const teamDoc = await getDoc(doc(db, "teams", teamId));
const memberCount = teamDoc.data()?.memberCount;

console.log("memberCount 검증:", {
  current: memberCount,                    // 예상: 2 (이전 1 + 1)
});
```

**검증 항목**:
- [ ] `team_members/{newUid}_{teamId}` 인덱스 생성됨
- [ ] `team_members.role = "member"`
- [ ] `teams/{teamId}.memberCount` 증가 (1 → 2)
- [ ] Cloud Functions 로그에 성공 메시지

**주의사항**:
- Cloud Function 트리거까지 약간의 지연 시간 있을 수 있음 (1-3초)
- 즉시 확인되지 않으면 잠시 대기 후 재확인

**결과 기록**:
```markdown
## 테스트 3 결과
- 실행 일시: 2025-01-XX XX:XX
- 추가된 멤버 UID: [기록]
- 이전 memberCount: [기록]
- 현재 memberCount: [기록]
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 4: 팀원 삭제

**목적**: 멤버 삭제 시 인덱스 삭제 및 memberCount 감소 확인

**실행 방법**:
1. 테스트 3에서 추가한 멤버 삭제
2. 또는 코드로 직접 삭제:
```typescript
// 팀원 삭제 (테스트용)
await deleteDoc(doc(db, "teams", teamId, "members", newMemberUid));
```

**검증 방법**:

**즉시 확인** (Cloud Function 트리거 후):
```typescript
// 1. 인덱스 삭제 확인
const deletedIndexDoc = await getDoc(
  doc(db, "team_members", `${newMemberUid}_${teamId}`)
);

console.log("팀원 삭제 인덱스 검증:", {
  exists: deletedIndexDoc.exists(),        // 예상: false
});

// 2. memberCount 감소 확인
const teamDoc = await getDoc(doc(db, "teams", teamId));
const memberCount = teamDoc.data()?.memberCount;

console.log("memberCount 검증:", {
  current: memberCount,                    // 예상: 1 (이전 2 - 1)
  isNotNegative: memberCount >= 0,        // 예상: true
});
```

**검증 항목**:
- [ ] `team_members/{uid}_{teamId}` 인덱스 삭제됨
- [ ] `teams/{teamId}.memberCount` 감소 (2 → 1)
- [ ] `memberCount`가 0 미만으로 내려가지 않음
- [ ] Cloud Functions 로그에 성공 메시지

**결과 기록**:
```markdown
## 테스트 4 결과
- 실행 일시: 2025-01-XX XX:XX
- 삭제된 멤버 UID: [기록]
- 이전 memberCount: [기록]
- 현재 memberCount: [기록]
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 5: Role 변경

**목적**: 멤버 role 변경 시 인덱스 동기화 확인

**실행 방법**:
1. 팀 관리 페이지에서 멤버 role 변경 (member → admin)
2. 또는 코드로 직접 변경:
```typescript
// Role 변경 (테스트용)
await updateDoc(
  doc(db, "teams", teamId, "members", memberUid),
  {
    role: "admin",
  }
);
```

**검증 방법**:

**즉시 확인** (Cloud Function 트리거 후):
```typescript
// 1. 원본 role 확인
const memberDoc = await getDoc(
  doc(db, "teams", teamId, "members", memberUid)
);
const memberRole = memberDoc.data()?.role;

// 2. 인덱스 role 확인
const indexDoc = await getDoc(
  doc(db, "team_members", `${memberUid}_${teamId}`)
);
const indexRole = indexDoc.data()?.role;

console.log("Role 동기화 검증:", {
  memberRole,                              // 예상: "admin"
  indexRole,                               // 예상: "admin"
  synchronized: memberRole === indexRole, // 예상: true
});
```

**검증 항목**:
- [ ] `teams/{teamId}/members/{uid}.role` 변경됨
- [ ] `team_members/{uid}_{teamId}.role` 동기화됨
- [ ] 두 role 값이 일치함
- [ ] Cloud Functions 로그에 업데이트 메시지

**테스트 케이스**:
- [ ] `member` → `admin`
- [ ] `admin` → `member`
- [ ] status만 변경 (role 변경 없음) → 동기화 스킵 확인

**결과 기록**:
```markdown
## 테스트 5 결과
- 실행 일시: 2025-01-XX XX:XX
- 변경된 멤버 UID: [기록]
- 이전 role: [기록]
- 변경된 role: [기록]
- 동기화 여부: [ ] 성공 / [ ] 실패
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 6: 권한 접근 (CaptainOnlyRoute)

**목적**: 팀 관리 페이지 접근 권한이 올바르게 작동하는지 확인

**실행 방법**:
1. **owner 계정으로 테스트**:
   - `/teams/:teamId/manage` 접속
   - 페이지 정상 로드 확인

2. **admin 계정으로 테스트**:
   - `/teams/:teamId/manage` 접속
   - 페이지 정상 로드 확인

3. **member 계정으로 테스트**:
   - `/teams/:teamId/manage` 접속
   - 접근 차단 및 `/me`로 리다이렉트 확인

4. **비로그인 상태로 테스트**:
   - `/teams/:teamId/manage` 접속
   - `/login`으로 리다이렉트 확인

**검증 방법**:

**브라우저 개발자 도구**:
1. Network 탭에서 리다이렉트 확인
2. Console에서 권한 체크 로그 확인

**검증 항목**:
- [ ] owner → 접근 허용 ✅
- [ ] admin → 접근 허용 ✅
- [ ] member → 접근 차단, `/me`로 리다이렉트 ✅
- [ ] 비로그인 → `/login`으로 리다이렉트 ✅
- [ ] 토스트 메시지 표시 (member 차단 시)

**결과 기록**:
```markdown
## 테스트 6 결과
- 실행 일시: 2025-01-XX XX:XX
- owner 접근: [ ] 성공 / [ ] 실패
- admin 접근: [ ] 성공 / [ ] 실패
- member 접근: [ ] 차단됨 / [ ] 허용됨 (오류)
- 비로그인 접근: [ ] 리다이렉트됨 / [ ] 실패
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

### 테스트 7: Legacy Route Redirect

**목적**: 기존 경로가 새 경로로 올바르게 리다이렉트되는지 확인

**실행 방법**:
1. 브라우저에서 직접 URL 입력:
   - `/me/team/:teamId/manage`
   - `/mypage/team/:teamId/manage`
   - `/me/team/:teamId/invite`

2. 또는 코드로 확인:
```typescript
// React Router의 경우
// 브라우저 개발자 도구 Console에서
window.location.href = `/me/team/${teamId}/manage`;
// → 자동으로 /teams/:teamId/manage로 리다이렉트되는지 확인
```

**검증 방법**:

**브라우저 개발자 도구**:
1. Network 탭 열기
2. Legacy 경로 접속
3. 리다이렉트 확인:
   - Status Code: 301 또는 302
   - Location 헤더: `/teams/:teamId/manage`

**검증 항목**:
- [ ] `/me/team/:teamId/manage` → `/teams/:teamId/manage` 리다이렉트
- [ ] `/mypage/team/:teamId/manage` → `/teams/:teamId/manage` 리다이렉트
- [ ] `/me/team/:teamId/invite` → `/teams/:teamId/invite` 리다이렉트
- [ ] 리다이렉트 후 페이지 정상 로드
- [ ] URL이 `/teams/:teamId/*`로 변경됨

**결과 기록**:
```markdown
## 테스트 7 결과
- 실행 일시: 2025-01-XX XX:XX
- /me/team/:teamId/manage: [ ] 리다이렉트됨 / [ ] 실패
- /mypage/team/:teamId/manage: [ ] 리다이렉트됨 / [ ] 실패
- /me/team/:teamId/invite: [ ] 리다이렉트됨 / [ ] 실패
- 결과: [ ] 통과 / [ ] 실패
- 이슈: [없으면 "없음"]
```

---

## 📊 통합 테스트 결과 요약

모든 테스트 완료 후 아래 형식으로 요약:

```markdown
# Phase 1-5 통합 테스트 결과

## 테스트 실행 일시
2025-01-XX XX:XX ~ XX:XX

## 테스트 결과

| 테스트 | 결과 | 비고 |
|--------|------|------|
| 테스트 1: 팀 생성 | [ ] 통과 / [ ] 실패 | |
| 테스트 2: team_members 인덱스 | [ ] 통과 / [ ] 실패 | |
| 테스트 3: 팀원 추가 | [ ] 통과 / [ ] 실패 | |
| 테스트 4: 팀원 삭제 | [ ] 통과 / [ ] 실패 | |
| 테스트 5: Role 변경 | [ ] 통과 / [ ] 실패 | |
| 테스트 6: 권한 접근 | [ ] 통과 / [ ] 실패 | |
| 테스트 7: Legacy Redirect | [ ] 통과 / [ ] 실패 | |

## 전체 결과
- [ ] 모든 테스트 통과
- [ ] 일부 테스트 실패 (상세 기록)

## 발견된 이슈
1. [이슈 설명]
   - 해결 방법:
   - 상태: [ ] 해결됨 / [ ] 미해결

## 다음 단계
- [ ] Step 1 완료 → Step 2 진행 가능
- [ ] 추가 수정 필요
```

---

## ✅ Step 1 완료 기준

다음이 모두 만족되면 Step 1 완료:

- [ ] createTeam 정상 작동
- [ ] memberCount 정상 업데이트
- [ ] team_members sync 정상
- [ ] role 변경 sync 정상
- [ ] CaptainOnlyRoute 정상
- [ ] Legacy redirect 정상

**이 상태면 운영 안정화 완료입니다!** 🎉

---

## 🚀 Step 2 준비

Step 1 완료 후 바로 Step 2로 진행:

**다음 작업**: 팀 경기 기록 시스템 구축

**참고 문서**: `docs/TEAM_GAME_SYSTEM_DESIGN.md`

**예상 작업 시간**: 5일

---

## 💡 테스트 팁

### Cloud Function 지연 시간
- Firestore Trigger는 1-3초 지연될 수 있음
- 즉시 확인되지 않으면 잠시 대기 후 재확인

### 브라우저 캐시
- Legacy redirect 테스트 시 브라우저 캐시 클리어 권장
- 또는 시크릿 모드에서 테스트

### 로그 확인
- Firebase Console → Functions → Logs에서 실시간 로그 확인
- 에러 발생 시 로그에서 원인 파악

---

**테스트 실행 준비 완료!** 위 순서대로 진행하시면 됩니다. 🚀
