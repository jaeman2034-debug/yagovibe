# Cursor용 전체 프론트엔드 구조 재정비 지시문 (복붙용)

> **용도**: 패치가 아니라 **아키텍처 재건**을 명시할 때 Cursor 에이전트/채팅에 그대로 붙여 넣는다.  
> **원칙**: 깨진 로직 재사용 금지, 부분 수정 금지, **도메인·라우팅·데이터 접근을 일관되게** 다시 설계한다.

---

## 실행 플로우 0~7 (헷갈리지 말고 이 순서만)

### 0. 목표

- 기존 코드는 **고치는 단계가 아니라**, **새로 만드는 단계**
- **레거시는 이 마일스톤에서 건드리지 않고**, `src/features` 아래에만 추가
- **Market만** 먼저 끝까지

### 1. 브랜치 (반드시 먼저)

```bash
git checkout -b rebuild/frontend-architecture
```

### 2. Cursor 실행 (핵심)

| 하지 말 것 | 할 것 |
|------------|--------|
| `src` 전체 선택 → "고쳐줘" | Chat 열고, **이 문서** + 아래 블록 붙여넣기 |

1. Cursor Chat 열기  
2. `docs/CURSOR_FRONTEND_REBUILD_DIRECTIVE.md` 열기  
3. 아래부터 **`You are a senior frontend architect.`** ~ 본문 핵심 규칙까지 복사  
4. **반드시 이 블록을 이어서 붙인다** (레거시 수정 방지):

```text
Do NOT modify existing legacy files.
Create new clean structure under src/features.

Start ONLY with:
👉 Market domain

Generate:
- folder structure
- marketService.ts (under features/market/services or src/services — pick one and document)
- useMarketPost.ts
- MarketListPage.tsx
- MarketDetailPage.tsx

Use Firestore via service layer only.
Components must not import getDoc/collection directly.

Do NOT over-engineer.
Keep it simple and working.
Focus only on Market domain.
```

5. (선택) 프로젝트 기준 경로만 덧붙이기:

```text
Use src/ as root. Reference existing types/collection names from the repo, but do not copy broken data access patterns.
```

### 3. 기대 폴더 구조 (최소)

```text
src/
  features/
    market/
      services/
        marketService.ts
      hooks/
        useMarketPost.ts
      pages/
        MarketListPage.tsx
        MarketDetailPage.tsx
```

(실제 컬렉션명·라우트는 기존 앱과 맞출 것. 예: 상세 URL `/sports/:sport/market/:postId`.)

**실행 중 정상 신호** (diff·파일 트리 기준):

- `src/features/market/` 아래에만 신규 파일이 늘어남
- `marketService.ts`, `useMarketPost.ts`, list/detail 페이지 존재

### 4. 결과 검증 체크리스트

- [ ] 컴포넌트 안에 **`getDoc` / `collection` 등 없음**
- [ ] **service에서만** Firestore + `db`
- [ ] **`useMarketPost`** (및 목록용 훅) 존재
- [ ] **loading / error** 처리
- [ ] 상세에서 **`useParams`** 사용

### 5. 실패 패턴 → 이렇게 재요청

다음이 보이면 **실패**로 보고 Cursor에 다시 입력:

- 기존 `src/pages/...` 대량 수정
- 페이지에서 `firebase` 직접 쿼리
- service / hook 없음

```text
You modified legacy files. That is forbidden.
Rebuild ONLY under src/features/market.
Do not edit existing pages; add new files only.
```

**실행 중 레거시가 건드려지면 즉시 끊기** (예: `src/pages` 대량 수정, `App.tsx`, `firebase.ts` 등):

```text
STOP. Do not modify legacy files. Rebuild only under src/features.
```

**비정상 신호** (이면 위 STOP 즉시):

- `App.tsx` / 기존 `src/pages/**` / `src/lib/firebase.ts` 등이 diff에 잡힘

**흐름이 이상해지면** (중간에 산으로 가면):

```text
Reset.
Rebuild ONLY market domain.
Do not touch anything else.
```

### 6. 성공 기준 (다음 단계 진입 가능)

예시 경로에서 상세 1건이 정상 표시되면 성공:

- `/sports/soccer/market/123` (sport·컬렉션명은 프로젝트에 맞게)

✔ 데이터 1건 표시  
✔ 콘솔에 Firestore 권한/미정의 에러 없음  
✔ 로딩·에러 UI 동작

### 7. 그 다음 순서

`Market` 성공 후 → **Teams** → **Auth는 맨 마지막** → Recruit/Match → Activity feed

---

You are a senior frontend architect.

The current project may contain rollback drift, duplicated auth flows, and inconsistent data access.

Your task is **NOT** to chase one-off bugs, but to **rebuild the architecture cleanly** according to the rules below, **incrementally** (마일스톤 단위로 머지 가능하게).

