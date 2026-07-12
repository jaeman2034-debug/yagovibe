# Vision Match Detail Tab Routing — Post-Deploy Smoke

**Document ID:** `VISION-TAB-ROUTING-POST-DEPLOY-SMOKE`  
**Date:** 2026-07-12 (KST)  
**Status:** 🔒 **FINAL PASS / ACCEPTED**  
**Issue:** 🔒 **COMPLETE / CLOSED**  
**Deployed HEAD:** `a86d097` (feature `918208c82d4435610614d898e4b1dad1d9983228`)  
**Hosting:** https://yago-vibe-spt.web.app  
**Raw JSON:** `vision_tab_routing_qa/prod_smoke/local_browser_qa.json`  
**Script:** `VISION_QA_BASE_URL=https://yago-vibe-spt.web.app npx tsx scripts/vision-tab-routing-local-qa.ts`

---

## Source

```text
https://yago-vibe-spt.web.app/teams/D7TUZaOtfxdBc4P0lQLx/vision/match/vision-pilot-pass01-clip-002
```

---

## Production Click Facts

### Coach
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `.../vision/match/vision-pilot-pass01-clip-002#vision-coach` |
| `#vision-coach` 존재 | **Y** |
| Coach 섹션 이동 | **Y** |
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
| 클릭 후 URL | `...#vision-timeline` |
| `#vision-timeline` 존재 | **Y** |
| Timeline 섹션 이동 | **Y** |

### Parent
| 항목 | 결과 |
|---|---|
| 클릭 후 URL | `/home/parent/vision/report?teamId=D7TUZaOtfxdBc4P0lQLx&playerId=P0100&matchId=vision-pilot-pass01-clip-002` |
| teamId / playerId / matchId 보존 | **Y / Y / Y** |
| Parent Vision Report 열람 | **Y** |
| `/home/admin` redirect | **N** |
| `/play` 오라우팅 | **N** |

**관측 오류:** 없음 (pageErrors: [])

---

## PM Final Review

| Item | Value |
|---|---|
| Post-Deploy Smoke | 🔒 **FINAL PASS / ACCEPTED** |
| Issue status | 🔒 **COMPLETE / CLOSED** |
| PM | 2026-07-12 PASS 승인 |

```text
Vision Match Detail Tab Routing Fix = PASS / COMPLETE / CLOSED 🔒
```

---

## Separated (unchanged)

- Day-03 DATE_GATE_PENDING
- PAI-011 / PAI-012 · VOC-011 count **15**
- PROD-OBS-012 / PAI-031 ▶ OPEN
- Team Hub Observation

**Recorded by:** Engineering Track A · 2026-07-12  
**Closed by:** PM Final Review · 2026-07-12
