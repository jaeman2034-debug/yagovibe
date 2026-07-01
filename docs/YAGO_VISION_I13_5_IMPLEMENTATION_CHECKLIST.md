# YAGO Vision I13-5 — Implementation Checklist

**Status:** 📋 **CHECKLIST ONLY** — 구현 착수 전 Gate  
**Date:** 2026-07-01  
**Branch:** `vision-v2-i13`  
**Design SoT:** `docs/YAGO_VISION_I13_5_PASS_NETWORK_DESIGN.md` (PM Sign-off ✅)  
**Baseline:** `vision-v1.0-final` 🔒

> 이 문서는 **작업 항목 정의만** 포함한다. 구현 코드·Firestore·Callable·Worker 변경은 각 항목 Gate 통과 후 착수.

---

## 사용 방법

| 기호 | 의미 |
|------|------|
| ⬜ | 미착수 |
| 🔄 | 진행 중 |
| ✅ | 완료 |
| 🔒 | PASS · LOCK |

각 Phase 완료 시 담당 · 날짜 · 산출물 경로를 기록한다.

---

## Phase 0 — Prerequisites (구현 전)

| # | 항목 | 상태 | 산출물 / 기준 |
|---|------|:----:|---------------|
| P0-1 | Design doc committed on `vision-v2-i13` | ✅ | `450fdb4` |
| P0-2 | `vision-v1.0-final` 대비 v1.0 코드 무변경 확인 | ⬜ | `git diff vision-v1.0-final -- src functions` clean |
| P0-3 | Pilot fixture 경로 확인 | ⬜ | `pass01_clip_002` gev + registry on D: junction |
| P0-4 | GT fixture 확인 | ✅ | `data/vision/gt/pilot_pass01_clip_002_gev_gt.json` |

---

## 1. Builder

오프라인 진입점 — GEV + Tracking → feature job pipeline orchestration.

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| B-1 | `pass_network_builder.py` CLI 스켈레톤 | ✅ | `scripts/pass_network_builder.py` |
| B-2 | Ingest phase (read-only load) | ✅ | gev + registry parse |
| B-3 | Roster map hook (optional JSON / stub) | ✅ | `--roster` + `fromPlayerId`/`toPlayerId` |
| B-4 | Pipeline orchestration A→E | ✅ | ingest → confirm → network → persist |
| B-5 | `rejected.jsonl` 출력 | ✅ | reason codes (RECEIVER_MISSING, LOW_CONFIDENCE, …) |
| B-6 | Idempotent re-run (same input → same hash) | ✅ | smoke RUN2 `IDEMPOTENT_SKIP` exit 0 |
| B-7 | Pilot clip E2E offline run | ✅ | GT-derived smoke: 5 confirmed, exit 3 partial |

**금지:** `vision_gev_engine.py` · `vision_tracking_engine.py` 수정

---

## 2. Parser

GEV/Tracking 아티팩트 정규화 · dedupe · candidate 추출.

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| P-1 | `load_gev_events` (jsonl) | ✅ | `pass_network_parser.load_jsonl` |
| P-2 | PASS/RECEIVE mirror dedupe | ✅ | `dedupe_pass_candidates` |
| P-3 | `load_tracks_registry` | ✅ | `load_registry` + `track_positions` |
| P-4 | Receiver missing pairing | ✅ | `resolve_receiver` + RECEIVE index |
| P-5 | Multiple candidate resolution | ✅ | `rank_multiple_candidates` |
| P-6 | Low confidence tiering | ✅ | confirm / candidate_only / reject tiers |
| P-7 | Camera cut gap filter | ✅ | `detect_camera_cuts` (metadata; 9 cuts pilot) |
| P-8 | Spatial sanity (`MAX_PASS_DISTANCE_M`) | ✅ | `pitch_distance_m` gate |

---

## 3. Network Generator

Confirmed passes → nodes · edges · time windows · hub.

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| N-1 | Node aggregation (pass/receive/degree) | ✅ | `build_nodes_edges` |
| N-2 | Edge aggregation (count, weight, successRate) | ✅ | weight = count/max_count |
| N-3 | Direction / zone classification | ✅ | `direction.bearingDeg` + `dominantZone` |
| N-4 | Time window buckets (`full`, `h1`, `h2`) | ✅ | `windows/{full,h1,h2}.json` |
| N-5 | Hub score computation | ✅ | `hubScore` + `metrics.hubTrackId` |
| N-6 | `events_canonical.jsonl` 출력 | ✅ | Builder persist (downstream reuse) |
| N-7 | Partial graph + `qc.degraded` flag | ✅ | exit 3 partial + graph artifacts |

