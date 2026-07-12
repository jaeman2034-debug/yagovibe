# Vision Match Detail Tab Routing — Local Browser QA Fact

**Document ID:** `VISION-TAB-ROUTING-LOCAL-BROWSER-QA`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **ACCEPTED** (PM)  
**Method:** Playwright actual click · local Vite `127.0.0.1:5173`  
**Script:** `scripts/vision-tab-routing-local-qa.ts`  
**Raw JSON:** `vision_tab_routing_qa/local_browser_qa.json`

---

## Source

```text
/teams/D7TUZaOtfxdBc4P0lQLx/vision/match/vision-pilot-pass01-clip-002
```

---

## Click Facts

### Coach
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `.../vision/match/vision-pilot-pass01-clip-002#vision-coach` |
| `#vision-coach` 존재 | **Y** |
| Coach 섹션으로 실제 이동 | **Y** |
| Play Lounge 진입 | **N** |

### Match
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `.../vision/match/vision-pilot-pass01-clip-002` |
| hash 제거 | **Y** |
| Match Detail 정상 | **Y** |

### Timeline
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `.../vision/match/vision-pilot-pass01-clip-002#vision-timeline` |
| `#vision-timeline` 존재 | **Y** |
| Timeline 섹션으로 실제 이동 | **Y** |

### Parent
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `/home/parent/vision/report?teamId=D7TUZaOtfxdBc4P0lQLx&playerId=P0100&matchId=vision-pilot-pass01-clip-002` |
| teamId 보존 | **Y** |
| playerId 보존 | **Y** |
| matchId 보존 | **Y** |
| Parent Vision Report 정상 열람 | **Y** |
| `/home/admin` redirect | **N** |

**관측 오류:** 없음

---

## PM Acceptance

| Item | Value |
|---|---|
| Local Browser QA | 🔒 **ACCEPTED** |
| 4-tab click routing | **ALL PASS** |
| Commit | ✅ GO (후속) |

---

## Separated (unchanged)

- PAI-011 / PAI-012 COMPLETE/CLOSED
- Day-03 DATE_GATE_PENDING
- PROD-OBS-012 / PAI-031
- Team Hub → Play Lounge (Observation only)

**Recorded by:** Engineering Track A · 2026-07-12  
**Accepted by:** PM · 2026-07-12
