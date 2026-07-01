# YAGO Vision RC5-4 — Pre-Pilot Dry Run (30분)

**목적:** Pilot #1 Run Day **당일 설정 오류·권한 문제를 사전에 제거**  
**시점:** 운영 정보(JSON) 입력 직후 · Live Pilot **전날 또는 당일 오전**  
**소요:** 약 30분  
**상세 SoT:** `YAGO_VISION_RC5_4_LIVE_PILOT_RUN_SHEET.md`

> 실 MP4 전체 분석이 아니어도 됨. **짧은 샘플 MP4 (1~3분 · 권장 ≤50MB)** 로 파이프라인·권한·UI만 검증.  
> **10분 이상 영상**은 Whisper(전사) 타임아웃 가능 — Dry Run **NO-GO (일시 중단)** · **짧은 영상으로 재시도**.  
> **Go / No-Go Gate:** 아래 10항목 **전부 통과** 시에만 Live Pilot 진행. 핵심 항목 실패 → **No-Go** · 수정 후 Dry Run 재실행.

### Dry Run MP4 운영 기준 (2026-06-30 확정)

| 구분 | 기준 |
|------|------|
| **권장** | 1~3분 · Dry Run / Vision Queue 검증용 |
| **주의** | 10분+ (예: 45MB) → Whisper deadline-exceeded 가능 |
| **조치** | 업로드는 성공해도 전사 실패 시 → **짧은 MP4로 재시도** (Engine 변경 없음) |
| **RC5-5** | 장영상 Timeout · Memory · Chunk Upload 검토 |

---

## 참석 · 역할

| 역할 | 담당 | ✓ |
|------|------|---|
| PM | | □ |
| CTO | | □ |
| Coach | | □ |
| Parent | | □ |
| Support | | □ |

**Dry Run Date:** _______________ · **teamId:** _______________

---

## Go / No-Go Gate (10항목 — 전부 통과 필요)

| # | ✓ | 항목 | 확인 내용 | 비고 |
|---|---|------|-----------|------|
| 1 | □ | **CONFIGURE_AT_OPS** | 두 `rc5_4_pilot_academy.json` 동기화 · placeholder 없음 | |
| 2 | □ | **Coach 로그인** | Firebase Auth · `teamId` staff 권한 | uid: |
| 3 | □ | **Parent 로그인** | Firebase Auth · `playerId` / guardian | uid: |
| 4 | □ | **샘플 MP4 업로드** | Validation Console · `visionQueueEnqueued` | mediaId: |
| 5 | □ | **Upload Queue** | `visionUploadQueue/{mediaId}` · `queued` → `processing` | |
| 6 | □ | **Job Monitor** | 단계·progress 표시 (upload → … → done 또는 진행 중) | |
| 7 | □ | **Firestore 저장** | `visionRuns` · `visionMatchIndex` · `visionAnalysis`(완료 시) | runId: |
| 8 | □ | **Coach 화면** | Dashboard · Match Detail · Timeline 카드 표시 | |
| 9 | □ | **Parent 화면** | Parent Report · 성장·추천 카드 표시 | |
| 10 | □ | **담당자 역할** | PM / CTO / Coach / Parent / Support 확정 | |

**통과:** _____ / 10

---

## URL 빠른 점검

| 화면 | URL |
|------|-----|
| Upload | `/teams/{teamId}/validation-console?matchId={matchId}` |
| Pilot Beta Hub | `/teams/{teamId}/vision/pilot-beta` |
| Coach | `/teams/{teamId}/play?matchId={matchId}` |
| Parent Report | `/home/parent/vision/report?teamId=…&playerId=…&matchId=…` |

---

## 실패 시 (Dry Run)

| 증상 | 1차 확인 |
|------|----------|
| Mock Whisper (프로덕션 경로) | `Pipeline: Mock Whisper` · `mock-whisper` → **로컬 Emulator + worker MOCK off** (`YAGO_VISION_RC5_4_DRY_RUN_WHISPER_SETUP.md`) |
| **Whisper 타임아웃** | 메시지: `AI 전사(Whisper) 요청이 시간 초과` · **업로드는 완료됨** → 1~3분 MP4로 재시도 · 10분+는 RC5-5 |
| 업로드 실패 | 네트워크 · Storage 권한 · matchId |
| Queue stuck | `processVisionUploadQueue` · CF 배포 |
| Worker 미동작 | Worker 가동 · `m2` · `rc3_1_phase_c` |
| UI empty | Firestore `visionAnalysis` · Coach/Parent uid |
| Parent Report 404 | `playerId` · guardian 링크 |

**조치 기록:** → `YAGO_VISION_RC5_OPS_DAILY_LOG.md` · 필요 시 `IMPROVEMENT_BACKLOG`

---

## Dry Run 결과

| 항목 | 값 |
|------|-----|
| 결과 | ✅ Go / ⚠️ 조건부 Go / ❌ No-Go |
| 발견 이슈 | |
| Run Day 전 조치 | |
| Ops 서명 | |

```text
✅ Go — Pilot #1 Run Day 진행
⚠️ 조건부 Go — 이슈 N건 해결 후 진행
❌ No-Go — Dry Run 재실행 또는 INFRA 점검
```

**다음:** `YAGO_VISION_RC5_4_RUN_DAY_CHECKLIST.md` 인쇄 → Live Pilot 실행

---

## Dry Run 운영 기록 양식 (직접 작성)

> 인쇄·복사하여 Dry Run 회차마다 1장 작성.

| 항목 | 기록 |
|------|------|
| **Run Date** | |
| **Operator** | |
| **Go / No-Go** | Go / No-Go |

### 체크 항목

| ✓ | 항목 |
|---|------|
| □ | JSON |
| □ | Login (Coach · Parent) |
| □ | Upload |
| □ | Queue |
| □ | Firestore |
| □ | Job Monitor |
| □ | Coach UI |
| □ | Parent UI |
| □ | Roles |
| □ | Logs |

| 항목 | 기록 |
|------|------|
| **Result** | PASS / FAIL |
| **Issue** | |
| **Action** | |
| **Remarks** | |

**서명:** Operator _______________ · PM _______________

---

## Dry Run 시도 기록 — Attempt #1 (2026-06-30)

| 항목 | 결과 |
|------|------|
| 판정 | ⚠️ **NO-GO (일시 중단)** — Whisper timeout · 짧은 MP4 재시도 |
| 진행 | **7 / 10** (Whisper·Vision pipeline 미완) |

| # | 항목 | 결과 |
|---|------|------|
| 1 | Coach 로그인 | ✅ |
| 2 | Parent | ✅ |
| 3 | Parent Link | ✅ |
| 4 | Validation Console | ✅ (Critical Bug `formatTeamGameLabel` 수정 후) |
| 5 | MP4 Upload | ✅ |
| 6 | Storage | ✅ |
| 7 | ROI Preview | ✅ |
| 8 | Whisper | ❌ Timeout — `AMD_U18_10min.mp4` 45.1MB |
| 8b | Pipeline | ❌ Mock Whisper (프로덕션 Cloud Run) |
| 9 | Queue → Job Monitor → Done | ⏳ Attempt #2 (1~3분 MP4 + 로컬 Whisper) |
| 10 | Logs | 정상 오류 안내 표시 |

**Action:** `YAGO_VISION_RC5_4_DRY_RUN_WHISPER_SETUP.md` 스택 적용 → 1~3분 MP4 **Attempt #2**
