# VOC-011 — 또래 평균 비교 · PM Scope LOCK + Design

**Document ID:** `VOC-011-DESIGN-REVIEW`  
**Status:** 🔒 **PM SCOPE LOCK** (2026-07-11) → Eng Spike ✅ COMPLETE  
**Priority:** P1 Product  
**VOC count (원장):** **15** (Day-03 proposed 16 · Date Gate Pending · 원장 미반영)  
**Day-03 Gate:** 🛑 Official Fact 승격 금지 유지

---

## PM 1차 범위 LOCK

| 항목 | LOCK 값 |
|---|---|
| 1차 코호트 | **team + ageGroup** |
| position | 2차 확장 |
| 최소 표본 | **n ≥ 5** |
| n < 5 | 평균선 **미노출** |
| 1차 표면 | **Vision Parent Report** (`/home/parent/vision/report`) |
| Growth Report | 2차 연동 검토 |

**제품 문장:** 「같은 팀·같은 연령 그룹 평균과 우리 아이 비교」

**카피 제약:** 리그/전국 평균 단정 금지 · Official Fact는 「팀·연령(ageGroup) 평균」만.

---

## 상태 전이

```text
BACKLOG → DESIGN REVIEW → PM SCOPE LOCK → ENG SPIKE ✅ → (다음) 구현 스펙 LOCK → IMPLEMENT
```

Spike SoT: `VOC_011_ENG_SPIKE.md`

---

## 요구 요약

학부모 리포트에서 내 아이 수치 + **또래(팀·연령) 평균 기준선**.

---

## 코드 현황 (요약)

| 영역 | VOC-011? |
|---|---|
| Parent 본인 이력 대비 (Growth) | ❌ |
| Academy/Federation Ops Benchmark | ❌ |
| `teams.ageGroup` | ✅ 코호트 라벨 키 |
| `playerFii[]` (match 분석) | ✅ 집계 소스 |
| Parent peer 평균선 UI | ❌ Gap → 구현 대상 |

---

## Spike 결론 (한 줄)

**기존 Parent Report 로드 경로의 `playerFii` + `teams.ageGroup`만으로 1차 MVP 가능. 신규 root SoT 불필요.**

---

## 열린 구현 전 확정 (스펙 1p)

1. `teams.ageGroup` 없을 때: 숨김 vs 「팀 평균」폴백  
2. 자녀 FII를 `playerId`/`trackId`로 매칭하는 규칙 (기존 `findPlayerFiiEntry` 재사용 권장)  
3. UI 카피 최종 문구

---

**Updated:** 2026-07-11 · PM LOCK + Spike COMPLETE
