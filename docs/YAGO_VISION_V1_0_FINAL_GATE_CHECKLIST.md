# YAGO Vision v1.0 — Final Gate Checklist

**Status:** 🔒 **FINAL PASS**  
**Date:** 2026-06-29  
**Scope:** RC5 CV Core → I8–I12 · 운영 검증 · Engine/Worker 변경 금지  
**Pilot teamId:** `D7TUZaOtfxdBc4P0lQLx`  
**Declaration:** `YAGO_VISION_V1_0_FINAL_PASS_DECLARATION.md`  
**Release Note:** `YAGO_VISION_V1_0_FINAL_RELEASE_NOTE.md`  
**Recommended tag:** `vision-v1.0-final`

---

## 1. Executive Summary

| Layer | Sprint | Gate |
|-------|--------|------|
| CV Core Pipeline | RC5 | ✅ PASS |
| Interpretation | I8 | ✅ PASS |
| Growth Signals | I9 | ✅ PASS (운영) |
| OVR Draft | I10 | ✅ PASS (Preview) |
| Avatar Draft + Validation | I11-1/2 | ✅ PASS |
| Avatar Promotion Preview | I11-3 | ✅ 생성 |
| Avatar SoT Apply | I11-3-3 | ✅ PASS (2026-06-29) |
| Parent Experience | I12 | ✅ PASS |
| Vision v1.0 Final | — | 🔒 **FINAL PASS** |

---

## 2. Pipeline Chain (LOCK)

```text
Whisper → ROI → cvRun APPROVED
  ↓ J3 Signal Extraction
  ↓ J6 Growth Link ACCEPTED
  ↓ I8-2 Classification → I8-4 Approve
  ↓ I9-1 Mapping → I9-2 Validate
  ↓ I9-3 FII Draft → I10 OVR Draft
  ↓ I11-1 Avatar Draft → I11-2 Validate
  ↓ I11-3 Promotion Preview → Validate
  ↓ I11-3-3 Apply → playerGrowthAvatar
  ↓ I12 Parent read-only surfaces
```

---

## 3. Verification Matrix

### 3.1 RC5 — CV Core ✅

| # | Check | Method | PASS |
|---|-------|--------|------|
| R1 | web.app Validation Console | `/teams/{teamId}/validation-console` | ✅ |
| R2 | Whisper → anonymized → ROI → cvRun | Step 1–4 UI | ✅ |
| R3 | Coach Review APPROVED | CvReviewPanel | ✅ |
| R4 | J3/J5/J6 | Step 5 cyan block | ✅ |

### 3.2 I8 — Interpretation ✅

| # | Check | PASS |
|---|-------|------|
| I8-1 | quality / movement / physical candidates | ✅ |
| I8-2 | 한국어 해석 문구 | ✅ |
| I8-3 | Coach Approve 3건 | ✅ |

**SoT:** `cvGrowthLinks/{linkId}/interpretationCandidates`

### 3.3 I9 — Growth Signals ✅

| # | Check | PASS |
|---|-------|------|
| I9-1 | growthSignals draft (subcollection) | ✅ 6건 (`a0489cb0…`) |
| I9-2 | Preview + What-if Compare UI | ✅ |
| I9-3 | FII Draft (validated signals 기준) | ✅ Preview |

**SoT:** `cvGrowthLinks/{linkId}/growthSignals`  
**금지:** root `playerGrowthSignals` (0건 = 정상)

### 3.4 I10 — OVR Draft ✅

| # | Check | PASS |
|---|-------|------|
| I10-1 | OVR Draft Preview (5축) | ✅ UI |
| I10-2 | Formula = FII axis weights → overall | ✅ 코드 LOCK |

**선행:** I9 growthSignals **validated** 후 FII/OVR persist

### 3.5 I11 — Avatar ✅ (Apply 전)

| # | Check | PASS |
|---|-------|------|
| I11-1 | Avatar Draft (playerGrowthOvr → draft) | ✅ |
| I11-2 | validationStatus = **validated** | ✅ |
| I11-3-1 | Avatar Promotion Preview 생성 | ✅ |
| I11-3-2 | Preview validationStatus = validated | ⏳ Step 5 확인 |
| I11-3-3 | **Avatar SoT Apply** | ✅ PASS |

**운영 SoT (2026-06-29 · Apply 완료):**

