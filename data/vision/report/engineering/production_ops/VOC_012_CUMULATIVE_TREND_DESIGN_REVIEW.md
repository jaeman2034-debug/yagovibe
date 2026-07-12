# VOC-012 — 기간 누적·전술 활용 Trend · Design Review

**Document ID:** `VOC-012-CUMULATIVE-TREND-DESIGN-REVIEW`  
**Status:** 🔒 **PM SCOPE LOCK** → Spike ✅ → Impl ✅ → **PAI-012 PASS** ✅  
**Priority:** P2 Product → PAI-012  
**VOC count (원장):** **7** (변경 금지)  
**PAI-011 / VOC-011:** 🔒 COMPLETE/CLOSED · 원장 **15** 유지 · 본 문서에서 미변경  
**Day-03:** 🛑 DATE_GATE_PENDING · Official Fact / ACCEPT/LOCK 미변경  
**PAI-012:** ✅ PASS · ❌ COMPLETE/CLOSED 금지

---

## 상태 전이

```text
관찰 → DESIGN REVIEW → PM SCOPE LOCK ✅ → ENG SPIKE ✅ → (다음) Impl Spec 1p → IMPLEMENT
```

**지금:** Scope LOCK + Spike COMPLETE · **구현하지 않음** · Impl Spec / PM Review 대기

---

## PM 1차 Scope LOCK

| 항목 | 확정 |
|---|---|
| 사용자 | **Coach only** |
| 비교 윈도우 | **최근 K-match** |
| K | **최근 3경기** (이전 경기만, 현재 제외) |
| 지표 | **FII only** |
| 비교 방식 | 현재 경기 FII ↔ 이전 최대 3경기 평균 |
| 최소 이력 | 이전 경기 **n ≥ 2** |
| Surface | **Vision Coach Report** |
| Parent 「지난주」 | ❌ v1 제외 |
| Growth/telemetry | ❌ 제외 |
| 신규 CF / root SoT | ❌ 금지 |

### UI 카피 LOCK

| 조건 | 카피 |
|---|---|
| 타이틀 | **최근 경기 흐름 비교** |
| n=3 표시 예 | `현재 FII 72 · 최근 3경기 평균 65.3 · +6.7` |
| n=2 | **최근 2경기 평균과 비교** |
| n&lt;2 | 카드 **미노출** |

### 왜 7일이 아닌가 (PM)

축구 운영상 7일 내 경기 0~1회로 표본이 불안정. VOC-012 전술 반영 요구 → v1은 **최근 3경기 흐름**이 명확.

Spike SoT: `VOC_012_ENG_SPIKE.md`

---

## 1. VOC 요약

| 항목 | 값 |
|---|---|
| VOC-ID | VOC-012 |
| Count | **7** (BETA-DAY-001·005·008~012) |
| 출처 비중 | **Coach 중심** (Day-08~12 반복) · Parent 「지난주 대비」는 **별 트랙** |
| 제품 문장 | 「코치가 선수별 **기간 누적 FII**와 **오늘 대비 Δ**로 훈련·선발·전술을 판단」 |

### 원문 테마 (Fact)

| Day | 테마 |
|---|---|
| BETA-DAY-001 | Parent: 지난주와 비교한 성장 그래프 |
| BETA-DAY-005 | Coach: 선수별 기간 데이터 누적 추이 그래프 |
| BETA-DAY-008 | Coach: 7일 평균 → 훈련 강도 |
| BETA-DAY-009~010 | Coach: 활동량·기간 비교 → 전술 |
| BETA-DAY-011 | Coach: 누적 대조 → 선발·훈련 조정 |
| BETA-DAY-012 | Coach: 2주 대조 → 체력 안정·전술 확신 |

---

## 2. 현황 점검 결과 (5문항) — Design 시점

### Q1. Coach Report에 기간 누적 비교 기능이 있는가?

| 결과 | **N** |
|---|---|
| 근거 | `useCoachVisionAnalysis`가 `visionAnalysis` **latest 1건**만 바인딩 · Trend 카드·Ranking Δ 없음 |

### Q2~Q5 요약

| # | 결과 |
|---|---|
| 2 Trend 데이터 위치 | Vision = 매치별 `visionAnalysis` · Growth/telemetry는 다른 도메인 |
| 3 선수별 기간 Δ UI | Vision Coach **없음** |
| 4 SoT 재사용 | ✅ `visionAnalysis` + (Spike) `visionMatchIndex` |
| 5 CF/root 없이 MVP | ✅ **가능** (Spike 확정) |

상세 Spike: `VOC_012_ENG_SPIKE.md`

---

## 3. Gap (Scope 대비)

| LOCK 요구 | Gap |
|---|---|
| 이전 ≤3경기 평균 vs 현재 | multi-match load + rollup 미구현 |
| n≥2 Gate | 미구현 |
| Ranking/카드 카피 | 미구현 |

---

## 4. Design 초안 → LOCK에 흡수

MVP 블록은 Scope LOCK 표·카피로 대체. Parent/Growth Out of MVP 유지.

---

## 5. 금지·동결

| 항목 | 상태 |
|---|---|
| Day-03 DATE_GATE_PENDING | 🛑 미변경 |
| VOC-011 원장 15 | 🔒 유지 |
| PAI-011 COMPLETE/CLOSED | 🔒 유지 |
| VOC-012 구현 코드 | ❌ Spec LOCK 전 금지 |

---

## 6. 한 줄 결론

**Coach Vision에 기간 UI는 없고, LOCK된 MVP는 `visionMatchIndex` + `visionAnalysis.playerFii` 클라이언트 롤업(이전 ≤3 · n≥2)으로 CF/root SoT 없이 가능. Spike COMPLETE · 구현은 Impl Spec 후.**

---

## 7. Next Gate

```text
PM SCOPE LOCK ✅
ENG SPIKE ✅
        ↓
Implementation Spec 1p
        ↓
IMPLEMENT (별도 지시)
```

---

**Updated:** 2026-07-12 · PM SCOPE LOCK + Spike COMPLETE
