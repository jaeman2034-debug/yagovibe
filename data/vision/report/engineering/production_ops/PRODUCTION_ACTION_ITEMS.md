# Production Action Items

**Document ID:** `PRODUCTION-ACTION-ITEMS-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE  
**Source:** Beta Decision §4.2 · VOC Registry · GO with Open Issue

> Beta Action Items를 Production으로 이관. 상태 변경은 Official Fact 또는 PM 승인 후만.

---

## P1 — Known Issue / Gate

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-001** | `BETA-ISSUE-001` 수정 (iPhone + 카카오 인앱 로그인 재요구) | ⚠️ OPEN · **Code ready · Prod deploy Pending** | Eng | Fix 코드 반영 · Intake `PAI_001_FIX_INTAKE.md` · Release Notes/Verification은 **Production 배포 Fact 후** |
| **PAI-002** | iPhone+카카오 인앱 모니터링 · Escalation 경로 운영 | ▶ ACTIVE | Ops | Run Sheet §6 |
| **PAI-003** | Parent 독립 사용 Gate 재검증 | ▶ PLANNED | Ops · PM | PAI-001 PASS 후 **상태 전환으로 ACTIVE** · 자동 개시/완료 금지 |

---

## P2 — VOC / Product

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-011** | VOC-011 — 또래/포지션 평균 기준선 | ▶ Backlog | Product | Count **14** · P1 Beta Backlog 유지 |
| **PAI-012** | VOC-012 — 기간 데이터 비교 시각화 | ▶ 관찰 | Product | Count **7** · Coach 출처 중심 · 적용 범위 구분 |

VOC SoT: `../YAGO_VOC_Trigger_로그.md` · Backlog: `../e2_step4_pilot_validation/E2_ENGINEERING_BACKLOG.md`

---

## P3 — Ops Hygiene

| ID | Item | Status | Owner | Note |
|---|---|---|---|---|
| **PAI-021** | Production Run Sheet 운영 정착 | ▶ ACTIVE | Ops | 본 체계 SoT |
| **PAI-022** | Weekly Production Review 루틴 시작 | ▶ PLANNED | PM · Ops | `PRODUCTION_WEEKLY_REVIEW.md` |
| **PAI-023** | Production KPI 일/주 누적 시작 | ▶ ACTIVE | Ops | `PRODUCTION_KPI.md` |

---

## Beta → Production 이관 맵

| Beta Action (§4.2) | Production ID | 상태 |
|---|---|---|
| BETA-ISSUE-001 OPEN + P1 Fix 일정 | PAI-001 | OPEN · **Code ready** · Prod deploy Pending · Verification blocked |
| iPhone+카카오 모니터링·Escalation | PAI-002 | ACTIVE |
| Parent 독립 사용 Gate 재검증 일정 | PAI-003 | PLANNED (PASS 후) |
| Production Run Sheet 작성 | PAI-021 | ACTIVE (문서 생성 완료 · 운영 정착 중) |
| Beta 종료 기록 확정 | — | ✅ 완료 (Archive) |

---

**Updated:** 2026-07-21
