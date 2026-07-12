# Vision Player Tab ID Guard — Local Browser QA Fact

**Document ID:** `VISION-PLAYER-TAB-ID-GUARD-LOCAL-QA`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **ACCEPTED** (PM)  
**Method:** Playwright actual click · local Vite  
**Script:** `scripts/vision-player-tab-local-qa.ts`  
**Raw JSON:** `vision_player_tab_qa/local_browser_qa.json`

---

## Scope

| Rule | Behavior |
|---|---|
| canonical `playerId` | Player 탭 노출 · Growth Profile 이동 |
| trackId-only (e.g. `P0100`) | Player 탭 **숨김** · `/home/parent/child/.../P0100` 금지 |

---

## CASE A — trackId only (`P0100`)

| 항목 | 결과 |
|---|---|
| URL | `/home/parent/vision/report?teamId=D7TUZaOtfxdBc4P0lQLx&playerId=P0100&matchId=vision-pilot-pass01-clip-002` |
| Player 탭 노출 | **N** |
| `/home/parent/child/.../P0100` 이동 | **N** |
| 접근 거부 화면 | **N** |
| Parent Report | **Y** |
| Peer Benchmark 관측 | **Y** |

## CASE B — canonical (`player-ap-63d56190`)

| 항목 | 결과 |
|---|---|
| 클릭 전 URL | `.../vision/report?...&playerId=player-ap-63d56190&...` |
| Player 탭 노출 | **Y** |
| 클릭 후 URL | `/home/parent/child/D7TUZaOtfxdBc4P0lQLx/player-ap-63d56190?matchId=...` |
| 프로필 열람 (접근 거부 없음) | **Y** |
| 접근 거부 화면 | **N** |

## REGRESSION

| 항목 | 결과 |
|---|---|
| Unit `visionPlatformRoutes` | **8/8 PASS** |
| Coach `#vision-coach` | **Y** |
| Match Detail Player 숨김 (track ranking) | **Y** |
| Parent Report | **Y** |

**관측 오류:** 없음

---

## PM Acceptance

| Item | Value |
|---|---|
| Local Browser QA | 🔒 **ACCEPTED** |
| Commit | ✅ GO (후속) |

**Separated:** Parent duplicate `VisionPlatformNav` → `VISION_NAV_DUPLICATE_OBSERVATION.md` (이번 fix 비포함)

**Accepted by:** PM · 2026-07-12
