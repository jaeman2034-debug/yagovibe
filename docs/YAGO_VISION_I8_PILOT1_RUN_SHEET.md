# Vision Sprint I8 — Pilot #1 Operational Run Sheet

**Status:** ▶ IN PROGRESS  
**Date:** 2026-06-29  
**Parent:** RC5 Pilot #1 GO · `docs/YAGO_CV_LAYER_I8_GROWTH_INTERPRETATION_BRIEF.md`

---

## 판정

| Layer | 상태 |
|-------|------|
| RC5 CV Core (Whisper → ROI → cvRun → J5/J6) | ✅ 운영 반영 |
| I8-1 ~ I8-4 (코드) | ✅ 구현 완료 |
| I8 Pilot #1 (운영 데이터) | ▶ 진행 |

---

## Pilot #1 SoT

| Field | Value |
|-------|-------|
| teamId | `D7TUZaOtfxdBc4P0lQLx` |
| coachUid | `jMLLIxyOVkN1HERAd2gz88uKj9e2` |
| console | `/teams/D7TUZaOtfxdBc4P0lQLx/validation-console` |

---

## I8 체인 (Step 5)

```text
J3 Signal Extraction     → cvGrowthLinks 생성
J6 Growth Link Review    → accepted
I8-2 Classification      → interpretationCandidates (자동 또는 수동 버튼)
I8-3 Preview             → 한국어 해석 문구 + signal 값
I8-4 Coach Review        → Approve / Reject
```

**2026-06-29 추가:**

- J6 `accepted` 시 **I8-2 자동 실행** (`reviewCvGrowthLink` 후속)
- 수동 **`Interpretation Classification (I8-2) 실행`** 버튼 (기존 accepted link 백필용)
- Signal별 **한국어 해석 문구** (`cvInterpretationCopy.ts`)

---

## 운영 체크리스트

1. Step 5에서 J5 Signals · History 확인
2. **J6** — cvGrowthLink **Accept**
3. **I8-3** — Interpretation Candidates 카드에 quality / movement / physical 표시
4. 각 signal 아래 `→ 선수 추적 안정성이 양호합니다.` 등 해석 문구 확인
5. **I8-4** — candidate Approve / Reject
6. (다음 스프린트) I9 Growth Validation

---

## Smoke (운영 · 선택)

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
$env:SMOKE_MEDIA_ID='<mediaId>'
$env:SMOKE_LINK_ID='<acceptedLinkId>'
$env:SMOKE_ACTOR_UID='jMLLIxyOVkN1HERAd2gz88uKj9e2'
npm --prefix functions run build
node scripts/smoke-cv-i8-5-pilot-preflight.mjs
```

---

## Deploy (I8-2 callable)

```bash
npm run p0:guard
npm --prefix functions run build
firebase deploy --only functions:generateInterpretationCandidates,functions:reviewCvGrowthLink
npm run build
firebase deploy --only hosting
```

---

## 다음 Gate

| Sprint | 내용 |
|--------|------|
| I9 | Growth Signal Validation |
| I10 | OVR Draft |
| I11 | Avatar Promotion |
| I12 | Parent Report |
