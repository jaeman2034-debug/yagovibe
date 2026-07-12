# Vision Nav — Duplicate VisionPlatformNav Observation (NON-SCOPE)

**Status:** 📝 OBSERVATION OPEN — **코드 변경 없음** (Player Tab ID Guard CLOSED와 분리)  
**Action Item:** **PAI-032** ▶ OPEN  
**Related:** Player Tab ID Guard Local/Production QA

---

## Fact

Parent Vision Report 화면에서 `VisionPlatformNav`가 **2회** 렌더된다.

| 위치 | 역할 |
|---|---|
| `ParentVisionReportPage` | 페이지 상단 nav |
| `ParentIntelligenceSection` | 섹션 내부 nav |

동일 `data-testid="vision-nav-*"`가 DOM에 중복 → Playwright strict click 시 2 elements.

---

## Decision (PM 2026-07-12)

| 항목 | 판정 |
|---|---|
| Player Tab ID Guard commit | ❌ 포함 금지 |
| 후속 | UI 회귀 / UX 정리 후보 (별도 트랙) |

---

## Separated from

- PAI-013 Tab Routing CLOSED
- Player Tab ID Guard (`P0100` hide)
- PROD-OBS-012 / PAI-031
- Day-03 DATE_GATE_PENDING
