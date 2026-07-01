# YAGO Vision RC5-4 — Operation Info (운영 정보 시트)

**Status:** ✅ **APPROVED** — 운영 PM 승인 · JSON 반영 완료  
**SoT:** 본 문서 ↔ `src/lib/vision/data/rc5_4_pilot_academy.json`  
**검색 보고서:** `docs/RC5_4_OPERATION_INFO_SEARCH_REPORT.md`  
**Charter:** `YAGO_VISION_OPERATIONS_CHARTER_v1.md` (v1.1)

> **teamId 공식값:** `D7TUZaOtfxdBc4P0lQLx` (소문자 `l`)  
> **coachUid / parentUid:** Dry Run에서 Auth·권한·parentLink 최종 확인

**승인 일시:** 2026-06-30

---

## Pilot Information

| 필드 | 상태 | 값 | 비고 |
|------|------|-----|------|
| pilotName | ✅ APPROVED | `YAGO Vision Pilot #1` | JSON 반영 |
| teamId | ✅ APPROVED | `D7TUZaOtfxdBc4P0lQLx` | 테스트 아카데미 · 소문자 `l` |
| coachUid | ✅ APPROVED | `jMLLIxyOVkN1HERAd2gz88uKj9e2` | 홍코치 · Dry Run Login 확인 |
| parentUid | ✅ APPROVED | `wSlh4oDIqIP4GnV3Di1IeAQnFy13` | parent.test@gmail.com · parentLink 확인 |
| playerId | ✅ APPROVED | `player-ap-63d56190` | 홍길동 · canonical |
| matchId | ✅ APPROVED | `vision-pilot-pass01-clip-002` | Pilot 기본값 · Live 시 실 Run ID 별도 기록 |

---

## Pilot 일정

| 항목 | 값 |
|------|-----|
| Start Date | _(운영 총괄 기입)_ |
| End Date | _(운영 총괄 기입)_ |
| Dry Run Date | |
| Live Pilot (Run Day) Date | |

---

## Pilot 장소

| 항목 | 값 |
|------|-----|
| Academy | 테스트 아카데미 |
| Address | _(운영 총괄 기입)_ |

---

## 담당자

| 역할 | 이름 | 연락 | 서명 |
|------|------|------|------|
| PM | | | |
| Coach | 홍코치 | uid: `jMLLIxy…` | |
| Parent | parent.test | parent.test@gmail.com | |
| Support | | | |
| CTO (기술) | | | |

---

## Run Day URL

| 화면 | URL |
|------|-----|
| Upload | `/teams/D7TUZaOtfxdBc4P0lQLx/validation-console?matchId=vision-pilot-pass01-clip-002` |
| Pilot Beta Hub | `/teams/D7TUZaOtfxdBc4P0lQLx/vision/pilot-beta` |
| Coach | `/teams/D7TUZaOtfxdBc4P0lQLx/play?matchId=vision-pilot-pass01-clip-002` |
| Match Detail | `/teams/D7TUZaOtfxdBc4P0lQLx/vision/match/vision-pilot-pass01-clip-002` |
| Parent Report | `/home/parent/vision/report?teamId=D7TUZaOtfxdBc4P0lQLx&playerId=player-ap-63d56190&matchId=vision-pilot-pass01-clip-002` |

---

## JSON 동기화 확인

| ✓ | 항목 |
|---|------|
| ✅ | `src/lib/vision/data/rc5_4_pilot_academy.json` 승인값 반영 |
| □ | `CONFIGURE_AT_OPS` placeholder 없음 — **확인 완료** |
| □ | Pre-Pilot Dry Run 10/10 Go |

**다음:** Pre-Pilot Dry Run **Attempt #2** (1~3분 MP4) → 10/10 Go 후 Live Pilot

---

## Dry Run Attempt #1 (2026-06-30)

| # | 항목 | 결과 |
|---|------|------|
| 1~4 | Coach · Parent · Link · Validation Console | ✅ |
| 5~7 | Upload · Storage · ROI | ✅ |
| 8 | Whisper | ❌ Timeout (`AMD_U18_10min.mp4` 45.1MB) |
| 9~10 | Vision pipeline · Logs | ⏳ Attempt #2 |

**판정:** NO-GO (일시 중단) · **Go 유지** — 짧은 MP4 재시도

**확인자:** _______________ · **Date:** _______________

---

## Dry Run 필수 확인

| # | 항목 |
|---|------|
| 1 | Coach 로그인 · `teamId` staff 권한 |
| 2 | Parent 로그인 · `player-ap-63d56190` parentLink |
| 3 | Upload → Queue → Job Monitor → Firestore |
| 4 | Coach UI · Parent UI · Timeline · Logs |

**Live Pilot 시:** 실 MP4 업로드 후 최종 `matchId` / `runId`는 Daily Log에 기록
