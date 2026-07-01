# YAGO Vision — Improvement Backlog

**SoT:** 운영 중 도출된 개선 요청 (기능 개발과 분리 관리)  
**입력:** Pilot VOC · Daily Log · Pilot Review Action Item  
**관련:** `YAGO_VISION_RC5_4_PILOT_REVIEW.md` §7 Action Item

> Pilot/운영 피드백이 **즉시 개발 착수로 이어지지 않도록** 우선순위·반영 시점을 명시.

---

## 상태 정의

| 상태 | 의미 |
|------|------|
| `open` | 검토 대기 |
| `planned` | 반영 예정 (마일스톤 지정) |
| `deferred` | 보류 |
| `done` | 반영 완료 |
| `wontfix` | 반영 안 함 (사유 기록) |

---

## 개선 백로그

| ID | 우선순위 | 요청 | 출처 | 상태 | 반영 예정 | Owner | 비고 |
|----|----------|------|------|------|-----------|-------|------|
| IMP-001 | Medium | 10분+ MP4 Whisper timeout — Cloud Run timeout/memory/chunk | Dry Run #1 | planned | RC5-5 | Ops | AMD_U18_10min.mp4 45.1MB |
| IMP-002 | High | Cloud Run `YAGO_WORKER_MOCK=1` — prod Callable returns mock-whisper | Dry Run #1b | planned | RC5-5 | CTO | Deploy `--real-whisper` |
| IMP-002 | Medium | | | open | RC5-5 | | |
| IMP-003 | Low | | | open | 추후 | | |

---

## Pilot Review Action Item 연동

Pilot Review §7에서 이관. `RC5-5 Reflection` → `반영 예정` 컬럼과 동기화.

| Issue | Root Cause | Action | Owner | Due Date | Backlog ID | 반영 예정 |
|-------|------------|--------|-------|----------|------------|-----------|
| | | | | | IMP- | |

---

## 우선순위 가이드

| 우선순위 | 기준 예시 |
|----------|-----------|
| **High** | 분석 실패·승인 지연·데이터 손실 등 운영 차단 |
| **Medium** | UX·가이드·알림 등 만족도 개선 |
| **Low** | 미관·부가 기능 |

---

## 마일스톤 반영 계획

| 마일스톤 | 예정 IMP ID | 요약 |
|----------|-------------|------|
| RC5-5 | IMP-001, … | |
| Pilot #2 | | |
| Federation Pilot | | |
| Commercial Beta | | |

**마지막 갱신:**
