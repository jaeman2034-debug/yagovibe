# Vision Nav — Team Hub / Play Lounge Observation

**Date:** 2026-07-12  
**Track:** Vision Match Detail tab routing · navigation wording  
**Status:** ✅ **RESOLVED — WORDING ALIGNED** (no PAI created)

---

## Fact (route — unchanged)

`visionTeamHubPath(teamId, matchId)` → `teamPlayEntryPath` →

```text
/teams/{teamId}/play?matchId={matchId}
```

Destination semantics: **Team Play / Play Lounge** (not a separate Hub Vision surface).

---

## PM semantic decision (2026-07-12)

| 항목 | 판정 |
|---|---|
| 「팀 허브」 = Play Lounge 공식 명칭? | **N** |
| `/teams/:teamId/play` 공식 의미 | **Team Play / Play Lounge** |
| Classification | **S3 / Low** · navigation wording / destination semantics mismatch |
| Functional blocker | **N** |
| New PAI | **NO-GO** |
| Separate Hub Vision surface | **NO-GO** |
| PAI CLOSED classification | **N/A** — PAI was never created |

---

## Minimal alignment (code)

| Item | Value |
|---|---|
| Active CTA | `VisionPlatformNav` `id: "team-hub"` |
| Old wording | `팀 허브` |
| New wording | `팀 플레이` |
| Feature commit | `26484dc` |
| Route target | **unchanged** · `visionTeamHubPath` / `teamPlayEntryPath` |
| Match Detail back link | 이미 `팀 플레이로 돌아가기` · 미변경 |

**Not changed (out of scope):** 공개 팀 허브(`/team/:id/public`) · generic Hub product copy · historical spotcheck JSON.

---

## Production Hosting smoke (2026-07-12)

| # | Check | Fact |
|---|---|---|
| 1 | Vision nav `"팀 플레이"` | **Y** |
| 2 | CTA `/teams/:teamId/play?matchId=...` | **Y** |
| 3 | Play Lounge opens | **Y** |
| 4 | Vision Coach reachable | **Y** |
| 5 | Match Detail back `"팀 플레이로 돌아가기"` | **Y** |
| 6 | Duplicate Vision entry | **N** (label-only change; nav structure unchanged) |
| 7 | Unrelated public Team Hub wording | **unchanged** |

**Hosting:** `https://yago-vibe-spt.web.app` · Project `yago-vibe-spt`  
**JSON:** `vision_team_play_wording_qa/prod_smoke/local_qa.json`  
**Production Vision analysis executed:** **N**

---

## Prior decision trail (2026-07-12 tab routing)

| 항목 | 판정 |
|---|---|
| Coach / Timeline / Parent routing fix | in scope then |
| 팀 허브 route change | ❌ 금지 (당시) |
| 후속 | wording / semantics review → **본 alignment** |

---

## Separated from

- PROD-OBS-012 / PAI-031 CLOSED  
- Day-03 ACCEPT/LOCK  
- PAI-011 / PAI-012  
- PAI-022 PLANNED  

---

**Finalized:** 2026-07-12 · **RESOLVED — WORDING ALIGNED** · functional blocker **N** · new PAI **NO-GO** · Hub Vision surface **NO-GO**