---

## 4. Persist

Firestore/GCS 연동 — **P1 Gate 후** (P0는 로컬 JSON only).

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| R-1 | Local `summary.json` schema validation | ✅ | `pass_network_persist.validate()` |
| R-2 | GCS artifact paths (`edges`, `events`) | ⬜ | design §1.3 — Gate 후 |
| R-3 | Firestore `tacticalV2/passNetwork/v1/summary` write (CF) | ⬜ | design §2.2 — **Gate 후** |
| R-4 | Job status doc (`tacticalV2/jobs`) | ⬜ | RC5-3 pattern |
| R-5 | Security rules review (read coach/staff) | ⬜ | design §2.3 |
| R-6 | Idempotent overwrite same `sourceAnalysisId` | ✅ | local `graphHash` + IDEMPOTENT_SKIP |
| R-7 | `verify.json` + atomic promote (`persist()`) | ✅ | `pass_network_persist.py` smoke |

**P0 범위:** R-1, R-2 only (로컬/`D:\YAGO_AI\runs\tacticalV2\`)

---

## 5. Smoke Test

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| S-1 | Builder CLI smoke (`pass01_clip_002`) | ⬜ | design §10.3 S1 |
| S-2 | GT metrics script smoke | ⬜ | design §10.3 S2 |
| S-3 | `npm run build` regression | ⬜ | design §10.3 S3 · v1.0 unaffected |
| S-4 | `rc4_6_e2e_demo.py --validate-only` | ⬜ | design §10.3 S4 |
| S-5 | Rejection reason coverage spot-check | ⬜ | ≥3 reason codes in rejected.jsonl |

---

## 6. Performance Test

| # | 항목 | 상태 | 완료 기준 |
|---|------|:----:|-----------|
| PF-1 | Pilot clip job latency | ⬜ | < 30s (short clip) |
| PF-2 | 90min synthetic scale test | ⬜ | p95 < **120s** (design §6.2) |
| PF-3 | Summary doc size | ⬜ | < 100 KB |
| PF-4 | GCS full artifact size | ⬜ | < 2 MB |
| PF-5 | Memory peak (22 players) | ⬜ | < 512 MB worker process |

---

## 7. Acceptance Gate

Design §8 Gate + PM Product Gate.

### 7.1 Technical Gate

| # | Gate | Target | 상태 |
|---|------|--------|:----:|
| G1 | Pilot replay E2E | `pass01_clip_002` PASS | ⬜ |
| G2 | Edge recall | ≥ **0.80** | ⬜ |
| G3 | Edge precision | ≥ **0.75** | ⬜ |
| G4 | Orphan rate | < **15%** | ⬜ |
| G5 | Persist readable | summary + GCS | ⬜ |
| G6 | Idempotency | identical graph hash | ⬜ |
| G7 | v1.0 regression | build + E2E scripts | ⬜ |
| G8 | Latency p95 | < **120s** (90min) | ⬜ |

### 7.2 Product Gate

| # | Gate | 상태 |
|---|------|:----:|
| P1 | Coach Hub player 식별 가능 | ⬜ |
| P2 | Top 3 edges 영상 정성 일치 (PM) | ⬜ |
| P3 | Parent UI 무변경 | ⬜ |

### 7.3 Lock (PASS 후)

| # | 항목 | 상태 |
|---|------|:----:|
| L-1 | `i13-pass-network-v1` schema LOCK | ⬜ |
| L-2 | Implementation checklist 전 항목 ✅ | ⬜ |
| L-3 | Lock JSON / snapshot (optional) | ⬜ |

---

## 구현 순서 (권장)

```text
P0 Prerequisites
    → 1. Builder + 2. Parser (병렬 가능)
    → 3. Network Generator
    → 5. Smoke Test (로컬)
    → 6. Performance Test
    → 4. Persist (Firestore — 별도 Gate)
    → 7. Acceptance Gate
```

---

## References

- `docs/YAGO_VISION_I13_5_PASS_NETWORK_DESIGN.md`
- `docs/YAGO_VISION_I13_SPRINT_DESIGN.md`
- `data/vision/gt/pilot_pass01_clip_002_gev_gt.json`

---

*I13-5 Implementation Checklist — no code until Builder phase Gate.*
