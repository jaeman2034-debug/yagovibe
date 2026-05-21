# 🔥 팀원 등록 기능 테스트 체크리스트 (천재 검증 루트)

## ✅ 사전 준비

### TEST 0️⃣ 사전 상태 확인 (30초)

Firestore에서 확인:

- [ ] `tournament.phase === "ROSTER_OPEN"`
- [ ] `team.rosterLocked === false`
- [ ] `team.captainUid` 정확히 설정됨
- [ ] `team.status === "APPROVED"`

**확인 경로:**
```
associations/{assocId}/tournaments/{tournamentId}
associations/{assocId}/tournaments/{tournamentId}/teams/{teamId}
```

---

## 🟢 정상 케이스 테스트

### TEST 1️⃣ Happy Path (정상 등록)

**조건:**
- [ ] 팀 대표 계정으로 로그인
- [ ] 팀 승인 완료된 상태
- [ ] `tournament.phase === "ROSTER_OPEN"`

**행동:**
1. 팀 상세 화면 진입
2. 팀원 추가 폼 표시 확인
3. 선수 1명 추가 (이름 + 출생연도 + 포지션)

**기대 결과:**
- [ ] Callable 성공 (toast.success 표시)
- [ ] `players` 컬렉션에 문서 생성 확인
- [ ] UI에 즉시 목록 반영
- [ ] 새로고침해도 유지

**확인 경로:**
```
associations/{assocId}/tournaments/{tournamentId}/teams/{teamId}/players/{playerId}
```

---

## 🔒 보안/권한 테스트

### TEST 2️⃣ 중복 방지 테스트

**행동:**
1. TEST 1에서 추가한 선수와 동일한 이름 + 출생연도로 다시 추가 시도

**기대 결과:**
- [ ] 등록 실패
- [ ] 에러 코드: `already-exists`
- [ ] UI 메시지: "이미 등록된 선수입니다. (이름 + 출생년도 중복)"

---

### TEST 3️⃣ 권한 테스트 (사고 방지 핵심)

**조건:**
- [ ] 팀 대표가 **아닌** 계정으로 로그인 (일반 유저 권장)

**행동:**
1. 같은 팀 상세 화면 진입
2. (옵션) 직접 Callable 호출 시도

**기대 결과:**
- [ ] 팀원 추가 버튼 **안 보임**
- [ ] 삭제 버튼 **안 보임**
- [ ] 직접 호출 시 `permission-denied` 에러

**콘솔 확인:**
```javascript
// 직접 호출 테스트 (브라우저 콘솔)
const functions = getFunctions(undefined, "asia-northeast3");
const addPlayer = httpsCallable(functions, "addPlayerCallable");
await addPlayer({ associationId, tournamentId, teamId, playerData });
// → permission-denied 에러 예상
```

---

### TEST 4️⃣ 단계(phase) 차단 테스트

**조건:**
1. 관리자 계정으로 `tournament.phase = "ROSTER_LOCKED"` 설정
2. 팀 대표 계정으로 다시 접속

**행동:**
1. 팀 상세 화면 진입
2. 팀원 추가 시도

**기대 결과:**
- [ ] 팀원 추가 폼 **숨김**
- [ ] 삭제 버튼 **숨김**
- [ ] 상태 메시지: "팀원 등록 기간이 아닙니다"
- [ ] Callable 호출 시 `failed-precondition` 에러

---

## 🛡️ 안정성 테스트

### TEST 5️⃣ 네트워크/실시간 실패 방어 테스트

**행동:**
1. DevTools → Network → Offline
2. 팀원 추가 시도
3. Online 복귀
4. 다시 등록 시도

**기대 결과:**
- [ ] Offline 시 등록 실패
- [ ] UI가 깨지지 않음
- [ ] 에러 메시지 정상 표시
- [ ] Online 복귀 후 정상 등록 가능

---

### TEST 6️⃣ 데이터 무결성 체크

**Firestore에서 확인:**

- [ ] `players` 문서에 `createdAt` 필드 존재
- [ ] `createdBy === captainUid`
- [ ] `team.rosterCount` 자동 증가 (옵션)

**Rules 테스트:**
- [ ] 직접 콘솔에서 `players` 문서 수정 시도
- [ ] Rules에 의해 차단되는지 확인

**콘솔 테스트:**
```javascript
// Firestore 콘솔에서 직접 수정 시도
// → Rules에 의해 차단되어야 함
```

---

## 📊 테스트 결과 판정

### 🟢 전부 통과
→ 다음 단계로 바로 진행 가능

### 🟡 TEST 1~2만 통과
→ UI/권한 미세 조정 필요

### 🔴 TEST 3~4 실패
→ Rules/Callable 즉시 수정 필요

---

## 🔧 문제 발생 시 체크 포인트

### 팀원 추가 버튼이 안 보임
- [ ] `isCaptain` 체크: `user?.uid === team.captainUid`
- [ ] `tournament.tournamentPhase === "ROSTER_OPEN"`
- [ ] `!team.rosterLocked`

### Callable 호출 실패
- [ ] Functions 배포 확인: `firebase deploy --only functions:addPlayerCallable`
- [ ] Region 확인: `asia-northeast3`
- [ ] 인증 토큰 확인: 로그인 상태

### 중복 체크 안 됨
- [ ] Firestore 인덱스 확인 (name + birthYear 복합 인덱스)
- [ ] Callable 함수 로그 확인

### Rules 차단 안 됨
- [ ] Rules 배포 확인: `firebase deploy --only firestore:rules`
- [ ] Rules 함수 확인: `isTeamCaptain()`, `isRosterOpen()`

---

## 📝 테스트 결과 기록

**테스트 날짜:** _______________

**테스트자:** _______________

**통과한 테스트:** TEST 0️⃣, 1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣, 6️⃣

**실패한 테스트:** _______________

**실패 원인:** _______________

**수정 사항:** _______________