---

## GOAL

Reconstruct the YAGO frontend with:

- **clear domain separation**
- **consistent routing**
- **service-based Firestore access only**
- **stable list + detail pages**
- **single auth redirect handling**

All paths below are under **`src/`** (Vite + React repo).

---

## CORE RULES (MUST FOLLOW)

### 1. NO DIRECT FIRESTORE IN UI COMPONENTS

- Pages and presentational components **must not** import `getDoc`, `collection`, `query`, `onSnapshot`, etc.
- **All Firestore I/O lives in `src/services/`** (or `src/features/<domain>/services/` if colocated by domain—pick one style and **stick to it project-wide**).
- Components call **hooks** → hooks call **services**.

### 2. DOMAIN-DRIVEN FOLDER LAYOUT (TARGET)

Prefer **one of** these (팀 합의 후 고정):

**Option A — feature-first**

```text
src/
  features/
    market/
    teams/
    events/
    auth/
    activity/
  services/          # shared + thin re-exports if needed
  hooks/
  types/
  pages/             # route-level shells only (lazy ok)
  components/        # shared UI only
```

**Option B — service-first (workspace rules와 정렬)**

```text
src/
  services/          # marketService, teamService, userService, …
  hooks/
  types/
  pages/
  features/          # optional: domain UI not tied to a single route
```

**Rule**: `market` 도메인 비즈니스·쿼리는 `market` 경계 안에 두고, 공통 유틸만 `src/lib/`에 둔다.

### 3. ROUTING STANDARD (STRICT)

**Allowed patterns (예시—제품 URL과 맞춰 조정 가능, 단 문서화 필수)**

- `/sports/:sport/market` — list
- `/sports/:sport/market/:postId` — detail
- `/teams/:teamId` — team detail
- `/hub`
- `/login` (and `/login/phone` 등 명시된 auth 서브경로만)

**Forbidden**

- Detail에서 **관계 없는 도메인**으로 이유 없는 `navigate` (예: market 글 → team 페이지 혼선).
- 라우트별 **분기 난립** in random components; 공통은 `layouts/` + `routes/` 또는 `App.tsx` 한곳에서 정의.

### 4. DETAIL PAGE STANDARD (EVERY DETAIL)

Each detail route **must**:

1. `useParams()` for ids
2. `useXxx(id)` hook (single responsibility)
3. Service function for fetch/subscribe
4. Explicit **loading / error / empty** UI

Example (conceptual):

```tsx
const { postId } = useParams<{ postId: string }>();
const { data, loading, error } = useMarketPost(postId);
```

### 5. SERVICE LAYER

Create (names align with Firestore collections in this product):

- `src/services/marketService.ts` (or `src/features/market/services/marketService.ts`)
- `src/services/teamService.ts`
- `src/services/userService.ts`

Each service:

- owns Firestore paths and query shapes
- returns **typed** DTOs (`src/types/`)
- throws or returns `Result` type on not-found / permission errors (팀 컨벤션 하나로 통일)

Example:

```ts
export async function getMarketPost(postId: string): Promise<MarketPost> {
  const ref = doc(db, "marketPosts", postId); // 실제 컬렉션명은 프로젝트 스키마에 맞출 것
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Post not found");
  return { id: snap.id, ...(snap.data() as MarketPostDoc) };
}
```

### 6. HOOK LAYER

- `useMarketPost(postId)`
- `useTeam(teamId)`
- `useUser(uid)` (필요 시)

Each hook:

- calls service
- owns `loading` / `error` / `data` state (or TanStack Query if 도입 시)

### 7. AUTH FLOW (CRITICAL)

- **`getRedirectResult` / `getRedirectResultOnce`는 앱에서 단 한 경로만** (현재: `AuthProvider` + `src/lib/authRedirectResultOnce.ts`).
- `ProtectedRoute` / `PublicRoute`: `sessionUser = user ?? auth.currentUser` 유지.
- **LoginPage에서 구글 OAuth**: 제품 정책상 모바일 봉인 시 그 정책을 주석·문서에 명시.

### 8. REMOVE / FREEZE LEGACY (CHECKLIST)

다음은 **재건 시 재발 방지**로 명시적으로 처리한다.

- [ ] `InAppBrowserRedirect`: no-op 또는 삭제 후 라우트만 유지 (정책 문서화).
- [ ] `index.html`: **OAuth/인앱 redirect 인라인 스크립트 금지** (이미 제거된 상태 유지).
- [ ] `getRedirectResult` 중복 호출 금지 (App / main / LoginPage 등).
- [ ] 컴포넌트 내부 **혼재된 `window.location` / `navigate` 난립** 금지 → 라우팅 정책 문서 + 헬퍼.

