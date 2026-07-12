# E2 Engineering Backlog (post-PASS · Beta 계속)

**계층:** Engineering · ❌ Ops SoT  
**상태:** ✅ E2+E3 PASS · ▶ **Beta 운영 ACTIVE**  
**Updated:** 2026-07-12 (VOC-007 P3-01/P3-02 DEFER)  

Beta 중: 신규 기능 즉시 착수 ❌ · VOC ≥3 → backlog 우선만 · Ops SoT 🔒

---

## E2/E3 판정 (LOCK)

| 항목 | 값 |
|---|---|
| **E2 PASS** | ✅ PASS (Reviewer 2026-07-10) |
| **E3 PASS** | ✅ PASS (Reviewer 2026-07-10) |
| Next | ▶ **Beta 운영** — VOC 루프 · 안정성 · 점진 개선 |

---

## P1 — 완료 (독립사용 / 접속)

| ID | 항목 | VOC | 상태 |
|---|---|---|---|
| E2-BL-P1-01 | 로그인 UX 개선 | VOC-003 | ✅ 코드 · I1 · PV-006 현장 |
| E2-BL-P1-02 | 카카오 인앱 진입 안정화 | VOC-003 | ✅ 코드 · I2 · PV-006 현장 |
| E2-BL-P1-03 | 자동 로그인 / 세션 유지 | VOC-003 | ✅ 코드 · I3 · PV-006 현장 |

---

## Beta Product Backlog (E2 PASS 후 계속)

| ID | 항목 | VOC | 우선 |
|---|---|---|---|
| E2-BL-P2-01 | 모바일 버튼 터치 영역 확대 | VOC-008 | 🔒 **PAI-033 PASS / COMPLETE / CLOSED** · Production verified `7f2c0d0` · A-set Vision Coach only · VOC count **1** · `../production_ops/PAI_033_PM_FINAL_SIGNOFF.md` |
| E2-BL-P3-01 | 심박수 등 연령별 기준값 설명 | VOC-007 | ⏸ **DEFERRED / DATA-DEPENDENT** · PM 2026-07-12 · copy-only **NO-GO** · no invent HR norms · no PAI · count **1** · `../VOC_007_DEFER_DISPOSITION.md` |
| E2-BL-P3-02 | 연령대 적정 수치 가이드 | VOC-007 | ⏸ **DEFERRED / DATA-DEPENDENT** · same disposition as P3-01 · prerequisites: HR source · HR surface · approved age-norm dataset · policy review |
| VOC-010 | GPS/웨어러블 원탭 연동 → 자동 리포트 | VOC-010 | 장기 |
| **VOC-011** | **또래(팀·연령) 평균 비교 (Benchmark)** | VOC-011 | **P1** · count=**15 LOCKED** · **PAI-011 COMPLETE/CLOSED** · Production verified `64270a3` · Day-03 Official Fact LOCK · proposed 16 REJECTED · `../production_ops/PAI_011_POST_DEPLOY_SMOKE.md` |
| VOC-012 | 성장·기간 추이 시각화 (Parent·Coach 범위 구분) | VOC-012 | 🔒 **PAI-012 COMPLETE/CLOSED** · Production verified `30170a1` · PROD-OBS-012 분리 · Day-03 gate 분리 · `../production_ops/PAI_012_POST_DEPLOY_SMOKE.md` |
| VOC-013 | 코치 리포트 히스토리 모아보기 | VOC-013 | 관찰 · count=1 |
| VOC-014 | 오늘의 MVP · 베스트11 추천 | VOC-014 | 관찰 · count=1 |
| VOC-015 | 팀 대시보드 (Team Dashboard) | VOC-015 | 관찰 · count=1 |
| VOC-016 | 기간별 PDF 다운로드 | VOC-016 | 관찰 · count=1 |
| VOC-017 | 포지션별 데이터 필터링 | VOC-017 | 관찰 · count=1 |
| **BETA-ISSUE-001** | iPhone + 카카오 인앱 로그인 리다이렉트 | — | **P1 안정화** · Day-01·03~06 · OPEN |
| VOC-004 | 훈련 가이드 / 드릴 영상 추천 | VOC-004 | 장기 (착수 보류) |
| VOC-005 | 하프타임 실시간 요약 | VOC-005 | 장기 (착수 보류) |
| VOC-009 | 코치 승인 후 카카오 알림톡 자동 발송 | VOC-009 | 장기 / E3 연계 |
| VOC-006 | 누적 데이터 라인업/체력 사이클 | VOC-006 | 관찰 |

---

## 실행 순서 (LOCK)

```text
Beta 운영 ACTIVE
    ↓
실 Coach/Parent VOC · 운영 로그
    ↓
VOC count → ≥3 → Backlog 우선
    ↓
점진 Product 개선
    ↓
(Beta 종료 조건 충족 시) Production 준비 검토
```

Ops SoT 🔒 · Official Fact ↔ Synthetic 분리 유지.
