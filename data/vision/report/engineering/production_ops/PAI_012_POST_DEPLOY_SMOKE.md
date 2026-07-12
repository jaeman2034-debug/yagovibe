# PAI-012 — Production Post-Deploy Smoke Fact

**Document ID:** `PAI-012-POST-DEPLOY-SMOKE`  
**Status:** ✅ **PASS**  
**PAI-012:** 🔒 **COMPLETE / CLOSED**  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경 (VOC-011 원장 **15** 유지)

---

## Smoke Fact

```text
확인 일시: 2026-07-12 (KST) — PM 화면 직접 확인 (6장)
표면: Production Coach Vision Match Detail / match-flow trend
Hosting URL: https://yago-vibe-spt.web.app
배포 HEAD: 30170a18a7838ffcc33e4b99de3a3014228157db
Feature commit: 61cf9ac
결과: Post-Deploy Smoke PASS
```

### Spot-check (canonical)

```text
/teams/D7TUZaOtfxdBc4P0lQLx/vision/match/vision-pilot-pass01-clip-002
```

---

## Checklist (화면 Fact)

| 항목 | 결과 |
|---|---|
| Production Coach Report 열림 | ✅ Y |
| 「최근 3경기 평균과 비교」카드 | ✅ Y |
| N=3 표시 | ✅ Y |
| Player P0100 현재 FII | ✅ **72** |
| Avg | ✅ **65** |
| Δ | ✅ **+7** |
| Ranking Avg/Δ | ✅ Y |
| 양수·0·음수 Δ 표시 | ✅ Y |
| NaN / undefined | ✅ 미관측 |
| 레이아웃 | ✅ 정상 |

---

## Separated observation (PAI-012 범위 외)

| 항목 | 결과 |
|---|---|
| Job Monitor 빨간 문구 | 관측됨 |
| 원문 | `[VISION_ANALYSIS_FAILED] no GEV events ...` |
| PAI-012 Trend 실패 여부 | **N** (Trend·Avg/Δ 정상) |
| 처리 | **별도 운영 오류 후보** · `PROD-OBS-012` · `PRODUCTION_INCIDENTS.md` |

> ❌ 「관측 오류 없음」으로 기록하지 않음.  
> ✅ PAI-012 Smoke PASS와 **원인 분리**.

---

## PM 판정

```text
PM PASS → Production Deploy → Post-Deploy Smoke PASS
        ↓
PAI-012 COMPLETE / CLOSED
```

| Gate | Status |
|---|---|
| PAI-012 PM PASS | ✅ |
| Production Deploy (`30170a1`) | ✅ |
| Post-Deploy Smoke | ✅ **PASS** |
| PAI-012 | 🔒 **COMPLETE / CLOSED** |
| Day-03 DATE_GATE_PENDING | 🛑 **유지** |
| PROD-OBS-012 (GEV events) | ▶ **OPEN 후보** (분리) |

---

**Recorded:** 2026-07-12 09:28 KST · PM 화면 6장 확인 반영
