# Vision Nav — Team Hub Observation (NON-SCOPE)

**Date:** 2026-07-12  
**Track:** Vision Match Detail tab routing regression (Coach / Timeline / Parent)  
**Status:** 📝 OBSERVATION ONLY — **코드 변경 없음**

---

## Fact

`visionTeamHubPath(teamId, matchId)` → `teamPlayEntryPath` →

```text
/teams/{teamId}/play?matchId={matchId}
```

즉 **팀 허브** 탭은 현재 Play Lounge로 연결된다.

---

## Decision (PM 2026-07-12)

| 항목 | 판정 |
|---|---|
| 이번 Minimal Fix 범위 | Coach / Timeline / Parent only |
| 팀 허브 코드 변경 | ❌ 금지 |
| 후속 | Navigation semantics review 후보 |

---

## Separated from

- PROD-OBS-012 / PAI-031 (GEV Job Monitor)
- Day-03 DATE_GATE_PENDING
- PAI-011 / PAI-012 feature logic
