# PAI-032 — Vision Nav Duplicate Root Cause Review

**Document ID:** `VISION-NAV-DUPLICATE-ROOT-CAUSE-REVIEW`  
**Date:** 2026-07-12 (KST)  
**Status:** 📝 **ROOT CAUSE REVIEW** · ⏳ **PM GO / NO-GO 대기**  
**Action Item:** **PAI-032** ▶ OPEN  
**Observation:** `VISION_NAV_DUPLICATE_OBSERVATION.md`  
**Code change:** ❌ **금지** (본 문서 범위)

---

## 1. Observed Fact

Parent Vision Report (`/home/parent/vision/report?...`)에서 `VisionPlatformNav` pill 행이 **2회** 노출된다.

| Layer | Location |
|---|---|
| Page | `ParentVisionReportPage` 제목 아래 |
| Section | `ParentIntelligenceSection` → `ParentIntelligenceGrid` 카드 그리드 상단 |

동일 `data-testid="vision-nav-*"` 중복 → Playwright strict click 시 2 elements.

---

## 2. Root Cause

**의도된 dual-surface UX가 아니라, 페이지와 재사용 섹션이 각각 Nav를 붙인 결과의 중복이다.**

1. RC4-5 M5에서 `VisionPlatformNav`를 각 Vision surface에 붙이는 패턴이 도입됨.  
2. `ParentVisionReportPage`가 **page-level** Nav를 추가함.  
3. `ParentIntelligenceSection`(v6-6)이 matchId 있을 때 **section-level** Nav를 자체 렌더함.  
4. Report 페이지가 섹션을 자식으로 포함 → **같은 화면에서 Nav × 2**.

Spec (`docs/YAGO_VISION_RC4_5_M5_REPORT.md`)은 “Parent Flow에 Nav”만 명시하고, **page + section 이중 부착을 SoT로 요구하지 않음.** → 의도된 중복 UX로 보기 어려움.

---

## 3. Render Call Sites (전체)

| # | File | Context | `current` |
|---|---|---|---|
| 1 | `ParentVisionReportPage.tsx` | Parent Report page | `parent-report` |
| 2 | `ParentIntelligenceSection.tsx` (`ParentIntelligenceGrid`) | Section (when `matchId`) | `parent-report` |
| 3 | `PlayerGrowthProfilePage.tsx` | Growth profile page | `player-profile` |
| 4 | `VisionMatchDetailPanel.tsx` | Match Detail | hash-derived / `match-detail` |
| 5 | `CoachVisionAnalysisSection.tsx` | Coach surface | `coach` |
| 6 | `VisionTeamHubEntryCard.tsx` | Team hub card | (card local) |
| 7 | `VisionPilotBetaPage.tsx` | Pilot beta | — |
| 8 | `VisionE2EDemoPage.tsx` | E2E demo | — |

**중복이 발생하는 조합:**

| Host page | Page Nav | Section Nav (`ParentIntelligenceSection`) | 결과 |
|---|---|---|---|
| `ParentVisionReportPage` | ✅ `parent-report` | ✅ `parent-report` | **이중 · 동일 active** |
| `PlayerGrowthProfilePage` (parent + matchId) | ✅ `player-profile` | ✅ `parent-report` | **이중 · active 불일치** |

---

## 4. Props 비교 (Parent Vision Report)

| Prop | Page-level (`ParentVisionReportPage`) | Section-level (`ParentIntelligenceGrid`) |
|---|---|---|
| `teamId` | URL query | props (동일) |
| `matchId` | URL query | props (동일) |
| `playerId` | URL query | props (동일) |
| `linkedPlayerId` | 미전달 (trackId면 Player 숨김) | 미전달 (동일) |
| `current` | `"parent-report"` | `"parent-report"` |
| `variant` / `compact` | light / compact | light / compact |

→ Report 페이지에서는 **기능적으로 동일 Nav의 복제**.

Growth Profile에서는 `current`만 **불일치** (`player-profile` vs `parent-report`) → 어느 탭이 active인지 UX가 더 혼란.

---

## 5. Spec / SoT — 의도된 UX인가?

