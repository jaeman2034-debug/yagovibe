# VOC-012 Coach Visual Spot-check Fact

**Document ID:** `VOC-012-VISUAL-SPOTCHECK`  
**Date:** 2026-07-12 (KST)  
**Status:** ✅ **ACCEPTED** (PM Review)  
**PAI-012:** ✅ **PASS** (연계) · ❌ COMPLETE/CLOSED 금지  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경 (VOC-012와 분리)  
**PAI-011 / VOC-011 원장 15:** 🔒 유지  
**Upstream Manual QA:** `VOC_012_MANUAL_QA.md` 🔒 FINAL PASS

---

## Environment

| Item | Value |
|---|---|
| Method | Coach custom-token (`parent.test` / owner) · Playwright · mobile 390×844 + desktop |
| Base | `http://127.0.0.1:5173` |
| Coach uid | `wSlh4oDIqIP4GnV3Di1IeAQnFy13` |
| Route | `/teams/D7TUZaOtfxdBc4P0lQLx/vision/match/vision-pilot-pass01-clip-002` |
| Surface | Vision Match Detail (Coach Report) |
| Previous window | Spot-check seed `voc012-spotcheck-prev-001..003` (n=3) |
| Screenshots | `voc012_spotcheck/coach_play_mobile.png` · `coach_play_desktop.png` |
| Raw JSON | `voc012_spotcheck/spotcheck_result.json` |
| Script | `scripts/voc012-coach-visual-spotcheck.ts` |

> `/teams/.../play` 는 Play Lounge(게임)이며 Vision Coach Report가 아님.  
> Coach Vision SoT 표면 = **Match Detail** (`/teams/.../vision/match/...`).

---

## Checklist Results

| # | 확인 | 결과 |
|---|---|---|
| 1 | Coach Report 정상 열람 | **Y** |
| 2 | 「최근 경기 흐름 비교」카드 노출 | **Y** |
| 3 | 현재 FII 정상 | **Y** |
| 4 | 최근 N경기 평균 정상 | **Y** (N=3) |
| 5 | 차이값 +/- 정상 | **Y** (Ranking Avg/Δ 포함) |
| 6 | UI 카피 정상 | **Y** (`최근 3경기 평균과 비교`) |
| 7 | Ranking 정상 | **Y** (Avg/Δ 컬럼 값 표시) |
| 8 | NaN / undefined 없음 | **Y** |
| 9 | 모바일 레이아웃 정상 | **Y** |

**스크린 육안 확인 완료: Y**  
**관측 오류: 없음**

표시 예 (Fact): Ranking `#1 Player P0100 · FII 72 · Avg 65 · Δ +7`

---

## PM Acceptance

| Item | Value |
|---|---|
| Visual Spot-check | **ACCEPTED** |
| Linked Decision | **PAI-012 PASS** |

---

## Gate

```text
Manual QA ✅ → Coach Visual Spot-check ✅ ACCEPTED
        ↓
PM Final Review → PAI-012 PASS ✅
        ↓
Commit / Push → Pre-Deploy Review
```

❌ COMPLETE/CLOSED · Production 배포 완료 선언 금지

---

**Recorded by:** Engineering Track A · 2026-07-12  
**Accepted by:** PM · 2026-07-12 · PASS  
**Note:** Day-03 Date Gate는 본 Spot-check와 **분리** 유지
