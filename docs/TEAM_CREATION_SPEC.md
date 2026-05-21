# 🔥 팀 생성 스펙 (정답 고정본)

## 📋 목표

팀 생성 → (권한 멤버 자동 생성) → (중복 방지) → (team_members 역할 문서화) → (Firestore 구조 다이어그램 확정)

이 흐름을 **"정답 스펙"**으로 고정합니다.

---

## 1️⃣ 팀 생성 시 멤버 자동 생성 로직

### ✅ 원칙 (정답)

팀 생성이 성공하면 반드시 동시에 아래 2개가 만들어져야 함:

1. `teams/{teamId}` (팀 문서)
2. `teams/{teamId}/members/{uid}` (권한용 멤버 문서: docId=uid)

**핵심**: "팀 생성"과 "권한 멤버 생성"은 분리하면 반드시 사고 난다. 그래서 한 트랜잭션(또는 배치)으로 묶는다.

### ✅ 구현 방식 (B안: Callable)

**B안 (강력 안정)**: Cloud Function으로 "서버에서만 생성"

- **장점**: 보안/일관성 최고, 클라이언트 변조 위험 최소
- **방식**:
  - 프론트는 `createTeamCallable()`만 호출
  - 함수가 팀+멤버를 트랜잭션으로 생성
  - Rules는 팀/멤버 직접 생성은 제한 가능

### ✅ 체크리스트

- [x] 팀 생성 API(Functions)에서 `members/{uid}` 반드시 만들고 있나?
- [x] 그 문서의 문서ID가 `uid`인가?
- [x] `role: "admin"`, `status: "active"` 들어가나?
- [x] 팀 문서의 `ownerUid`와 `members/{uid}.uid`가 일치하나?
- [x] 실패 시 롤백(트랜잭션/배치) 되나?

---

## 2️⃣ members 중복 생성 방지 가드

### (1) 권한용 멤버 중복

`teams/{teamId}/members/{uid}`는 docId가 `uid`라서 원천적으로 중복 불가 (이게 설계 이점)

✅ 하지만 "role 덮어쓰기 사고"는 생길 수 있음

→ "이미 있으면 수정 금지/최소한 수정 제한" 가드를 넣어야 함

### 가드 규칙 (정답)

생성 로직에서:
- `members/{uid}`가 이미 존재하면 create 금지
- 필요하면 "초대 수락" 같은 특정 케이스만 update 허용

### 트랜잭션 가드 예시 로직

```typescript
const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
const memberSnap = await transaction.get(memberRef);
if (memberSnap.exists()) {
  throw new HttpsError("already-exists", "이미 이 팀의 멤버입니다.");
}
transaction.set(memberRef, memberData);
```

### (2) 회원 프로필(랜덤ID) 중복

이건 `teams/{teamId}/members/{randomId}` 형태로 쓰면 중복이 쉽게 생김.

✅ 해결책: 프로필도 uid 기반으로 통일

- `teams/{teamId}/roster/{uid}` 같은 별도 컬렉션으로 빼고 docId=uid로 통일
- 그러면 중복 0

### ✅ 체크리스트

- [x] 권한용 멤버는 무조건 `members/{uid}`인가?
- [x] 생성 시 exists 체크(트랜잭션) 넣었나?
- [x] 프로필/선수명단은 권한용 컬렉션과 분리했나?

---

## 3️⃣ team_members 컬렉션 정리 기준 문서화

### ✅ 정답: team_members는 "역인덱스/검색용"으로만 쓴다

즉:

- ✅ "이 유저가 어떤 팀에 속해있나?" 빠르게 찾기
- ✅ 팀 목록/초대/알림 최적화
- ❌ 권한판별/관리자 체크에 쓰지 않음 (절대)

### ✅ 문서화 포맷 (고정)

#### team_members/{docId} 규칙

- **docId**: `${teamId}_${uid}` (강추) 또는 autoId
- **필드**:
  - `teamId`
  - `uid`
  - `role` (참고용)
  - `status`
  - `createdAt`

하지만 **진짜 권한 소스는 항상 이것**:

```
teams/{teamId}/members/{uid}
```

**한 문장으로 문서에 박아**:

> **Source of Truth = teams/{teamId}/members/{uid}**

### ✅ 체크리스트

- [x] 팀 권한은 무조건 subcollection `members`로만 본다 (프론트/함수 통일)
- [x] `team_members`는 조회 최적화용이며, 권한 판별 로직에서 제거
- [x] 규칙 위반(랜덤 members)을 감지/정리하는 운영 가이드 포함

---

## 4️⃣ Firestore 구조 다이어그램 (최종 합의본)

### ✅ 권장 최종 구조

```
users/{uid}
  - email, name, ...

teams/{teamId}
  - name
  - ownerUid
  - plan: "free" | "pro"
  - sportType
  - status: "active" | "inactive"
  - isDeleted: bool
  - createdAt

teams/{teamId}/members/{uid}           <-- ✅ 권한/접근의 Source of Truth
  - uid
  - role: "admin" | "member"
  - status: "active" | "inactive"
  - joinedAt

teams/{teamId}/blog_posts/{postId}     <-- ✅ 팀 블로그 글
  - postType
  - content
  - createdAt
  - createdBy
  - publishedAt
  - seoMeta

teams/{teamId}/blog/rateLimit          <-- ✅ 레이트리밋
  - lastSuccessAt

system/blog_generation_limits          <-- ✅ 월간 비용 상한
  - monthlyLimit
  - currentMonthCount
  - resetDate
  - lastUpdated

team_members/{teamId_uid}              <-- ✅ 역인덱스(선택)
  - teamId
  - uid
  - role (reference)
  - status
  - createdAt
```

---

## 📝 구현 파일

### Functions

- `functions/src/createTeam.ts`: 팀 생성 Callable 함수 (트랜잭션 처리)

### Frontend

- `src/pages/team/TeamCreate.tsx`: Callable 호출로 변경

### Rules

- `firestore.rules`: 팀 생성 시 `members/{uid}` 생성 허용 규칙 추가

---

## ✅ 최종 체크리스트

- [x] 팀 생성 로직이 B안(Callable)으로 확정
- [x] 확정한 방식으로 "팀 + members/{uid}" 트랜잭션/함수를 코드에 고정
- [x] `team_members`는 "역인덱스"로만 문서화하고, 권한 체크에서 제거
- [x] 중복 생성 방지 가드 추가
- [x] Firestore Rules 업데이트

---

**작성일**: 2024년  
**상태**: ✅ 완료

