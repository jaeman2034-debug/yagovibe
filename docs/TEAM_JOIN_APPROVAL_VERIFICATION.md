# 🔥 팀 가입 승인 후 UX 검증 가이드

## 🎯 목표

팀장이 승인한 직후, 요청자가 아무 행동을 안 해도 자연스럽게 팀 소속 선수(P2) 상태로 전이되는지 확인

## ✅ 승인 직후 데이터 상태 (팩트 체크)

팀장이 승인 버튼 클릭 후, Firestore 상태는 반드시 이렇다:

### 1️⃣ 팀 멤버 문서
```
teams/{teamId}/members/{userId}
{
  uid: userId,
  role: "member",
  status: "active",
  joinedAt: Timestamp
}
```

### 2️⃣ 팀 멤버 역인덱스
```
team_members/{teamId}_{userId}
{
  teamId: string,
  uid: userId,
  role: "member",
  status: "active",
  joinedAt: Timestamp
}
```

### 3️⃣ 가입 요청 문서
```
teamJoinRequests/{requestId}
{
  status: "approved",
  updatedAt: Timestamp
}
```

## 🔄 요청자 측 자동 변화

### Persona 전이 로직

요청자가 `/me` 진입 또는 새로고침 시:

1. **useMyTeams 훅 실행**
   - `team_members` 컬렉션에서 `uid == userId && status == "active"` 조회
   - 승인 후 `teamCount = 1` 반환

2. **resolvePersona 실행**
   ```typescript
   resolvePersona({
     isLoggedIn: true,
     hasProfile: true,
     teamCount: 1,  // ✅ 승인 후 1
     applicationCount: 0,
     role: "USER"
   })
   // 결과: P2 (팀 소속 선수)
   ```

3. **PersonaSection 렌더링**
   - P1 → P2로 자동 전이
   - `/me` 화면이 자동으로 변경됨

## 👀 요청자가 보게 되는 화면 변화

### 승인 전 (P1)
- 개인 체육인 카드 4종
- "팀에 소속될 수 있어요" 힌트
- OpportunitySection: "팀 참여" CTA

### 승인 후 (P2)
- 내 팀 카드 표시
- 팀 일정 / 공지
- 개인 기록 유지
- OpportunitySection: 없음 (또는 대회 신청 CTA)

## 🧪 QA 체크리스트

### 요청자 계정으로 확인

- [ ] 팀장 승인 후 `/me` 새로고침
  - [ ] 개인 체육인(P1) UI ❌
  - [ ] 팀 소속 선수(P2) UI ⭕
  - [ ] 콘솔 에러 0개
  - [ ] ErrorBoundary 미발동
  - [ ] 새로고침 / 시크릿 모드 동일 결과

- [ ] `/team` 페이지 접근
  - [ ] 팀 정보 표시
  - [ ] 팀원 목록에 자신 표시
  - [ ] 팀 일정 접근 가능

### 팀장 계정으로 확인

- [ ] 승인 후 요청 목록에서 사라짐
- [ ] 팀원 목록에 요청자 표시
- [ ] `team_members` 컬렉션에 요청자 추가 확인

## 🔥 핵심 원칙

### ✅ 해야 할 것
- 데이터 기반 자동 전이
- Persona는 `resolvePersona`만 사용
- 에러는 정상 상태로 처리

### ❌ 하면 안 되는 것
- 승인 후 `navigate('/team')` 같은 강제 이동
- 승인 알림 먼저 만들기
- 승인 여부 상태를 프론트 state로 들고 있기
- `if (approved) { ... }` 같은 조건문 추가

## 🧠 천재 포인트

**우리는 "가입 완료"라는 이벤트를 UX로 만들지 않았다.**

**대신 "상태가 바뀐 세계"를 보여준다.**

그래서:
- 중복 코드 없음
- 알림 없어도 인지 가능
- 버그 지점 없음
- Persona 전이는 구조의 결과

## 📊 데이터 흐름도

```
팀장 승인 클릭
  ↓
approveTeamJoinRequest()
  ↓
1. team_members/{teamId}_{userId} 생성 (status: "active")
2. teams/{teamId}/members/{userId} 생성
3. teamJoinRequests/{requestId} status: "approved"
  ↓
요청자 새로고침
  ↓
useMyTeams() 실행
  ↓
teamCount = 1 반환
  ↓
resolvePersona({ teamCount: 1, ... })
  ↓
Persona = P2
  ↓
/me 화면 자동 변경 (P2 UI)
```

## 🔍 디버깅 팁

### Persona가 P2로 전이되지 않는 경우

1. **team_members 컬렉션 확인**
   ```javascript
   // Firestore Console에서 확인
   team_members 컬렉션
   - 문서 ID: {teamId}_{userId}
   - status: "active" ✅
   ```

2. **useMyTeams 훅 확인**
   ```typescript
   // 콘솔에서 확인
   const { teamCount } = useMyTeams();
   console.log("teamCount:", teamCount); // 1이어야 함
   ```

3. **resolvePersona 확인**
   ```typescript
   const persona = resolvePersona({
     isLoggedIn: true,
     hasProfile: true,
     teamCount: 1, // ✅ 1이어야 함
     applicationCount: 0,
     role: "USER"
   });
   console.log("persona:", persona); // "P2"여야 함
   ```

### 승인 후에도 P1인 경우

- `team_members` 문서가 생성되지 않았을 수 있음
- `status`가 "active"가 아닐 수 있음
- `useMyTeams` 훅이 캐시된 데이터를 사용 중일 수 있음 (새로고침 필요)

## ✅ 검증 완료 기준

- [ ] 요청자 `/me` 페이지가 P2 UI로 표시됨
- [ ] 요청자 `/team` 페이지 접근 가능
- [ ] 팀장 요청 목록에서 사라짐
- [ ] 팀원 목록에 요청자 표시
- [ ] 콘솔 에러 없음
- [ ] 새로고침 후에도 동일