```text
mediaId:  a0489cb0ce394cd1b9af7e0b
linkId:   9154f90e6fdf48698708e0e0
playerId: player-ap-63d56190
avatarPromotionPreview: status=promoted · validated ✅
avatarPromotionAudits:  1 ✅
playerGrowthAvatar:     ovr=88 · level=4 · tier=gold · badges=6 ✅
audit:                  beforeOvr=88 · afterOvr=88 (changed 0 = SoT 일치)
```

---

## 4. I11-3-3 Apply — 운영 Run Sheet

### 4.1 UI (Step 5)

1. **Avatar Promotion Preview (I11-3)** 카드 확인
2. Preview **Validate** → `validationStatus=validated`
3. **「Avatar SoT Apply」** 버튼 클릭 (`CvAvatarPromotionWritePanel`)
4. **「Promoted (I11-3-3)」** + auditId 표시 확인

### 4.2 Apply 시 Firestore Write (LOCK)

| Path | Action |
|------|--------|
| `teams/{teamId}/playerGrowthAvatar/{playerId}` | **Replace** (merge=false) |
| `cvGrowthLinks/{linkId}/avatarPromotionAudits/{auditId}` | **append** |
| `avatarPromotionPreviews/{previewId}` | status → `promoted` |

**Apply 조건 (Callable `promoteCvGrowthToPlayerAvatar`):**

- preview.validationStatus = `validated`
- avatarDraft.validationStatus = `validated`
- cvGrowthLink.reviewStatus = `accepted`
- dedupeKey 중복 없음

### 4.3 Apply 후 검증 스크립트

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
node scripts/verify-vision-v1-final-state.mjs
```

**PASS 기준:**

- `avatarPromotionAudits >= 1`
- `playerGrowthAvatar` ovr/level/badges = preview proposed 값
- preview status = `promoted`

### 4.4 Smoke (선택)

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
$env:SMOKE_MEDIA_ID='a0489cb0ce394cd1b9af7e0b'
$env:SMOKE_LINK_ID='9154f90e6fdf48698708e0e0'
$env:SMOKE_AVATAR_PREVIEW_ID='<previewId from UI>'
node scripts/smoke-cv-i11-3-3-callable.mjs
```

---

## 5. playerGrowthAvatar SoT

| 항목 | 값 |
|------|-----|
| Canonical path | `teams/{teamId}/playerGrowthAvatar/{playerId}` |
| Apply source | `cv_avatar_promotion` (I11-3-3) |
| Pre-Apply baseline | `player-ap-63d56190` · ovr=88 · level=4 · badges=6 |

**주의:** Apply **전** playerGrowthAvatar는 기존 OVR SoT 스냅샷일 수 있음.  
Apply **후** audit before/after로 delta 확인.

**sessionCount 등 operational 필드:** Replace 시 **보존** (I11 J0 LOCK)

---

## 6. Promotion History

| Store | 용도 | CV Apply 시 |
|-------|------|-------------|
| `avatarPromotionAudits` | CV promotion audit trail | ✅ **생성** |
| `playerGrowthHistory` | Timeline / Parent narrative | ❌ **자동 미생성** (I11-3-3 LOCK) |

Promotion History = **`avatarPromotionAudits` subcollection**  
Parent Timeline = **`playerGrowthHistory`** (별도 D-4.2 파이프라인)

---

## 7. I12 — Parent Report 연결

### 7.0 OVR 85 vs 88 — Read-path 판정 (2026-06-29)

Parent Home에는 **서로 다른 두 지표**가 함께 표시됩니다.

| UI 영역 | Firestore SoT | Pilot 값 | 라벨 |
|---------|---------------|----------|------|
| **ParentHeroSummary / I12-1 Avatar Surface** | `teams/.../playerGrowthAvatar/{playerId}.ovr` | **88** | **OVR** |
| **최근 성장 (GrowthSummarySection)** | `playerGrowthHistory` → `metrics.growthScore.overall` | **85** | **점** (Growth Score) |

→ **OVR 85는 Avatar SoT 미반영 버그가 아님.**  
→ 훈련 리포트 **Growth Score 85점**과 Avatar **OVR 88**이 **의도적으로 분리**된 설계입니다.

**검증 명령:**

```powershell
node scripts/verify-vision-v1-final-state.mjs
# playerGrowthAvatar ovr=88 · playerGrowthHistory overall=85 (별도)
```

