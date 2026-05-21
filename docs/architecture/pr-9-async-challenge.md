# PR-9 — Async Challenge (Product Contract, Freeze)

**Status:** **PR-9 + PR-9.1 COMPLETE** (MVP). 이 레이어는 **경쟁 참여(competitive engagement)** 이지 **보상 경제(reward economy)** 가 아님 — 정의 유지. 계약 변경 시 본 문서 + 명시적 아키텍처 승인.

**Goal:** add a **shared competition loop** (`친구와 무언가를 겨룸`) **without** realtime infra, presence, rooms, or matchmaking.

---

## PR-9 COMPLETE (contract snapshot)

```text
PR-9 COMPLETE

Async challenge MVP is live with PK challenge v1.

Scope includes:
- client-trusted score submissions (non-reward)
- immutable challenge submissions
- bounded metadata validation
- personal best + lightweight friend comparison (max 10)

Explicitly excluded:
- XP / badge coupling
- realtime competition
- matchmaking
- global leaderboard
- advanced anti-cheat

Any trust model or reward-economy change requires explicit architecture revision approval.
```

**Architectural truth:** PK async challenge = **toy competition signal** (`client-trusted`, immutable submissions, bounded score/metadata, light social comparison, **no progression coupling**). 이 정의가 흔들리면 스코프가 즉시 커짐.

---

## Relationship to prior work

After PR-8, the platform loop is:

`identity → progression (XP) → rewards (badges) → destination (playground) → social graph (friends)`

PR-9 adds:

`→ async competition (same challenge, compare scores later)`

This is **social retention**, not a new reward engine in the first slice.

---

## Scope (PR-9A freeze)

### IN

| Area | PR-9A MVP |
|------|------------|
| Challenge mode | **PK only** — one `challenge_templates` row drives UI and queries. |
| Templates | `challenge_templates/{challengeId}` — static definition (slug, title, mode, scoring). |
| Submissions | `challenge_submissions/{submissionId}` — append-only attempts. |
| Queries | Per-user **best score** for the PK template (see indexes below). |
| UI | **Playground** surfacing: submit flow entry + **friend comparison strip** (가벼운 비교만 — 전역 랭킹·라이브 리더보드 아님). |
| Trust (MVP) | **Client-reported score** — no server-side physics verification in 9A. |

### OUT (explicit for 9A)

- Second modes (dribble, time attack, accuracy) — **content expansion** after engine exists.  
- XP, badges, wallet coupling to submissions — **defer**; avoids repeating PR-5.1 farming surface until policy exists.  
- Friend-specific challenge invites, head-to-head rooms, live duels.  
- Realtime, sockets, presence, matchmaking, anti-cheat sophistication.  
- Signed result tokens, server-side PK simulation (later options **B/C**).

---

## Score trust model (locked for 9A)

| Option | 9A decision |
|--------|-------------|
| A Client trusted | **Yes** — client sends `score` + `metadata`. |
| B Callable shape validation | Optional later — validate ranges, required fields, rate limits. |
| C Signed result token | Later. |

**Product copy / engineering note:** treat leaderboard and friend strip as **fun social layer**, not cryptographic proof. When XP attaches later, **must** add submission dedupe / caps (see below).

---

## Anti-farming (deferred until rewards attach)

If submissions ever grant **XP or badges**:

- Define policy explicitly, e.g. **best score only counts once per window**, or **first daily submission only**, or server-side caps.  
- Until then: **no XP from `challenge_submissions`** in 9A — spam is annoying but not economy-breaking.

---

## Collections

### 1. `challenge_templates/{challengeId}`

Static definition (seeded via Admin SDK / 콘솔 — **클라이언트 쓰기 금지**).

**문서 ID 권장:** 버전 접미 — 예: `pk_challenge_v1` (점수 규칙·난이도 마이그레이션 시 새 행 추가).

```ts
type ChallengeTemplateDoc = {
  slug: string;           // e.g. "pk_challenge" (표시·검색용)
  title: string;          // e.g. "PK 챌린지"
  mode: "pk";             // 9A: literal "pk" only
  scoringType: "high_score";
  isActive: boolean;
  schemaVersion: number;  // e.g. 1 — Firestore 문서 형태
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};
```

- 9A ships **one** active 템플릿 행: **`pk_challenge_v1`**.  
- Additional modes = new rows + app routing later, not new collections.

### 2. `challenge_submissions/{submissionId}`

User attempts (append-only).

```ts
/** PK 시도 부가 수치 — rules: shotsTaken/goals 0..10, goals≤shotsTaken, durationMs≤10분 */
type ChallengeSubmissionMetadata = {
  shotsTaken?: number;
  goals?: number;
  durationMs?: number;
};

type ChallengeSubmissionDoc = {
  schemaVersion: number;   // Firestore 문서 스키마 (예: 1)
  challengeId: string;     // → `challenge_templates` 문서 ID (9A: `pk_challenge_v1`만)
  uid: string;             // Firebase Auth uid
  avatarId?: string;       // 선택, 클라이언트 미러
  score: number;           // high_score; rules: 0..1000 (9A)
  /** 챌린지 **규칙** 리비전 — 점수 비교·재현성용 (문서 schemaVersion 과 별개) */
  rulesVersion: string;    // 9A: `pk_rules_v1` 고정
  metadata: ChallengeSubmissionMetadata;
  createdAt: Timestamp;
};
```

