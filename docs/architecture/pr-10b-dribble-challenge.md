# PR-10B — Dribble Challenge v1 (Product Contract, Freeze)

**Status:** **구현 반영** — `dribble_challenge_v1` + `/playground/dribble` + rules·시드. PR-9와 동일 **trust boundary** 유지.  
**Goal:** `challenge_templates` / `challenge_submissions` 엔진 **재사용**으로 콘텐츠만 확장. 보상 경제 **미연동**.

**See also:** [PR-9 — Async Challenge](pr-9-async-challenge.md) (완료 스냅샷·금지 사항).

---

## Relationship to PR-9

PR-9는 **toy competition signal** (비보상·친구 비교·전역 리더보드 없음). PR-10B는 그 정의를 **바꾸지 않고** 모드 하나를 추가한다.

---

## Scope (10B freeze)

### IN

| Area | 10B MVP |
|------|---------|
| Template | **`dribble_challenge_v1`** 한 행만 (시드·rules 화이트리스트). |
| Submissions | 기존 `challenge_submissions` — `challengeId` / `rulesVersion` 고정. |
| Reuse | `fetchBestScoreForUser`, `useChallengeBestScores`, 친구 상한 `CHALLENGE_FRIEND_SCORE_QUERY_LIMIT`, Playground 카드. |
| UI | `/playground/dribble` 데모 라운드 + 제출 + 가벼운 비교 스트립. |

### OUT (explicit)

- `time_attack`, `accuracy` 등 **추가 모드 동시** 런칭.  
- XP / 배지 / 지갑 결합.  
- 실시간 듀얼, 매치메이킹, **전역 리더보드**.  
- Trust model B/C 도입(이 PR에서는 **클라이언트 신뢰 유지**).

---

## Metadata contract (MVP — deterministic)

`rulesVersion`: **`dribble_rules_v1`**

`touches` 는 MVP에서 **쓰지 않음** (정의 모호). 이후 확장 시 스펙 개정.

```ts
// challenge_submissions.metadata — 키는 아래만, rules에서 필수·상한
{
  conesCleared: number; // 0..50
  durationMs: number; // 0..600000 (10분)
}
```

---

## Scoring & rules (PK 대칭)

- **score:** `0..1000` (클라·Firestore rules 동일 철학).  
- **immutable create** only; update/delete `false`.  
- **non-reward** — XP·배지 결합 금지 (PR-9 revision gate와 동일).

---

## Firestore direction

- `challenge_templates/dribble_challenge_v1` — 클라 쓰기 금지, `npm run seed:pr10b-template:production`.  
- `challenge_submissions` create — `challengeId == dribble_challenge_v1` + `rulesVersion == dribble_rules_v1` + metadata 검증.  
- 인덱스: 기존 `challengeId + uid + score` 복합 인덱스 **재사용**.

---

## Revision gate

- 보상 연동·전역 랭킹·실시간·trust model 변경 → **별도 아키텍처 승인** + 본 문서 개정.  
- 10B에서 **한 모드 검증 완료 전** 세 번째 템플릿을 늘리지 않는다.

---

## Next after 10B

- **PR-10A:** [Challenge rewards 스펙 동결](pr-10a-challenge-rewards.md) — best-only / daily cap / ledger / callable / telemetry **선행** 후 구현.
