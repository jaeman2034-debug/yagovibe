# Vision Nav — Team Hub / Play Lounge Observation

**Date:** 2026-07-12  
**Track:** Vision Match Detail tab routing · navigation wording  
**Status:** 📝 **WORDING ALIGNMENT APPLIED** · Observation kept (no PAI) · PM Review pending

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

---

## Minimal alignment (code)

| Item | Value |
|---|---|
| Active CTA | `VisionPlatformNav` `id: "team-hub"` |
| Old wording | `팀 허브` |
| New wording | `팀 플레이` |
| Route target | **unchanged** · `visionTeamHubPath` / `teamPlayEntryPath` |
| Match Detail back link | 이미 `팀 플레이로 돌아가기` · 미변경 |

**Not changed (out of scope):** 공개 팀 허브(`/team/:id/public`) · generic Hub product copy · historical spotcheck JSON.

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

**Updated:** 2026-07-12 · wording `팀 허브` → `팀 플레이` · PM Review STOP