**Id generation:** client or server may use auto-id; no requirement for deterministic submission ids.

---

## Queries and indexes (9A)

**My best score (single challenge):**

```text
challenge_submissions
  where challengeId == "pk_challenge_v1"
  where uid == <me>
  orderBy score desc
  limit 1
```

Composite index: `challengeId` ASC, `uid` ASC, `score` DESC.

**Friend strip (MVP):**

- Resolve accepted friend uids (existing PR-8 graph).  
- 클라이언트는 **최대 10명** peer만 최고점 조회 — UI에 「전체 랭킹 아님 / 최대 10명」을 명시.  
- `in` 배치(≤10) 또는 친구 수 적을 때 **uid별 동일 쿼리** — 과도한 복합 인덱스 추가는 보류.  
- UI: 예시 카피 수준 — 「OO님 최고 850 · 내 최고 790」또는 소수 친구 중 1위 강조. 전역 랭킹 페이지는 범위 밖.

**Recent attempts (optional debug / profile):**

```text
where uid == me
  orderBy createdAt desc
  limit N
```

Separate index if product needs it.

---

## Security rules (9A — 구현 시 이 수준으로 고정)

### `challenge_templates`

- **read:** 로그인 사용자 전원.  
- **write:** `false` (Admin / 콘솔 시드만).

### `challenge_submissions`

- **create:** 로그인 + `request.resource.data.uid == request.auth.uid` + **필드 화이트리스트** + **`0 <= score <= 1000`** + `metadata`: `shotsTaken`·`goals` 0..10, `goals <= shotsTaken` (둘 다 있을 때), `durationMs` 0..600000(10분), 키는 `shotsTaken`|`goals`|`durationMs` 만.  
- **9A 제한:** `challengeId == "pk_challenge_v1"` 및 `rulesVersion == "pk_rules_v1"` 만 허용 (스팸·임의 챌린지 방지).  
- **update / delete:** `false` — **불변 제출** (점수 수정 치트 차단).

### `challenge_submissions` read

- **read:** 로그인 사용자; 9A는 `challengeId == pk_challenge_v1` 인 문서만 허용해도 됨. (전역 스크래핑 완화는 후속.)

---

## 시드

`challenge_templates/pk_challenge_v1` 문서는 클라이언트가 쓸 수 없으므로 **배포 시** Admin SDK 또는 Firebase 콘솔로 1회 생성.  
레포: `npm run seed:pr9-template` (프로덕션/에뮬 주의는 `seed-match-test` 스크립트 주석과 동일 패턴).

---

## UX boundaries

- **Playground:** fast path into PK attempt → submit; **copy-first invite** stays separate (PR-8 hub vs playground semantics unchanged).  
- **Hub:** no requirement to duplicate challenge entry in 9A unless product asks later.

---

## Implementation order (suggested)

1. Types + Firestore rules + indexes for `challenge_templates` / `challenge_submissions`.  
2. `npm run seed:pr9-template:production` 로 `challenge_templates/pk_challenge_v1` 시드 (또는 콘솔 동일 문서).  
3. `firebase deploy --only firestore:indexes,firestore:rules` (복합 인덱스 배포).  
4. Client: PK 페이지 + 제출 + Playground 요약.

---

## PR-9.1 polish (배포·UX 다듬기)

- **score:** rules 상한 `1000` (UI 비교 깨짐 방지).  
- **metadata:** `shotsTaken`·`goals` ≤ 10, `goals <= shotsTaken` (둘 다 있을 때), `durationMs` ≤ 600000ms.  
- **친구 비교:** 조회·표시 상한 `CHALLENGE_FRIEND_SCORE_QUERY_LIMIT`(10) — UI에 전체 랭킹 아님을 명시.  
- **로딩/에러:** 최고점 fetch 실패 시 사용자 메시지.

---

## Revision gate

다음은 **명시적 스펙 개정·승인 없이** 하지 않는다:

| 금지 (forbidden without explicit spec revision) |
|--------------------------------------------------|
| Challenge 제출에 **XP** 부여 |
| Challenge 제출로 **배지 해제** |
| **실시간** 듀얼·대전 |
| **매치메이킹** |
| **전역 리더보드** (클라이언트 신뢰 점수 + 공개 전역 비교 = 품질·기대 불일치) — **친구 범위 비교만** |
| **두 번째 trust model** 가정(서명 결과·서버 검증 등)을 보상 없이 섞어 넣는 임의 변경 |
| **고급 안티치트**를 전제로 한 제품 약속 |

다음도 본 문서 갱신 + 승인 필요:

- Trust model 이동 (A → B/C).  
- 제출물과 **XP 또는 배지** 결합.  
- PK 경로 end-to-end 확정 전 **두 번째 모드**를 보상·랭킹과 엮어 추가.

**Next branch:** [PR-10B — Dribble](pr-10b-dribble-challenge.md) 구현 완료. 보상 연동은 **[PR-10A — Challenge rewards](pr-10a-challenge-rewards.md)** 스펙 동결·승인 후에만 진행.