**I12-1 PASS 기준:** Avatar Surface / Hero Summary **OVR = 88** (playerGrowthAvatar read)

### 7.1 Read Path (LOCK · write 금지)

| Surface | Component / Hook | SoT |
|---------|------------------|-----|
| Parent Home | `ParentHomeGrowthCardV2` | `playerGrowthAvatar` |
| Linked child avatar | `useParentLinkedChildAvatar` | `playerGrowthAvatar` + timeline |
| Parent Vision Report | `/home/parent/vision/report` | RC4 parentInsights + avatar read |
| Validation Console Step 5 | `ParentGrowthHeroCard` | 기존 growth narrative (CV 직접 연결 아님) |

### 7.2 I12 PASS 조건 (Apply 후)

| # | Check |
|---|-------|
| P1 | Parent Home — Level / OVR / badges 반영 |
| P2 | `useParentLinkedChildAvatar` — 동일 playerId avatar load |
| P3 | Parent Vision Report URL 오픈 (RC4 M4 pattern) |
| P4 | CV Apply audit afterOvr ↔ Parent card OVR 일치 |

**Pilot Parent Report URL (RC5-4):**

```text
/home/parent/vision/report?teamId=D7TUZaOtfxdBc4P0lQLx&playerId=player-ap-63d56190&matchId=vision-pilot-pass01-clip-002
```

### 7.3 Known Gap (문서 정렬)

- Validation Console **Step 5 Parent block** ≠ CV Run 직접 bind (RC5-6 LOCK)
- I12 Parent Experience = **playerGrowthAvatar read** after Apply
- RC4 Vision Parent Report = **fixture / parentInsights** path (CV chain 별도)

---

## 8. Vision v1.0 Final Gate — PASS Criteria

**ALL required for v1.0 Final PASS:**

```text
☑ RC5 CV Core — web.app E2E
☑ I8 Interpretation — 3 approved
☑ I9 Growth Signals — draft + validation
☑ I10 OVR Draft — preview rendered
☑ I11 Avatar — draft validated + promotion preview validated
☑ I11-3-3 Apply — avatarPromotionAudits >= 1
☑ playerGrowthAvatar — ovr=88 level=4 tier=gold badges=6
☑ I12 Parent — Home read verification (avatar OVR 88 · Growth Score 85 = 별도 지표)
☐ Parent Vision Report URL 캡처 (증빙 권장 · Final PASS 차단 아님)
☑ Promotion audit before/after (changed 0 = 정상)
☑ PM sign-off (2026-06-29)
```

---

## 9. PM 판정 (2026-06-29)

| Sprint | Status |
|--------|--------|
| RC5 | ✅ PASS |
| I8 | ✅ PASS |
| I9 | ✅ PASS |
| I10 | ✅ PASS (Preview) |
| I11-1/2/3 Preview | ✅ PASS |
| **I11-3-3 Apply** | ✅ PASS |
| **I12 Parent** | ✅ PASS (avatar OVR 88 · Growth Score 85 별도) |
| **Vision v1.0 Final** | 🔒 **FINAL PASS** |

---

## 10. Closure Actions

| # | Action | Status |
|---|--------|--------|
| 1 | Avatar SoT Apply | ✅ |
| 2 | Parent Home read verification | ✅ |
| 3 | Read-path (OVR vs Growth Score) 판정 | ✅ |
| 4 | PM Final PASS 선언 | ✅ |
| 5 | Final Gate / Release Note 문서 | ✅ |
| 6 | Git tag `vision-v1.0-final` | ⏳ 운영 총괄 |
| 7 | Parent Vision Report 캡처 1장 | ⏳ 증빙 권장 |

---

## 11. References

- `docs/YAGO_VISION_V1_0_FINAL_PASS_DECLARATION.md`
- `docs/YAGO_VISION_V1_0_FINAL_RELEASE_NOTE.md`
- `docs/YAGO_VISION_I8_PILOT1_RUN_SHEET.md`
- `docs/YAGO_CV_LAYER_I12_PARENT_EXPERIENCE_BRIEF.md`
- `docs/YAGO_VISION_RC5_6_POST_APPROVAL_RUN_SHEET.md`
- `scripts/verify-vision-v1-final-state.mjs`
- `scripts/smoke-cv-i11-3-3-callable.mjs`
