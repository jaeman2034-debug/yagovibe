# YAGO Vision v1.0 — Final Release Note

> **Status:** 🔒 **FINAL PASS**  
> **Version:** v1.0 (Intelligence Pipeline)  
> **Date:** 2026-06-29  
> **Prior RC tag:** `v1.0-rc5`  
> **Recommended tag:** `vision-v1.0-final`  
> **Production:** `https://yago-vibe-spt.web.app`

**Declaration:** `YAGO_VISION_V1_0_FINAL_PASS_DECLARATION.md`  
**Gate Checklist:** `YAGO_VISION_V1_0_FINAL_GATE_CHECKLIST.md`

---

## Summary

축구 훈련 영상 업로드부터 **Coach Review → Growth Signals → Avatar Promotion → Parent Home**까지의 **End-to-End Intelligence Pipeline**이 Pilot #1에서 운영 검증을 완료했습니다.

```text
Whisper → ROI → cvRun APPROVED
  → J3 Signal Extraction → J6 Growth Link ACCEPTED
  → I8 Interpretation → I9 Growth Signals → I10 OVR Draft
  → I11 Avatar Draft → I11-3 Promotion → I11-3-3 Apply
  → I12 Parent Home (read-only)
```

---

## What's Included

| Layer | Sprint | Deliverable |
|-------|--------|-------------|
| CV Core | RC5 | Validation Console · Whisper · ROI · cvRun · Coach Review |
| Interpretation | I8 | quality / movement / physical candidates · Coach Approve |
| Growth Signals | I9 | growthSignals subcollection · Preview · Compare |
| OVR Draft | I10 | FII axis weights → overall OVR Preview |
| Avatar | I11 | Draft · Validation · Promotion Preview · **SoT Apply** |
| Parent | I12 | Parent Home · Avatar Surface · Goal · XP · Season · League · Market |

---

## Pilot #1 Results

| Metric | Value |
|--------|-------|
| Team | `D7TUZaOtfxdBc4P0lQLx` |
| Primary mediaId | `a0489cb0ce394cd1b9af7e0b` |
| Growth link | `9154f90e6fdf48698708e0e0` (accepted) |
| Player | `player-ap-63d56190` |
| Avatar OVR (SoT) | **88** |
| Level / Tier | 4 / Gold |
| Badges | 6 |
| Growth Score (session) | **85점** (별도 지표) |
| Promotion audit | 88 → 88 (changed 0) |

---

## Key Architecture Decisions (LOCK)

| Decision | Detail |
|----------|--------|
| Avatar SoT | `teams/{teamId}/playerGrowthAvatar/{playerId}` |
| Apply source | `promoteCvGrowthToPlayerAvatar` (I11-3-3) |
| Audit trail | `avatarPromotionAudits` subcollection |
| Growth Signals SoT | `cvGrowthLinks/{linkId}/growthSignals` (NOT root collection) |
| Parent OVR read | `playerGrowthAvatar.ovr` |
| Parent Growth Score | `playerGrowthHistory.metrics.growthScore.overall` |
| Apply → History | **자동 미생성** (별도 D-4.2 파이프라인) |

---

## Verification

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
node scripts/verify-vision-v1-final-state.mjs
```

**PASS criteria:**

- `avatarPromotionAudits >= 1`
- `playerGrowthAvatar` ovr/level/tier/badges = preview proposed
- preview status = `promoted`

---

## Known UX Note

Parent Home에서 **OVR 88** (Avatar Hero)과 **85점** (최근 성장 Growth Score)이 함께 표시됩니다.  
두 값은 **서로 다른 Firestore SoT**에서 읽으며, 혼동 방지를 위해 UI 라벨 구분이 권장됩니다 (v2 backlog).

---

## Out of Scope (v1.0)

- Engine / Worker 변경
- `playerGrowthHistory` 자동 생성 on Apply
- Validation Console Step 5 Parent block ↔ CV Run 직접 bind
- Vision v2 detection / tracking 개선
- I13+ 신규 Sprint 기능

---

## Handoff

Vision v1.0은 **Intelligence Pipeline Baseline**으로 고정합니다.

다음 Sprint(I13+) 착수 전:

1. Git tag `vision-v1.0-final` 생성
2. Parent Vision Report 캡처 1장 (증빙 패키지)
3. Improvement backlog triage (`YAGO_VISION_RC5_OPS_IMPROVEMENT_BACKLOG.md`)

---

## Related Documents

| Doc | Purpose |
|-----|---------|
| `YAGO_VISION_V1_0_FINAL_PASS_DECLARATION.md` | PM Final PASS |
| `YAGO_VISION_V1_0_FINAL_GATE_CHECKLIST.md` | Full gate matrix |
| `YAGO_VISION_RC5_5_CLOSURE_REPORT.md` | RC5 CV Core closure |
| `YAGO_VISION_I8_PILOT1_RUN_SHEET.md` | I8 operational run |
| `YAGO_VISION_PILOT1_EVIDENCE_PACK.md` | External evidence template |
