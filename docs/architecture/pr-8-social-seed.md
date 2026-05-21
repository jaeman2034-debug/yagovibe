# PR-8 — Social Seed Layer (Product Contract)

**Status:** design frozen — implementation follows this doc.  
**Goal:** move from solo progression (`me`) to lightweight relationships (`we`) without realtime, chat, or reward farming.

---

## Relationship to prior work

After PR-7, the platform loop is:

`identity → progression (XP) → rewards (badges) → destination (playground)`

PR-8 adds:

`→ relationships (friends)`

Social is an **engagement layer**, not a reward layer. No XP for friend actions in MVP.

---

## Scope

### IN

| Area | MVP |
|------|-----|
| Invite landing | **`/invite/friend/:inviterUid`** — 팀 초대 `/invite/:inviteId` 와 충돌하지 않도록 **반드시** 더 구체적인 세그먼트 사용. `:inviterUid` = Firebase Auth uid (= `avatars/{uid}`). `App.tsx`에서 `/invite/friend/:inviterUid` 를 `/invite/:inviteId` **보다 위**에 등록. |
| Friendship graph | `friendships/{friendshipId}` documents |
| Canonical doc id | Single doc per unordered pair |
| Playground | Replace static social copy with counts / empty state |
| Profile share | Entry on hub / identity card: `navigator.share` + copy URL fallback |

**Invite resolution (contract):** `:inviterUid` is the **inviter’s Firebase Auth `uid`**. Landing: inviter 프로필 표시 + 비로그인 시 가입/로그인, 로그인 후 “친구 요청” 등. uid 형식이 아니면 에러 상태.

### OUT (explicit)

- Chat, DM, presence, realtime infra  
- Push notifications  
- Full activity feed  
- Leaderboards driven by friends  
- Friend recommendations  
- Team membership graph merge with friends  
- **Any XP / badge coupling** to friend create / accept / block  

---

## Architecture decisions (locked)

### 1. Canonical friendship id

```text
friendshipId = [uidA, uidB].sort().join("_")
```

- `uidA`, `uidB` are Firebase Auth UIDs (lexicographic sort).  
- **Do not change** for MVP: duplicate prevention, idempotent requests, simple rules and callable lookups.

### 2. Friendship document schema

```ts
type FriendshipStatus = "pending" | "accepted" | "blocked";

type FriendshipDoc = {
  schemaVersion: number; // e.g. 1
  users: [string, string]; // sorted, same order as friendshipId derivation
  requesterUid: string;
  addresseeUid: string;
  status: FriendshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

- `users` supports `array-contains` queries where needed.  
- `requesterUid` / `addresseeUid` clarify direction for `pending`.

### 3. Blocked is terminal (MVP)

Once `status === "blocked"`:

- **Disallowed:** transitions to `pending` or `accepted`.  
- **Rationale:** abuse / ambiguity; recovery flows can be a later PR.

### 4. Security model (Firestore rules direction)

**Read:** `request.auth.uid` must be in `resource.data.users` — **for all statuses** (`pending`, `accepted`, `blocked`).  
Participants only; **no** “accepted-only read” branch required for MVP (rules stay simple).

**Write:**

- Create: authenticated; `requesterUid == request.auth.uid`; `users` sorted and matches canonical id; `addresseeUid` is the other uid.  
- Update: `request.auth.uid in users`; only allowed **state machine** transitions (define explicitly in rules or enforce primarily in Callable + rules as safety net).  
- Delete: optional later; not required for MVP.

### 5. Callable surface (recommended)

Implement server-side mutations (HTTPS Callable or batched admin from trusted entry points):

- `requestFriendship` — create or no-op `pending` if already exists / accepted.  
- `acceptFriendship` — addressee only, `pending → accepted`.  
- `blockFriendship` — participant, to `blocked` (terminal).

`deleteFriendship` / unfriend: later.

### 6. XP decoupling (locked)

```text
NO XP for friend request, accept, block, or invite link open.
```

---

## Implementation order (next execution)

1. **This doc** — contract (done).  
2. **Shared types** — e.g. `src/domain/social/types.ts` (or `src/types/social.ts` per repo convention).  
3. **Firestore rules** — `friendships/{friendshipId}` first (contract anchor).  
4. **Cloud Functions** — callables above + minimal validation.  
5. **Frontend** — invite landing → profile share → playground social strip.

---

## Optional later

- `users/{uid}/social/summary` or `friendCount` on `avatars/{uid}` for O(1) strip (not mandatory for MVP; can count with indexed query or denormalize in Callable on accept).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-13 | Initial PR-8 scope freeze; read rule: participants only regardless of status; blocked terminal; no XP; invite path `/invite/friend/:inviterUid` (avoid `/invite/:inviteId` collision). |
| 2026-05-13 | **PR-8A:** `src/types/social.ts`, `friendships` Firestore rules (read-only client), composite index `users` array-contains + `status`, Cloud Functions `requestFriendship` / `acceptFriendship` / `blockFriendship` (`functions/src/social/friendshipCallables.ts`, root `functions/index.ts` export). |
| 2026-05-13 | **PR-8A hardening (pre-8B):** `users/{peerUid}` 존재 검증(고스트 문서 방지); 기존 문서 `users[]` canonical 일치 검증; 모든 변경 `runTransaction`; 수락·차단·조회 실패 시 사용자 메시지 일반화(`요청을 처리할 수 없습니다.` 등), 상세는 로그만. |