### 9. BUILD ORDER (DO IN THIS ORDER)

1. **Market list → detail** (완전 동작까지 머지 단위)
2. **Team detail**
3. **Auth stabilization** (단일 redirect + persistence 문서)
4. **Recruit / Match**
5. **Activity feed** (마지막; `activities` 단일 소스 규칙 준수)

### 10. UX PRINCIPLE

- List: summary fields only, pagination/limit 명확히
- Detail: full document or 서브컬렉션 필요 시만 추가 fetch
- No long blocking UI without skeleton
- Mobile-first: 터치 타깃, 레이아웃, 에러 메시지 길이 고려

---

## OUTPUT EXPECTED FROM CURSOR (PER MILESTONE)

For **Milestone 1 — Market domain**:

1. **Folder tree** (실제 생성/이동할 경로)
2. **New files**: `types`, `services`, `hooks`, page shell
3. **Router diff**: `App.tsx` 또는 라우트 모듈에 추가되는 `Route` 목록
4. **Minimal working example**: Market detail page wired to `useMarketPost` + `getMarketPost`

**Do not** reuse broken patterns from old detail pages; **copy types only**, rewrite data flow.

---

## FINAL REQUIREMENT

- Do **NOT** partially fix legacy files while leaving duplicate Firestore paths.
- Do **NOT** add new `getDoc` calls inside JSX files.
- Rebuild **clean and consistent** like a production SaaS.

---

## HOW TO RUN IN CURSOR (운영 팁)

> **빠른 길**: 문서 상단 **`실행 플로우 0~7`**만 순서대로 따라도 된다. 이 절은 같은 내용을 보강한 것이다.

### ❌ 하면 안 되는 방식

- `src` 전체 선택 → “구조 고쳐줘” / “리팩터 해줘” → **패치 지옥**, 기존 깨진 흐름이 그대로 남음.

### ✅ 해야 하는 방식

1. **새 브랜치**

   ```bash
   git checkout -b rebuild/frontend-architecture
   ```

2. **이 문서(`docs/CURSOR_FRONTEND_REBUILD_DIRECTIVE.md`)를 연 뒤**, 상단 `You are a senior frontend architect.`부터 **FINAL REQUIREMENT** 근처까지 복사해 Cursor 채팅에 붙인다.

3. **반드시 같이 붙일 문장** (기존 파일 대량 수정 방지):

   ```text
   Use the current project under src/ as reference only.
   Do NOT modify existing legacy files in this milestone.
   Create new clean structure under src/features (and src/services if needed).
   We will wire routes and migrate from old pages later.

   Do NOT over-engineer.
   Keep it simple and working.
   Focus only on Market domain.
   ```

4. **첫 마일스톤 한 줄 추가**:

   ```text
   Start by rebuilding the Market domain only:
   - marketService (Firestore only here)
   - useMarketPost (and list hook if needed)
   - MarketListPage + MarketDetailPage (or under src/pages with thin shells)
   Generate folder tree + key files + minimal route snippets.
   ```

5. 마일스톤마다 **`npm run build`**로 깨짐 방지.

---

## 실행 순서 (권장)

| 순서 | 범위 | 비고 |
|------|------|------|
| 1 | **Market** (`features/market` + service + hooks + list/detail) | 먼저 완전 동작까지 |
| 2 | **Teams** | |
| 3 | **Auth** | OAuth 등은 **맨 마지막**에 안정화하는 편이 유리 |
| 4 | Recruit / Match | |
| 5 | Activity feed | `activities` 단일 소스 규칙 준수 |

---

## 결과 검증 체크리스트 (Cursor 산출물)

- [ ] 페이지/컴포넌트에서 **`getDoc` / `collection` 등 Firestore 직접 호출 없음**
- [ ] **`src/services/` (또는 feature 내 services)** 에서만 `db` 접근
- [ ] **`useXxx` 훅** 존재, 훅이 서비스만 호출
- [ ] **loading / error / empty** 상태 처리
- [ ] **라우팅 규칙**이 이 문서의 Allowed/Forbidden과 충돌 없음

---

## START COMMAND (한 줄)

**Start with: Market domain reconstruction** — list route + detail route + `marketService` + `useMarketPost` + types, with no Firestore in the page component.

---

## YAGO 도메인 메모 (워크스페이스 규칙과 정렬)

- Community feed 단일 소스: **`activities`** (신규 쓰기는 여기 우선).
- `activityLogs`는 읽기 전용·점진 폐기.
- 팀 권한: 플랫폼 `users.role` vs 팀 `members.role` 규칙 분리 유지.

---

*이 문서는 “요청서”가 아니라 **재건 명령서**다. Cursor에 붙인 뒤 마일스톤 단위로 실행하고, 완료 시 `Market 결과`를 리뷰 요청하면 된다.*