| Source | 내용 | 이중 Nav 요구? |
|---|---|---|
| RC4-5 M5 Report | Parent Flow · Nav on Parent Report surfaces | ❌ 단일 surface Nav만 |
| `visionPlatformRoutes` | 단일 navigation contract | ❌ |
| Observation PAI-032 | 실관측 중복 | 버그/회귀 후보 |

**판정:** 의도된 UX **아님**. Canonical owner 하나로 수렴해야 함.

---

## 6. Canonical Nav Owner 제안

### 권장: **Page-level (호스트 페이지)가 canonical owner**

근거:

1. Route 경계(`ParentVisionReportPage`, `PlayerGrowthProfilePage`, Match Detail, Coach section-as-surface)가 “현재 surface”를 안다.  
2. `ParentIntelligenceSection`은 **콘텐츠 블록**(Peer Benchmark · FII cards) — 임베드 시 부모가 이미 Nav를 가질 수 있음.  
3. 섹션이 Nav를 소유하면 Growth Profile처럼 `current` 불일치가 재발하기 쉬움.

### 제거 대상 (제안)

| 제거 | 유지 |
|---|---|
| `ParentIntelligenceSection` / `ParentIntelligenceGrid` 내부 `VisionPlatformNav` | `ParentVisionReportPage` page-level Nav |
| | `PlayerGrowthProfilePage` page-level Nav (`current="player-profile"`) |

---

## 7. 제거 시 Routing / Feature Impact

| Area | Impact | Risk |
|---|---|---|
| Coach / Match / Timeline / Parent / Player routes | helpers·href 동일 · 클릭 대상만 1개로 정리 | **Low** |
| PAI-011 Peer Benchmark | `ParentPeerBenchmarkCard`는 Nav와 무관 · 섹션 내 카드 유지 | **None** (로직 비접촉) |
| PAI-014 Player Tab ID Guard | page-level Nav의 trackId hide 로직 유지 | **None** |
| Parent Report only | Nav 1행만 남음 · 기대 UX | **Low** |
| Growth Profile + parent + matchId | 이중 Nav + active 불일치 해소 | **Positive** |
| Section-only embed without page Nav | 현재 call site 2곳 모두 page Nav 보유 | **None** (현 SoT) |

**예상 regression risk: Low** — 단, Minimal Fix 후 Local Browser QA (Parent Report · Growth Profile · Peer card · Player tab Case A/B) 1회 권장.

---

## 8. Minimal Fix 제안 (구현 금지 · PM 승인 후)

1. `ParentIntelligenceSection.tsx`에서 `VisionPlatformNav` import·렌더 **제거**.  
2. `ParentVisionReportPage` / `PlayerGrowthProfilePage` page-level Nav **유지**.  
3. (선택) `showPlatformNav?: boolean` 기본 `false`로 두지 않음 — 섹션에 Nav를 다시 넣지 않는 쪽이 단순.  
4. Unit/Playwright: Parent Report에서 `vision-nav-parent-report` count === 1.  
5. Duplicate Observation → CLOSED after Smoke; PAI-032 COMPLETE after PM.

**비포함:** 신규 route · CF · Rules · PAI-011/012/013/014 로직 · PROD-OBS-012 · Day-03.

---

## 9. Deliverable Summary (PM용)

| Item | Conclusion |
|---|---|
| **Root Cause** | Page + `ParentIntelligenceSection` 각각 Nav 부착 → Report/Growth에서 이중 렌더 |
| **Call sites (중복 쌍)** | `ParentVisionReportPage` ↔ `ParentIntelligenceGrid`; `PlayerGrowthProfilePage` ↔ 동일 섹션 |
| **Canonical owner** | **Page-level** |
| **제거 대상** | Section 내부 `VisionPlatformNav` |
| **Regression risk** | **Low** (Peer/PAI-014 비접촉) |
| **Minimal Fix** | 섹션 Nav 제거 · page Nav 유지 · QA 후 CLOSED |

---

## 10. Gate

```text
Root Cause Review ✅ (본 문서)
        ↓
PM Minimal Fix GO / NO-GO ⏳
        ↓
(GO 시) Minimal Fix → Local QA → Commit → Pre-Deploy …
```

❌ 코드 수정 · Deploy · COMPLETE/CLOSED — 본 단계에서 **금지**

**Prepared by:** Engineering Track A · 2026-07-12  
**Next:** PM GO / NO-GO
