# E1 Step 4-8 — Gate Decision & Criteria Revision

**Date:** 2026-07-09  
**Status:** Gate criteria revised · phase_d E1 candidate approved · **E1 PASS not declared**

---

## 판정 요약

| 항목 | 결정 |
|---|---|
| 알고리즘 개선 | ✅ 확인 (phase_d, time_only + spatial) |
| Legacy default F1 formal pass | ❌ 불가 (evaluator ID drift) |
| phase_d E1 candidate | ✅ **승인** |
| Production `rc3_1_phase_c` | 🔒 **유지** (즉시 변경 없음) |
| E1 PASS | ⏳ **Step 5 Pilot 후 최종 선언** |
| Step 5 Pilot Validation | ▶ **준비(PREP) 전환** |

---

## 근거 (실측)

### clip002 E1 re-track + phase_d

| 지표 | Lock | E1 re-track phase_d |
|---|---:|---:|
| time_only microF1 | 0.7714 | **0.7887** (+0.0173) |
| default microF1 | 0.7714 | 0.6761 |
| Spatial endpoint coverage | 75.0% | **75.0%** (동일) |
| String endpoint coverage | 66.7% | 8.3% (ID drift) |

### Pooled 3-clip phase_d

| 지표 | phase_c | phase_d | Δ |
|---|---:|---:|---:|
| pooled default microF1 | 0.7667 | 0.7686 | +0.0019 |

→ Regression 없음 · clip002 개선 · clip004 소폭 하락(−0.0076) 있으나 pooled net positive.

---

## Gate 기준 보정 (LOCKED for E1 completion judgment)

### Legacy formal metrics (보조 유지)

- **Default microF1** — timestamp + type + endpoint track string match  
- **String endpoint coverage** — GT `P####` registry span · **run-dependent** · **≠ Production endpoint success rate** · **not directly comparable across re-track runs** unless ID lineage preserved  

역할: regression guard · historical lock 비교 · **단독 E1 pass 기준 아님** (re-track ID drift 시) · **supporting diagnostic only** (PM 2026-07-12)

### Diagnostic pass metrics (E1 완료 판단 병행)

- **Time-only microF1** — endpoint match OFF · threshold: primary clip ≥ lock · **regression guard**  
- **Spatial endpoint coverage** — lock-ref bbox overlap · threshold: re-track ≥ lock spatial · **PRIMARY cross-run endpoint diagnostic**

SoT alignment: `../GEV_ENDPOINT_METRIC_EVAL_DEBT_ALIGNMENT.md`

### Regression guard

- Pooled default microF1: phase_d ≥ phase_c re-run (no regression)

---

## Diagnostic pass checklist (Step 4-8)

- [x] time_only F1 ≥ lock (0.7887 > 0.7714)
- [x] spatial coverage = lock (75% = 75%)
- [x] pooled phase_d no regression (+0.0019)
- [x] phase_d candidate approved
- [ ] **E1 PASS** — Step 5 Pilot stability pending
- [ ] Production promotion `rc3_1_phase_d` — Step 5 + sign-off pending

---

## 다음 단계

1. **Step 5 Pilot Validation** — 실제 Pilot 클립에서 phase_d candidate 파이프라인 안정성 확인  
2. Step 5 PASS 후 **E1 PASS 최종 선언**  
3. Production preset 변경은 별도 promotion review

---

## 금지 사항

- Step 5 전 E1 PASS 선언  
- `rc3_1_phase_c` 즉시 production 교체  
- re-track 경로에서 string coverage 단독 pass 기준 사용

---

**Artifacts:** `e1_gate_decision.json` · Steps 4-5~4-7 engineering reports
