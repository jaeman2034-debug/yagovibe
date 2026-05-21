# 🧪 실전 테스트 체크리스트

## ✅ 현재 상태 확인 (0단계)

### 화면 상태
- [x] ✅ 팀원 등록 진행 중 (ROSTER_OPEN)
- [x] ❌ 승인 팀 0
- [x] 🔴 팀원 명단 잠금 버튼 비활성화
- [x] 체크인 시작 ❌ (당연히 불가)

**결론**: 100% 정상 → 서버 FSM / UI / 조건이 완벽히 일치

---

## ✅ 실전 테스트 1단계 — 승인 팀 생성 테스트

### 행동
1. 참가팀 관리 탭 이동
2. 팀 1개 이상을 APPROVED로 변경

### 기대 결과 (즉시)
- [ ] 승인 팀 수: 1 이상
- [ ] 빨간 경고 메시지 사라짐
- [ ] 🔓 팀원 명단 잠금 버튼 활성화

### ❌ 실패 조건
- 승인했는데 버튼 그대로 비활성 → **stats 업데이트 문제**

### 확인 포인트
```javascript
// 브라우저 콘솔에서 확인
const statsRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}/stats/teams`);
const statsSnap = await getDoc(statsRef);
console.log("approvedCount:", statsSnap.data()?.approvedCount);
```

---

## ✅ 실전 테스트 2단계 — 연타/중복 클릭 방어

### 행동
팀원 명단 잠금 버튼을 빠르게 3~5회 클릭

### 기대 결과
- [ ] Phase 변경: 1회
- [ ] UI: "이미 잠금됨" or 비활성
- [ ] 서버:
  - [ ] `phaseVersion +1`
  - [ ] `phaseEvents 1건`

### ❌ 실패 조건
- `phaseEvents 2건 이상`
- `phaseVersion +2 이상`

### 확인 포인트
```javascript
// Firestore Console 또는 브라우저 콘솔
// phaseVersion 확인
const tournamentRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}`);
const tournamentSnap = await getDoc(tournamentRef);
console.log("phaseVersion:", tournamentSnap.data()?.phaseVersion);

// phaseEvents 확인
const phaseEventsRef = collection(db, `associations/${associationId}/tournaments/${tournamentId}/phaseEvents`);
const phaseEventsQuery = query(phaseEventsRef, orderBy("createdAt", "desc"), limit(5));
const phaseEventsSnap = await getDocs(phaseEventsQuery);
console.log("phaseEvents count:", phaseEventsSnap.size);
```

---

## ✅ 실전 테스트 3단계 — 멱등성(requestId) 검증

### 행동
같은 요청을 같은 requestId로 재전송 (네트워크 끊김 후 재시도 가정)

### 기대 결과
- [ ] 서버 응답: `alreadyInState: true` 또는 `replay: true`
- [ ] Phase 추가 변경 ❌

### 확인 포인트
```javascript
// Network 탭에서 확인
// 첫 번째 요청: alreadyInState: false
// 두 번째 요청 (같은 requestId): alreadyInState: true 또는 replay: true
```

---

## ✅ 실전 테스트 4단계 — CHECKIN_OPEN 전이

### 행동
ROSTER_LOCKED → CHECKIN_OPEN

### 기대 결과
- [ ] 체크인 영역 활성화
- [ ] 팀/팀원 수정 불가 유지
- [ ] `phaseEvents` 정상 기록

### ❌ 실패 조건
- 잠금 없이 체크인 가능
- 승인 팀 조건 재검사 안 됨

---

## 🧪 실전 테스트 5단계 — 실패 케이스 강제 검증

### 테스트 케이스

| 케이스 | 기대 결과 | 확인 방법 |
|--------|----------|----------|
| 승인팀 0 → 잠금 | `NO_APPROVED_TEAMS` | Network 탭 에러 코드 확인 |
| 일반 계정 호출 | `PERMISSION_DENIED` | 비관리자 계정으로 테스트 |
| 이미 CHECKIN_OPEN | `alreadyInState: true` | 같은 Phase로 재요청 |

👉 **이 3개 중 하나라도 어기면 배포 보류**

---

## ✅ 최종 판정 기준

- [ ] 승인 팀 생성 시 버튼 활성
- [ ] 잠금 연타에도 phase 1회 변경
- [ ] requestId 재시도 안전
- [ ] phaseEvents 정확
- [ ] CHECKIN_OPEN 정상 진입

**이 중 하나라도 만족 못 하면 ❌**

---

## 📸 테스트 중 캡처 포인트

1. **승인 팀 생성 후 화면**
   - 승인 팀 수 표시
   - 잠금 버튼 활성화 상태

2. **연타 테스트 후 Firestore**
   - `phaseVersion` 값
   - `phaseEvents` 개수

3. **실패 케이스 에러 메시지**
   - Network 탭 에러 응답
   - UI 에러 메시지

---

## 🔍 문제 발생 시 빠른 진단

### 문제: 승인했는데 버튼 비활성
**원인**: Stats 업데이트 실패
**확인**: `stats/teams` 문서의 `approvedCount` 값
**해결**: `syncStatsFromTeams` 함수 실행

### 문제: 연타 시 phaseVersion +2 이상
**원인**: 트랜잭션 재시도 실패
**확인**: GCP Logs에서 트랜잭션 충돌 로그
**해결**: 트랜잭션 로직 점검

### 문제: phaseEvents 2건 이상
**원인**: 트랜잭션 내 이벤트 로그 중복
**확인**: `phaseEvents` 컬렉션에서 중복 확인
**해결**: 트랜잭션 내 이벤트 로그 기록 로직 점검

---

## 📝 테스트 결과 보고 형식

```
테스트 단계: [1단계 / 2단계 / ...]
결과: [통과 / 실패]
문제: [문제 설명 또는 "없음"]
스크린샷: [있음 / 없음]
```

---

## 🎯 다음 단계

테스트 돌려보고:
👉 **"여기까지 통과"** / **"여기서 막힘"** 한 줄만 말해.

막힌 지점은 즉시 해부해서 수정 지시 내릴게.
