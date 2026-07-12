# Production Action Items

**Document ID:** `PRODUCTION-ACTION-ITEMS-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE  
**Source:** Beta Decision §4.2 · VOC Registry · GO with Open Issue → PAI-001 PASS

> 상태 변경은 Official Fact 또는 PM 승인 후만.

---

## P1 — Known Issue / Gate

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-001** | `BETA-ISSUE-001` 수정 (iPhone + 카카오 인앱 로그인 재요구) | ✅ **CLOSED** | Eng | Verification **PASS** · Issue **CLOSED (Verified)** · `4d508ac` · 범위 일반화 금지 |
| **PAI-002** | iPhone+카카오 인앱 모니터링 · Escalation 경로 운영 | ▶ ACTIVE | Ops | Run Sheet §6 · 모니터링 유지 |
| **PAI-003** | Parent 독립 사용 Gate 재검증 | ✅ **CLOSED** | Ops · PM | **PASS** · 독립 사용 Y · Quote verbatim 적재 · 일반화 금지 |

---

## P2 — VOC / Product

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-011** | VOC-011 — 또래(팀·연령) 평균 기준선 | 🔒 **COMPLETE / CLOSED** | PM · Eng | Post-Deploy Smoke **PASS** · HEAD `64270a3` · feature `07fb689` · `PAI_011_POST_DEPLOY_SMOKE.md` · Day-03 DATE_GATE_PENDING 유지 |
| **PAI-012** | VOC-012 — 기간 데이터 비교 시각화 | 🔒 **COMPLETE / CLOSED** | PM · Eng | Post-Deploy Smoke **PASS** · HEAD `30170a1` · feature `61cf9ac` · `PAI_012_POST_DEPLOY_SMOKE.md` · **PROD-OBS-012** 분리 OPEN · Day-03 DATE_GATE_PENDING 유지 |
| **PAI-013** | Vision Match Detail 탭 라우팅 회귀 | 🔒 **COMPLETE / CLOSED** | PM · Eng | Production 4-tab Smoke **PASS** · feature `918208c` · HEAD `a86d097` · `VISION_TAB_ROUTING_POST_DEPLOY_SMOKE.md` · Team Hub Observation 유지 |
| **PAI-014** | Player Tab ID Guard (trackId ≠ Growth Profile) | 🔒 **COMPLETE / CLOSED** | PM · Eng | Production Case A/B Smoke **PASS** · feature `a3a0b25` · HEAD `0520cf4` · `VISION_PLAYER_TAB_ID_GUARD_POST_DEPLOY_SMOKE.md` · Duplicate Nav Observation OPEN |

VOC SoT: `../YAGO_VOC_Trigger_로그.md` · Backlog: `../e2_step4_pilot_validation/E2_ENGINEERING_BACKLOG.md`

---

## P3 — Ops Hygiene

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-021** | Production Run Sheet 운영 정착 | ▶ ACTIVE | Ops | 본 체계 SoT |
| **PAI-022** | Weekly Production Review 루틴 시작 | ▶ PLANNED | PM · Ops | `PRODUCTION_WEEKLY_REVIEW.md` |
| **PAI-031** | `PROD-OBS-012` — Job Monitor `VISION_ANALYSIS_FAILED` / no GEV events | ▶ OPEN (후보) | Ops · Eng | PAI-012 Smoke와 **분리** · S3 · Match Detail 빨간 문구 · Trend UX 비차단 · `PRODUCTION_INCIDENTS.md` |
| **PAI-032** | Duplicate `VisionPlatformNav` on Parent Report | ▶ OPEN (Observation) | Eng | `VISION_NAV_DUPLICATE_OBSERVATION.md` · Player ID Guard와 **분리** · 이번 트랙 수정 금지 |

---

## Beta → Production 이관 맵

| Beta Action (§4.2) | Production ID | 상태 |
|---|---|---|
| BETA-ISSUE-001 OPEN + P1 Fix 일정 | PAI-001 | ✅ CLOSED (Verified) |
| iPhone+카카오 모니터링·Escalation | PAI-002 | ACTIVE |
| Parent 독립 사용 Gate 재검증 일정 | PAI-003 | ✅ CLOSED (PASS) |
| Production Run Sheet 작성 | PAI-021 | ACTIVE |
| Beta 종료 기록 확정 | — | ✅ 완료 (Archive) |

---

**Updated:** 2026-07-12 · PAI-014 Player Tab ID Guard COMPLETE/CLOSED · Duplicate Nav Observation OPEN
