# YAGO Vision RC5-4 — Run Day 체크리스트 (현장용)

**인쇄용** · Run Sheet 상세: `YAGO_VISION_RC5_4_LIVE_PILOT_RUN_SHEET.md`  
**PASS 기준:** Gate 10/10 + `rc5_4_lock.json` → `liveBetaPass: true`  
**운영 KPI:** Report Open ≥80% · Coach 승인 ≤10분 · Parent ≥4.0 · 재참여 ≥70% · 시스템 ≥95%

---

## 역할 (당일)

| 역할 | 담당자 | 서명 |
|------|--------|------|
| PM | | |
| CTO | | |
| Coach | | |
| Parent | | |
| Support | | |

---

## 사전 (Run 전)

| 필드 | 기록 |
|------|------|
| pilotName | |
| teamId | |
| coachUid | |
| parentUid | |
| playerId | |
| matchId | |
| Run Date | |
| Ops 담당 | |

- [ ] `data/vision/pilot/rc5_4_pilot_academy.json` 실값 입력
- [ ] `src/lib/vision/data/rc5_4_pilot_academy.json` 동기화
- [ ] CF 배포 · Worker 가동 확인
- [ ] `python scripts/vision/rc5_4_pilot_beta_gate.py` PASS
- [ ] Pre-Pilot Dry Run Go (`YAGO_VISION_RC5_4_PRE_PILOT_DRY_RUN.md`)

---

## Run Day — 파이프라인

| ✓ | 항목 | PASS Gate | 기록 |
|---|------|-----------|------|
| □ | Pilot 정보 입력 | (사전) | |
| □ | 실제 MP4 업로드 (Fixture 아님) | #1 liveMp4Upload | mediaId: |
| □ | Queue 생성 (`queued` → `processing`) | #2 queueOk | |
| □ | Job Monitor: tracking | #3 (단계) | |
| □ | Job Monitor: gev | #3 (단계) | |
| □ | Job Monitor: fii | #3 (단계) | |
| □ | Job Monitor: persist → **done** | #3 jobMonitorDone | |
| □ | Firestore 저장 (`visionAnalysis`) | #4 firestoreSaved | analysisId: |

**runId:** _______________ · **처리 시간(ms):** _______________

---

## Run Day — UI · VOC · Ops

| ✓ | 항목 | PASS Gate | 기록 |
|---|------|-----------|------|
| □ | Coach Dashboard / Team FII | #5 coachUi | |
| □ | Parent Report (성장·추천) | #6 parentUi | |
| □ | Timeline (`#vision-timeline`) | #7 timeline | |
| □ | Coach VOC (★1~5 + 코멘트) | #9 coachVoc | ★: |
| □ | Parent VOC (★1~5 + 코멘트) | #10 parentVoc | ★: |
| □ | Ops Log (`visionPilotOpsLog`) | #8 opsLogRecorded | success: |

**Hub:** `/teams/{teamId}/vision/pilot-beta`

---

## Run Day — 마무리 (PASS 선언)

| ✓ | 항목 | 파일 |
|---|------|------|
| □ | Live run 기록 작성 | `data/vision/pilot/rc5_4_live_run_record.json` |
| □ | VOC 요약 반영 | `data/vision/pilot/rc5_4_voc_summary.json` |
| □ | Lock PASS 갱신 | `data/vision/gt/rc5_4_lock.json` |
| □ | Manifest PASS | `data/vision/gt/pilot_gev_gt_manifest.json` → `rc5M4.verdict` |

**Gate 합계:** _____ / 10 · **Ops 서명:** _______________ · **Date:** _______________

> Pilot 종료 후 **Pilot Exit Gate** → RC5-5 착수 판정 (`YAGO_VISION_OPERATIONS_CHARTER_v1.md`)

---

## RC5-5용 운영 지표 · KPI (당일 메모)

| 지표 | 목표 | 실측 |
|------|------|------|
| Report Open Rate | ≥ 80% | |
| Coach 승인 시간 | ≤ 10분 | |
| Parent 만족도 | ≥ 4.0/5.0 | |
| 재참여 의향 | ≥ 70% | |
| 시스템 성공률 | ≥ 95% | |
| 업로드 성공률 | — | / |
| 평균 처리 시간 (Upload → Done) | — | ms |
| 실패 원인 (있으면) | — | 네트워크 / 업로드 / Worker / Persist |

→ Pilot Review Meeting 후 `YAGO_VISION_RC5_4_PILOT_REVIEW.md` · Action Item 표 작성
