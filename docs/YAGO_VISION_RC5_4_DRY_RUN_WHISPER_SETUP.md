# RC5-4 Dry Run — Real Whisper 설정 (Mock 해제)

**상황:** Validation Console에 `Pipeline: Mock Whisper` · `mock-whisper` 반환  
**원인:** `VITE_USE_EMULATOR=false` → **프로덕션 Callable** → Cloud Run `YAGO_WORKER_MOCK=1`  
**Charter:** Change Freeze 예외 — **환경 설정만** (Engine/GEV/GT 변경 없음)

---

## 판정

| 경로 | Whisper |
|------|---------|
| 프로덕션 (`VITE_USE_EMULATOR=false`) | ❌ Mock (`mock-whisper`) |
| 로컬 Emulator + 로컬 Worker (MOCK off) | ✅ Real Whisper (Dry Run 권장) |

**Cloud Run SoT:** `functions/.env.yago-vibe-spt` → `YAGO_INGEST_PIPELINE_BASE_URL=https://yago-worker-126699415285.asia-northeast3.run.app`  
**Mock 해제 배포** → RC5-5 (운영 안정화)

---

## Dry Run 권장 스택 (3터미널)

### 1) yago-worker — MOCK 없이 + OpenAI Key

```powershell
cd yago-worker
# YAGO_WORKER_MOCK=1 이 설정되어 있으면 제거
Remove-Item Env:YAGO_WORKER_MOCK -ErrorAction SilentlyContinue
# functions/.env 또는 yago-worker/.env 에 OPENAI_API_KEY 필요
npm start
```

**확인:**

```powershell
curl http://127.0.0.1:8787/health
# "mock": false 필수
```

또는:

```powershell
node scripts/vision/rc5_4_dry_run_whisper_check.mjs
```

### 2) Functions Emulator (로컬 worker로 라우팅)

`functions/.env` (이미 설정됨):

```env
YAGO_INGEST_PIPELINE_BASE_URL=http://127.0.0.1:8787
```

```powershell
npm run emulators:functions
```

### 3) Vite — Emulator 연결

`.env.local`:

```env
VITE_USE_EMULATOR=true
```

```powershell
npm run dev
```

**dev 서버 재시작 필수.**

---

## OPENAI_API_KEY

Worker는 `OPENAI_API_KEY` (VITE_ 접두사 **아님**) 필요.

다음 중 하나에 설정:

- `functions/.env`
- `yago-worker/.env`
- 루트 `.env` (worker가 보조 로드)

---

## Validation Console 확인

| 항목 | Mock | Real |
|------|------|------|
| Pipeline 라벨 | Mock Whisper | 운영 Ingestion / whisper |
| provider | `mock-whisper` | `whisper` |
| First Frame | placeholder | 실제 영상 프레임 |

**Dry Run:** 1~3분 MP4 재업로드

---

## Attempt #1b (Mock 발견)

| 항목 | 결과 |
|------|------|
| Upload / Storage | ✅ |
| Pipeline | ❌ Mock Whisper (프로덕션 경로) |
| 조치 | 본 문서 스택으로 Attempt #2 |

---

## RC5-5 UX — Step 2 CV · ROI (Whisper 완료 후)

Whisper 완료 → Step 2 자동 이동 시 React remount로 **로컬 `File` 객체가 사라집니다.**  
ROI 패널(`CvRoiPickerPanel`)은 canvas 프레임 추출을 위해 **동일 MP4를 다시 선택**해야 표시됩니다.

```text
Whisper completed (privacyStatus: anonymized)
        ↓
Step 2 — 「CV 분석을 계속하려면…」 안내 Card 표시
        ↓
[파일 다시 선택] — 동일 MP4
        ↓
CV 분석 · ROI 패널 표시
        ↓
「CV 분석 시작」
        ↓
cvRun / visionRuns (Vision Job Monitor는 별도 Vision 화면)
```

**DEV Console (파일 미선택):**

```text
[ACADEMY-CV] ROI waiting for local File object
  mediaId: ...
  privacyStatus: anonymized
  reason: local File required
```

**Step 3~5:** GEV Tagging / Coach Review / Parent Report 전용 — ROI 패널 없음. CV ROI는 **Step 1·2** MP4 패널에서만.

---

## RC5-5 (배포 Mock 해제 — Dry Run 이후)

```powershell
# Cloud Run — YAGO_WORKER_MOCK 제거 + OPENAI Secret
# docs/YAGO_SPRINT_10B1B_WORKER.md 참고
bash scripts/deploy-yago-worker-cloud-run.sh --real-whisper --execute
```
