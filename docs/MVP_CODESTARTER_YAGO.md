# MVP 코드 스타터 (YAGO — Vite + React + Firebase)

15단계에서 제시한 **Next.js + Supabase** 스타터와 **스택이 다릅니다**.  
이 레포는 이미 아래 구조로 동작하므로, **새로 복붙할 파일보다 “어디를 보면 되는지”**가 스타터입니다.

---

## 1. 폴더 매핑 (15단계 ↔ 이 레포)

| 15단계 (개념) | 이 레포 실제 경로 |
|---------------|-------------------|
| `app/sports/page` | `src/pages/sports/SportsActivityPage.tsx` |
| 팀 생성 | `src/pages/team/TeamCreate*.tsx`, `src/pages/sports/.../team/create` (라우트는 `App.tsx`) |
| 팀 상세 | `src/pages/team/TeamDetail.tsx` → `/app/team/:id` |
| 경기 생성 | `src/pages/match/MatchCreatePage.tsx` |
| 경기 상세 | `src/pages/match/MatchDetailPage.tsx` → `/match/:id` |
| 초대 랜딩 | `src/pages/invite/InviteLinkPage.tsx` → `/invite/:inviteId` |
| `lib/recommendation` | `src/lib/sportsHubRecommendation.ts` (`getRecommendation`, `getUserStage`) |
| `hooks/useUserState` | `src/hooks/useSportsHubRecommendationInputs.ts` + `src/context/SportsHubUserContext.tsx` |
| `RecommendCard` | `src/components/sports/SportsHubRecommendCard.tsx` |
| `KpiSection` | `src/components/sports/SportsHubKpiCard.tsx` |
| `AppCard` | `src/components/ui/AppCard.tsx` |
| 클라이언트 DB | `src/lib/firebase.ts` (Firestore / Auth / Functions) |

---

## 2. 환경 변수 (Supabase 대신)

루트 `.env` / 호스팅 환경에 일반적으로 다음이 필요합니다.

- `VITE_FIREBASE_*` (또는 프로젝트에서 쓰는 Firebase 클라이언트 키 세트)
- 배포 시: Firebase 콘솔에서 **승인된 도메인**, **App Check** 정책(쓰는 경우)

`src/lib/firebase.ts`가 단일 진입점입니다.

---

## 3. 추천 로직 (이미 존재)

- 규칙 엔진: `getRecommendation(state, sportSeg)`  
  → `src/lib/sportsHubRecommendation.ts`
- 허브 단계: `getUserStage` → NEW / SETUP / ACTIVE

15단계 예시의 `if (!hasTeam)` 분기는 여기서 이미 제품 규칙으로 확장되어 있습니다.

---

## 4. 유저 상태 (이미 존재)

- 입력 수집 + 실시간: `useSportsHubRecommendationInputs`  
- Provider: `SportsHubUserProvider` + `useSportsHubUser()`

새로 `useUserState`를 만들 필요 없이, **허브 전용 페이지는 Provider 안에서만** `useSportsHubUser`를 쓰면 됩니다.

---

## 5. 개발 순서 (이 레포 기준, 위에서 아래)

1. **Auth** — `AuthProvider`, 로그인/리다이렉트  
2. **팀** — 생성·`teams` / `members`  
3. **초대** — `inviteLinks` + `/invite/:inviteId` + `SportsHubGrowthInviteCard`  
4. **경기** — `matches` + `MatchDetailPage` 실시간  
5. **채팅** — `chatRooms` + 메시지 전송 경로  
6. **허브** — `SportsActivityPage` + 추천·KPI·리텐션·(선택) 매칭 추천  

---

## 6. 로컬 실행

```bash
npm install
npm run dev
```

(프로젝트에 `yarn`만 쓰는 경우는 `yarn` / `yarn dev`로 동일.)

---

## 7. DB / Rules

- 스키마는 SQL 테이블이 아니라 **Firestore 컬렉션**입니다.  
- 출시 전: `firestore.rules`에서 `teams`, `matches`, `match_requests`, `inviteLinks`, `chatRooms` **MVP 경로만** 스모크하세요.

---

## 8. 정말 새로 Next + Supabase로 스타터를 쓸 때

그 경우는 **별 레포**를 권장합니다. 이 문서의 Supabase 예시는:

- `createClient` → Supabase 대시보드 URL/anon key  
- `from("team_members")` 등 → Supabase Table Editor에서 동일 스키마 생성  

YAGO 본 제품 코드와 **섞지 않는 것**이 유지보수에 유리합니다.

---

## 16. 인증 (Auth) — 16단계는 **Firebase Auth**로 이미 연결됨

16단계 메시지의 **Supabase Auth**와 동일 역할은 여기서 **Firebase Authentication**이 합니다.  
별도 `useUser.ts` / `supabase.auth`를 넣지 않습니다.

| 16단계 (Supabase 개념) | YAGO (Firebase) |
|------------------------|-----------------|
| `createClient` + Auth | `src/lib/firebase.ts`의 `auth` |
| `onAuthStateChange` | `src/context/AuthProvider.tsx`의 `onAuthStateChanged` |
| `useUser()` | `useAuth()` — `AuthProvider`와 동일 트리 안에서 사용 |
| 로그인 페이지 | `src/pages/LoginPage.tsx`, `PhoneLoginPage.tsx` 등 (`App.tsx` 라우트) |
| 보호 라우트 | `src/components/ProtectedRoute.tsx` (`/sports` 등) |
| 로그아웃 | `useAuth().logout()` → `signOut(auth)` |
| 로그인 후 `users` upsert | `AuthProvider` 내 Google redirect 성공 시 `users/{uid}` `setDoc` (신규 시 프로필 생성) |

### 출시 전 Auth 스모크 (5분)

1. 비로그인으로 `/sports` 접근 → `/login` 등으로 가드되는지  
2. 로그인 → `/sports` 허브·`useAuth().user.uid`로 Firestore 쿼리 되는지  
3. 로그아웃 → 보호 페이지 재진입 시 다시 로그인 유도되는지  
4. Firebase 콘솔: 사용 중인 **로그인 제공업체**(전화, Google 등)만 켜 두기  

### Supabase `signInWithOtp`를 쓰고 싶다면

이 레포에 섞지 말고 **별 프로젝트**에서 16단계 문서대로 구현하는 것을 권장합니다.  
YAGO는 **전화 / Google 등 Firebase 플로우**가 이미 얽혀 있습니다.

---

## 한 줄

```text
이 레포: Firebase 스타터는 “이미 src/에 있다” → 위 표만 따라가면 된다.
```
