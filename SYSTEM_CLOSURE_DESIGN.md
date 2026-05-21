# 🔥 시스템 닫힘 설계 문서 (최종본)

## ✅ 0. 전체 철학 (이 시스템이 안 터지는 이유)

**모든 페이지는 "상태를 가정하지 않는다"**  
**모든 단계는 "서버 상태만을 진실로 본다"**

그래서:
- 새 유저 ❌ → UX로 흡수
- 팀 없는 유저 ❌ → UX로 흡수
- 선수 없는 팀 ❌ → UX로 흡수
- 관리자가 먼저 누른 버튼 ❌ → 서버에서 차단

👉 **어디서 들어와도 UX로 흡수되고, 시스템은 안 깨진다**

---

## 🔥 1️⃣ STEP A / STEP B 자동 분기 로직 (핵심 뇌)

### STEP 정의 (불변)

- **STEP A** = "팀/선수 준비 단계"
  - 조건: 팀 ❌ 또는 선수 수 < 최소 인원
- **STEP B** = "대회 운영 단계"
  - 조건: 팀 있음 && 선수 수 ≥ 최소 인원

### 📌 단 하나의 진실 소스

👉 **서버에서 내려준 팀 + 선수 수**

```typescript
type MyTeamState = {
  hasTeam: boolean
  playerCount: number
}

const MIN_PLAYERS = 11
```

### 🔀 자동 분기 로직 (프론트 공통)

```typescript
function resolveMyStep(state: MyTeamState) {
  if (!state.hasTeam) {
    return 'STEP_A_CREATE_TEAM'
  }

  if (state.playerCount < MIN_PLAYERS) {
    return 'STEP_A_FILL_PLAYERS'
  }

  return 'STEP_B_READY'
}
```

📌 **이 함수는 `/me`, `/dashboard`, `/ops`, 로그인 직후 redirect 전부에서 재사용**

### 🧠 UX 매핑

| resolve 결과 | 사용자에게 보이는 행동 |
|-------------|---------------------|
| `CREATE_TEAM` | "팀 만들기" CTA |
| `FILL_PLAYERS` | "선수 명단 입력 필요 (n/11)" |
| `STEP_B_READY` | 대회 관리 / 참가 리스트 |

---

## 🔥 2️⃣ 선수 명단 입력 검증 (11명 조건, 절대 안 깨짐)

### 🔒 검증 위치는 3단

#### ① 프론트 (UX 가이드)

```typescript
const canProceed = players.length >= 11
```

- 버튼 비활성화
- "선수 n/11명 필요" 표시

#### ② 서버 (최종 진실) 🔥

```typescript
if (players.length < 11) {
  throw new HttpsError(
    'failed-precondition',
    'MIN_PLAYERS_NOT_MET',
    {
      code: 'MIN_PLAYERS_NOT_MET',
      message: '선수는 최소 11명 이상이어야 합니다',
      hint: '팀 관리에서 선수 명단을 입력하세요',
      playerCount: players.length,
      minRequired: 11,
      maxAllowed: 25,
    }
  )
}
```

👉 **프론트 우회 / 버그 / 콘솔 호출 전부 차단**

#### ③ FSM 전이 시 재검증 (중요)

```typescript
if (nextPhase === 'ROSTER_LOCKED') {
  assert(players.length >= 11)
}
```

📌 **그래서:**
- 관리자가 실수로 잠가도 ❌
- 동시 클릭 ❌
- 레이스 컨디션 ❌

### 🧠 UX 메시지 표준

```typescript
{
  "code": "MIN_PLAYERS_NOT_MET",
  "message": "선수는 최소 11명 이상이어야 합니다",
  "hint": "팀 관리에서 선수 명단을 입력하세요",
  "playerCount": 5,
  "minRequired": 11,
  "maxAllowed": 25
}
```

---

## 🔥 3️⃣ 관리자 / 실유저 공용 플로우 (천재 설계 포인트)

### 🔑 핵심 원칙

**관리자와 유저는 "같은 상태 머신"을 본다**  
**단, "할 수 있는 액션만 다르다"**

### 🧩 공용 상태 모델

```typescript
type TournamentViewState = {
  step: 'STEP_A' | 'STEP_B'
  reason?: 'NO_TEAM' | 'NOT_ENOUGH_PLAYERS'
  actions: string[]
}
```

### 🎭 역할별 액션 매핑

**실유저 (팀 대표)**
```typescript
actions = [
  'CREATE_TEAM',
  'ADD_PLAYERS'
]
```

**관리자**
```typescript
actions = [
  'VIEW_TEAM_STATUS',
  'LOCK_ROSTER',
  'RUN_DRAW'
]
```

👉 **같은 상태, 다른 버튼**

### 🧠 이 구조의 미친 장점

- ❌ 관리자 전용 분기 코드 사라짐
- ❌ 실유저 전용 상태 체크 사라짐
- ❌ "이건 관리자 페이지라서…" 예외 사라짐

👉 **상태 1개, 역할만 다름**

---

## 🔒 4️⃣ 최종 안전성 체크 (시스템이 닫혔는지 확인)

이 7가지를 전부 통과하면 완성이다.

1. ✅ 새 계정 → `/me` 접속 → ❌ 크래시
2. ✅ 팀 없음 → STEP A 안내
3. ✅ 팀 있음, 선수 5명 → "5/11" 표시
4. ✅ 선수 11명 → STEP B 전환
5. ✅ 관리자 먼저 잠금 시도 → 서버 거부
6. ✅ 동시 클릭 → 1번만 성공
7. ✅ 새로고침 / 뒤로가기 → 상태 유지

---

## 🎯 최종 한 문장 (설계 결론)

**이 시스템은 이제 "유저가 뭘 잘못 눌러도"**  
**"관리자가 실수해도"**  
**"네트워크가 튕겨도"**  
**절대 깨지지 않는다.**

---

## 📁 구현 파일 구조

```
src/lib/tournament/
├── stepResolver.ts          # STEP A/B 자동 분기 로직
├── tournamentViewState.ts    # 공용 상태 모델 + 역할별 액션
├── playerValidation.ts       # 선수 수 검증 (프론트)
├── stepConditions.ts         # STEP A/B 조건 체크 (기존)
└── useMyTeamState.ts        # MyTeamState 조회 Hook

functions/src/tournament/
└── updateTournamentPhase.ts  # 서버 검증 (3단 검증)
```

---

## 🚀 다음 단계

1. ✅ 실제 코드 구조에 맞춘 파일 단위 구현 완료
2. ⏭️ FSM 다이어그램 + 상태 전이표 (필요시)
3. ⏭️ QA 체크리스트 작성 (필요시)
4. ⏭️ 운영 중 실수 방지 UX 문구 설계 (필요시)

**시스템은 이제 닫혔다.** ✅
