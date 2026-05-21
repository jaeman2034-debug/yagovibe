# PR-10A — Challenge Rewards (Architecture Freeze, Spec Only)

**Status:** **IMPLEMENTATION COMPLETE** (코드 반영됨 · 배포는 `firebase deploy --only functions,firestore:rules,firestore:indexes`로 별도 실행).  
**Goal:** `challenge`를 **참여 시그널**에서 한 단계 나아가 **통제된 progression 시그널**로 쓰되, **PR-5.1급 파밍 벡터를 다시 열지 않는다**.

**See also:** [PR-9 — Async Challenge](pr-9-async-challenge.md), [PR-10B — Dribble](pr-10b-dribble-challenge.md).

**Single source of truth (구현 계약):** 본 파일만 — 구현 중 임의 변경 없음; 변경 시 본 문서 개정 + 명시적 승인.

---

## Locked reward policy (MVP — drift 방지 고정값)

```text
Reward policy (MVP):
- 10 XP per eligible best-score improvement (flat; no multipliers)
- maximum 2 rewarded improvements per user per UTC calendar day — in-scope 챌린지(`pk_challenge_v1`, `dribble_challenge_v1`) **합산** (cross-mode 파밍 방지)
- Eligibility: new submitted score must be strictly greater than prior personal best for that challengeId (equal score = no reward)
- Maximum theoretical XP from this source: 20 XP / user / UTC day
```

**Strictly-greater rule (필수 정의):**

| 이전 best | 이번 제출 | 보상 후보 |
|-----------|-----------|-----------|
| 500 | 500 | **아니오** (동점·재제출) |
| 500 | 501 | **예** (캡·ledger·기타 조건 통과 시) |

Micro-improvement 스팸(500→501→502…)은 **best-only만으로는 완화 불가** → **일일 cap**이 필수인 이유.

---

## UTC calendar day (implementation — server authority)

```text
server authority only
request.time (or equivalent server clock)
UTC day boundaries for cap + ledger keys
client new Date() / local-only "today" — forbidden
```

- **금지:** 클라이언트 `new Date()`·로컬 타임존만으로 “오늘” 분기 (타임존 drift·시계 조작·cap 우회·ledger 불일치).  
- **권장:** Cloud Callable / Admin에서 위 서버 기준으로 일(`yyyyMMdd` UTC)을 계산해 cap·ledger 키를 만든다.

**구현:** `claimChallengeReward` Callable에서 `Timestamp.now()`(Admin)로 UTC `yyyyMMdd` 키 생성. 클라는 날짜를 보내지 않음.

**prior best (strictly-greater) 구현:** `challenge_submissions`에서 `uid`+`challengeId` 일치 문서를 `score desc`로 **페이지 순회**하며, 현재 `submissionId`를 제외한 최대 `score`를 계산한다. 상한 없는 단일 `limit(N)` 스캔은 하지 않음. 페이지 하단 점수 `L`이 지금까지 본 타인 최고 `best` 이하이면 이후 페이지는 전부 `≤L`이므로 **조기 종료**. 비정상적으로 많은 제출(`PRIOR_BEST_MAX_PAGES` 초과)이면 **fail-closed**로 Callable 내부 오류 처리(잘못된 지급 방지).

---

## Contract shift (one sentence)

| Before (PR-9 / 10B) | After (PR-10A) |
|---------------------|----------------|
| `challenge = engagement signal` (non-reward) | `challenge = controlled progression signal` (limited XP) |

Trust model은 **여전히 client-trusted** — PR-10A는 **안티치트 완성이 아니라 보수적 보상 설계**다.

---

## IN scope

### 1. Reward coupling (challenge → XP)

- **허용:** `pk_challenge_v1`, `dribble_challenge_v1` **만**. (신규 모드는 별도 스펙 + rules 화이트리스트.)  
- **금지:** 클라이언트가 XP 문서를 직접 쓰는 것 — **callable 중재만**.

### 2. Best-only reward policy (strictly greater)

핵심 규칙:

