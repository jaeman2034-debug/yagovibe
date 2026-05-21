# 5v5 멀티 인프라 스모크 테스트

**목적:** 1v1 Phaser 씬과 분리해 **매치메이킹 → 세션 → RTDB `players/{uid}` → ownership/write** 만 검증.

**전제:** `session.mode === "5v5"` 이면 **TeamMatchSessionPlaceholder** (1v1 Phaser 없음).  
`session.mode === "1v1"` 만 `LiveMatchView` → `LiveMatchScene`.  
즉시 플레이(`/game`)는 **`1v1` 큐**만 사용.

## 0. AUTH uid 분리 (필수 — 이거 안 되면 스모크 무효)

Firebase Auth는 **브라우저 프로필(Origin + localStorage/IndexedDB)** 단위로 세션을 공유합니다.

| 설정 | 결과 |
|------|------|
| Chrome 탭 A + Chrome 탭 B (같은 프로필) | `uid` **동일** → 두 명 테스트 아님 |
| Chrome + Edge (또는 Chrome + InPrivate) | `uid` **다를 수 있음** → 정상 |
| Chrome 탭 2개 (DEV만) | `.env.local`에 `VITE_AUTH_SESSION_PERSISTENCE_DEV=true` 후 `npm run dev` 재시작 — sessionStorage 기반 (탭 닫으면 로그인 풀림, **운영 빌드 무시**) |

### 확인 (양쪽 콘솔)

```js
yagoAuthUid()
// 또는
window.__AUTH_UID__
```

**A uid ≠ B uid** 일 때만 다음 절차 진행.

UI: `/matchmaking` 상단 **DEV · 이 브라우저 AUTH uid** 배너, 게임 중 **AUTH / OPP** 스트립.

### 올바른 계정 준비

1. **Chrome** — 계정 A 로그인 → uid 메모
2. **Edge** (또는 Chrome InPrivate) — 계정 B 로그인 → uid 메모
3. 한쪽에서 로그아웃 후 다른 계정으로 바꾸는 방법은 쿠키 꼬임 가능 → **브라우저 분리 권장**

---

## 환경

`.env.local`:

```env
VITE_MATCHMAKING_DEV_MIN_PLAYERS=2
```

`functions/.env` (로컬 Functions/에뮬레이터):

```env
MATCHMAKING_DEV_MIN_PLAYERS=2
```

재시작:

```powershell
# 터미널 1
npm run dev

# Functions 로컬 사용 시 — 터미널 2
cd functions; npm run serve
```

## 절차

| # | 확인 | 방법 |
|---|------|------|
| 1 | `/matchmaking` 진입 | 운동장 → **매치 찾기** 또는 `/matchmaking` |
| 2 | 5v5 큐 2명 성사 | 계정 A·B 각각 **5v5 큐 입장** (다른 브라우저/프로필) |
| 3 | 세션 생성 | 콘솔 `[5v5 SMOKE] match started` → URL `/play/session/{id}` |
| 4 | RTDB 슬롯 분리 | Firebase Console `liveSessions/{sessionId}/players` — uid 키 2개, 좌표 분리 |
| 5 | A 조작 시 A만 변경 | A 콘솔 `[5v5 SMOKE] RTDB players` — `self:true` 슬롯만 x/y/vx 변화 |
| 6 | B 입력 없음 | B 콘솔 필터 `LOCAL INPUT` / `SET VELOCITY` — `moveInput` 0, `mx/my` 0 |

## 콘솔 필터

- 인프라: `5v5 SMOKE`
- 입력: `LOCAL INPUT` (B 탭, `REMOTE APPLY` 필터 제거)

## 실패 시 해석

| 증상 | 의심 |
|------|------|
| 큐 2명인데 매치 안 됨 | Functions `MATCHMAKING_DEV_MIN_PLAYERS` 미반영 → functions 재시작 |
| `rawKeyCount: 1` 또는 alien keys | RTDB write가 uid가 아닌 키로 들어감 |
| A 움직일 때 B 슬롯도 같이 변함 | 슬롯 collision — `[liveMatch] RTDB SLOT COLLISION` |
| B `moveInput` non-zero | B 탭 bridge/조이스틱 오염 (탭 공유 아님) |
| 5v5 RTDB 정상, 1v1 화면만 같이 움직임 | **1v1 씬 coupling** (`df23553` 브랜치로 역추적) |

## 1v1 보류

WIP 커밋: `df23553` — `wip: 1v1 live sync debug checkpoint`
