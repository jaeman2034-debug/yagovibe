# YAGO Vision — Operations KPI Dashboard

**SoT:** RC5 누적 운영 KPI (Pilot #1 baseline → RC5-5 현황판)  
**갱신:** Live Pilot PASS 후 최초 baseline · 이후 월간/분기  
**관련:** `YAGO_VISION_RC5_4_PILOT_REVIEW.md` · `YAGO_VISION_RC5_OPS_DAILY_LOG.md`

> **기술 PASS Gate** (`rc5_4_lock` 10/10)와 **별도**. 운영 성과 추적용.

---

## Pilot 이력 (운영 버전 관리)

RC5부터 Pilot 단위로 **상태 · 기간 · 결과**를 누적 관리합니다. Live Run PASS 시 해당 행을 갱신합니다.

| Pilot | 상태 | 기간 | teamId / pilotName | 결과 | Lock / Record |
|-------|------|------|-------------------|------|---------------|
| **Pilot #1** | 예정 → 진행 → 완료 | 2026-07 | `CONFIGURE_AT_OPS` | Baseline 확보 (목표) | `rc5_4_live_run_record.json` |
| **Pilot #2** | 예정 | — | | 개선사항 검증 | |
| **Pilot #3** | 예정 | — | | 운영 안정성 검증 | |

**상태 값:** `예정` · `진행` · `완료` · `보류` · `중단`  
**Pilot #1 완료 시:** `rc5_4_lock` PASS · KPI baseline · `YAGO_VISION_RC5_4_PILOT_REVIEW.md` · `YAGO_VISION_RC5_PILOT1_EXECUTIVE_SUMMARY.md` 연동

---

## Pilot #1 Baseline — 운영 KPI (Live Run 후 기입)

| 운영 KPI | 목표값 | 실측값 | 달성 여부 |
|----------|--------|--------|:---------:|
| Report Open Rate | ≥ 80% | | |
| Coach Approval Time | ≤ 10분 | | |
| Parent Satisfaction | ≥ 4.0/5.0 | | |
| Retry Count | (기록) | | |
| Processing Time (Upload→Done) | ms | | |
| System Success Rate | ≥ 95% | | |
| 재참여 의향 | ≥ 70% | | |

**기록일:** · **출처:** `rc5_4_live_run_record.json` · `rc5_4_voc_summary.json` · Daily Log

---

## Pilot #1 Baseline (요약 — 이전 호환)

| KPI | 목표 | Pilot #1 실측 | 달성 |
|-----|------|---------------|:----:|
| Report Open Rate | ≥ 80% | | |
| Coach 승인 평균 | ≤ 10분 | | |
| Parent 만족도 | ≥ 4.0/5.0 | | |
| 재참여 의향 | ≥ 70% | | |
| 시스템 성공률 | ≥ 95% | | |

**기록일:** · **출처:** `rc5_4_live_run_record.json` · `rc5_4_voc_summary.json`

---

## 누적 운영 지표 (RC5-5~)

| 지표 | Pilot #1 | Pilot #2 | Pilot #3 | 누적 | RC5-5 목표 |
|------|----------|----------|----------|------|------------|
| 총 경기 수 | | | | | |
| 분석 시도 | | | | | |
| 분석 성공 | | | | | |
| **성공률** | | | | | ≥ 95% |
| **평균 처리 시간** (Upload→Done, ms) | | | | | |
| Coach 만족도 (평균) | | | | | |
| Parent 만족도 (평균) | | | | | ≥ 4.0 |
| 재시도 총 횟수 | | | | | |
| 재시도 성공률 | | | | | |

---

## 오류 유형 (누적)

| 유형 | 건수 | 비율 | 최근 발생 | 비고 |
|------|------|------|-----------|------|
| 네트워크 | | | | |
| 업로드 | | | | |
| Worker | | | | |
| Firestore Persist | | | | |
| UI / 기타 | | | | |

---

## 월간 스냅샷

| 월 | 경기 수 | 성공률 | 평균(ms) | Coach ★ | Parent ★ | TOP 이슈 |
|----|---------|--------|----------|---------|----------|----------|
| | | | | | | |

---

## RC5-5 운영 판단 (분기)

| 질문 | 판단 | 근거 |
|------|------|------|
| 베타 확대 가능? | | |
| SLA 목표 조정 필요? | | |
| 자동화 우선순위? | | |

**다음 갱신일:**
