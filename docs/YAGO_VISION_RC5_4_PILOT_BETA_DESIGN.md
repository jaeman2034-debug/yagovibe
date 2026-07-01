# YAGO Vision RC5-4 — Pilot Beta (Design)

**Date:** 2026-06-30  
**Status:** 🚀 **IN PROGRESS** — 인프라 완료 · 라이브 베타 검증 대기  
**Parent:** RC5-3 CLOSED

---

## 목표

실제 아카데미에서 **실 MP4** 업로드 → Queue → Worker → Firestore → Coach/Parent/Timeline 전 구간 검증 + **운영 로그** + **VOC** 수집.

**수정 금지:** GEV/FII Engine · GT · Baseline · Report · `rc3_1_phase_c`

---

## Pilot Academy 설정

`data/vision/pilot/rc5_4_pilot_academy.json`

- ops run sheet에서 `team.teamId`, `roles.coach/parent.uid` 기입
- 기본 `pilotMatchId`: `vision-pilot-pass01-clip-002`

---

## 운영 로그

**Path:** `teams/{teamId}/visionPilotOpsLog/{runId}`

**기록 시점:** `executeAcademyVisionAnalysis` 완료/실패/idempotent (CF)

| Field | 설명 |
|-------|------|
| `pipelineElapsedMs` | 총 처리 시간 |
| `success` | 성공 여부 |
| `errorCode` / `errorMessage` | 실패 원인 |
| `startedFrom` | auto / manual / retry |
| `recordedAt` | 분석 완료 시각 |

---

## VOC

**Path:** `teams/{teamId}/visionPilotVoc/{vocId}`

**Callable:** `submitVisionPilotFeedback`

**UI:** `VisionPilotVocForm` (Coach · Parent)

---

## Pilot Beta Hub

**Route:** `/teams/:teamId/vision/pilot-beta`

- Job Monitor
- Ops log table + 성공률 집계
- VOC 입력 · 요약
- Validation Console 업로드 링크

---

## 라이브 PASS Gate (ops run)

| Gate | 인프라 | 라이브 |
|------|:------:|:------:|
| 실제 MP4 | ✅ | ⏳ ops |
| Queue → Worker | ✅ | ⏳ ops |
| Firestore | ✅ | ⏳ ops |
| Coach/Parent/Timeline | ✅ | ⏳ ops |
| Ops log | ✅ | ⏳ ops |
| VOC | ✅ | ⏳ ops |

---

## Ops Run Sheet

1. `rc5_4_pilot_academy.json`에 teamId/uid 설정
2. `/teams/{teamId}/vision/pilot-beta` 접속
3. Validation Console에서 **실 MP4** 업로드 (matchId 연결)
4. Job Monitor 진행 확인
5. Coach / Parent / Timeline UI 확인
6. VOC 제출
7. `data/vision/pilot/rc5_4_ops_export.json` 스냅샷 (수동 또는 Firestore export)

---

## RC5-5 연결

Pilot Beta 라이브 PASS → RC5-5 Production Operations → RC5 Closure