```text
only strictly greater best-score improvements can grant XP (candidate)
```

예 (동일 `challengeId`·`uid` 기준 개인 최고점):

```text
best = 420
submit 390 → 0 XP
submit 500 → eligible (개선)
submit 450 → 0 XP
submit 510 → eligible (개선)
best = 510
submit 510 → 0 XP (동점, 보상 없음)
submit 511 → eligible (strictly greater, 캡·ledger 통과 시)
```

“제출”이 아니라 **역대 최고를 엄격히 넘긴 경우**만 보상 후보.

### 3. Daily reward cap (mandatory, LOCKED)

- **고정:** 사용자당 **UTC 자정 기준 일** **최대 2회** “보상이 실제로 지급된 최고점 개선” (`pk`+`dribble` 합산).  
- **고정:** 각 지급 **10 XP** (flat).  
- 일일 이론 상한: **20 XP / user / UTC day** (챌린지 보상 출처만).

### 4. Reward telemetry (mandatory, minimum set)

최소 4종 (구현 시 반드시 구분 가능):

```text
challenge_reward_granted
challenge_reward_blocked_cap
challenge_reward_blocked_not_best
challenge_reward_blocked_duplicate
```

추가 권장(선택): `challenge_reward_blocked_rules` 등.

**구현:** `functions/src/challenge/claimChallengeRewardCallable.ts`에서 `logger.info`로 위 이벤트 구분 기록. `grantAvatarXp` 성공 시에도 `challenge_reward_granted` 요약 로그.

### 5. Reward idempotency / ledger (mandatory)

**동일 지급·재호출에 XP가 두 번 나가면 안 됨.**

권장 문서 ID 패턴 (예시):

```text
challenge_reward_ledger/{uid}_{challengeId}_{yyyyMMdd}_{submissionId}
```

- `submissionId`: 보상 근거가 된 `challenge_submissions` 문서 id (또는 동등 고유 키).  
- callable replay 시 **동일 키 존재 → duplicate 차단**.

원칙: **callable이 지급 전에 ledger를 확인**한다.

**구현:** 위 패턴으로 `challenge_reward_ledger` 문서 생성 후 `grantAvatarXp` (`idempotencyKey: challenge_reward:${submissionId}`). 일일 합산은 동일 UTC 키로 `challenge_reward_ledger` 쿼리 + `challenge_reward_dailyCounters/{uid}_{utcDayKey}` 트랜잭션 보강.

### 6. Flow (callable-mediated only)

```text
submit challenge (기존 Firestore submission, 선택)
  → (optional) client calls claimChallengeReward or submit includes reward claim phase
  → Cloud Callable: eligibility (best-only, daily cap, ledger, rules bounds)
  → 기존 grantXp() (또는 동등 Admin 경로) with source e.g. challenge_reward / challenge_best_improvement
```

- **NO** client direct XP writes.  
- **NO** special one-off XP 파이프라인 분기 난립 — **`grantXp()` + 명시 `source`** 재사용 권장.

**구현:** 클라는 제출 후 `claimChallengeReward` Callable만 호출. 서버는 `grantAvatarXp(..., source: "challenge_best_improvement")`.

---

## OUT scope (explicit)

- Challenge로부터 **배지 해제**  
- **전역 리더보드**·공개 랭킹과 연동된 보상  
- 친구 초대·레퍼럴 보너스를 챌린지와 묶기  
- **실시간** 보상, 스트릭/콤보 멀티플라이어, 시즌 패스, 루트박스류  

---

## Critical architecture decision (locked)

- **Trust model:** PR-9와 동일하게 **client score는 여전히 trusted** — PR-10A에서 “검증된 경기 결과”를 주장하지 않는다.  
- 따라서 XP는 **작고·상한이 있고·파밍에 덜 민감한 보조 진행**이어야 하며, **주 경제 동력이 되면 안 됨**.

문구 고정:

```text
client score still trusted
reward must be conservative
```

---

## Anti-farming (must-have section, PR-5.1 lesson)

### Vectors

- 스팸 제출  
- **동일 점수 반복 제출** (strictly-greater로 차단)  
- **극미 상승 연타** (501→502→… — best-only만으로는 부족 → **일일 cap**으로 상한)  
- 모드 간 번갈아 파밍 (**일일 cap을 in-scope 합산으로 고정**)  
- 일 경계(rollover) 악용  
- callable 재호출·replay  

### Mitigations (모두 문서·구현에 반영)

- **best-only + strictly greater**  
- **daily cap**  
- **idempotency / ledger**  
- **telemetry**  
- **callable 단일 권한**  

---

## Revision gates (forbidden without explicit doc revision + approval)

- **배지**를 챌린지와 직접 결합  
- **상한 없는** 챌린지 보상  
- 점수 기반 **멀티플라이어** 난립  
- 현실과 맞지 않는 **trust / anti-cheat 주장**  
- **공개 경쟁 보상** (글로벌 랭킹과 결합된 인센티브)  

(PR-9에서 금지한 **전역 리더보드**와 정합.)

---

## Explicit NO (PR-10A 구현 중 — 별도 계약 개정 없이 열지 않음)

- **배지**를 챌린지 보상과 직접 결합  
- **보상 멀티플라이어**  
- **전역 리더보드**·공개 랭킹과 연동된 보상  
- 보상 경로에 **세 번째 챌린지 모드** 추가  
- **Trust model 변경** (점수는 여전히 client-trusted 전제)  
- **클라이언트 단독** 보상 판정 (callable 외 경로 금지)

---

## Implementation order (승인 후 — 권장 순서)

1. **Reward policy 상수** (10 XP, 일 2회, UTC, in-scope 합산).  
2. **Ledger 타입·컬렉션 계약** (`challenge_reward_ledger/...`).  
3. **Callable** reward evaluator (strictly-greater, cap, ledger, rules bounds).  
4. **XP 엔진 연동** (`grantXp` + `source`).  
5. **Telemetry** (최소 4종).  
6. **UI** — 보상 기대치 문구 (최고 갱신·일 한도·비동점).  
7. 본 문서 **PR-10A COMPLETE** 블록 갱신 및 운영 체크리스트.

---

## PR-10A COMPLETE (shipped in repo — deploy checklist)

```text
PR-10A COMPLETE (when shipped)

Controlled challenge → XP with best-only + daily cap + callable + ledger + telemetry.
Still client-trusted scores; conservative XP; no badges/global leaderboard coupling.

Delivered in codebase:
- Callable: claimChallengeReward (asia-northeast3) — eligibility, **prior best = full paginated scan** (no fixed top-100 cap), ledger reserve, grantAvatarXp(source challenge_best_improvement), **transactional rollback** with ledger `submissionId` ownership check on no_avatar / grant failure / idempotent skip at XP layer.
- Collections: challenge_reward_ledger, challenge_reward_dailyCounters — Firestore rules: client deny all.
- Index: challenge_reward_ledger uid + utcDayKey (composite).
- Client: PK / Dribble pages call claim after submission; toasts via notifyChallengeRewardClaim; copy explains UTC daily cap + strictly greater.
- Constants: functions/src/lib/challenge/challengeRewardConstants.ts + src/lib/challenge/challengeRewardConstants.ts (mirror).

Deploy: firebase deploy --only functions:claimChallengeReward,firestore:rules,firestore:indexes
```

---

## Verdict

**PR-10A spec freeze + implementation complete in repository.** 운영 반영은 배포 파이프라인으로 이어간다.

---

## Platform snapshot (공식 나열)

```text
PR-1  Avatar domain
PR-2  Security
PR-3  Onboarding / gating
PR-4  Identity hub
PR-5  XP engine
PR-5.1 XP anti-farming
PR-6  Badge engine
PR-7  Playground shell
PR-8  Social seed
PR-9  Async challenge MVP (PK)
PR-10B Challenge expansion (Dribble)
PR-10A Challenge rewards (IMPLEMENTED — deploy pending)
```
