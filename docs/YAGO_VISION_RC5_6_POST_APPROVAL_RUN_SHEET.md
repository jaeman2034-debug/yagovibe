# RC5-6 — Post-Approval Data Flow Run Sheet

**Status:** IN PROGRESS ⏳  
**Pilot team:** `D7TUZaOtfxdBc4P0lQLx`  
**Pilot media:** `9b4c4c8c58dc4169b603af25`  
**Change Freeze:** Engine / Schema / Worker / Functions 로직 변경 금지 — **Data Flow 검증만**

---

## 아키텍처 (코드 SoT)

```text
reviewAcademyCvRun (I5)
  → cvRuns.reviewStatus = approved
  ↓ (자동 아님 — 별도 Callable)
extractApprovedCvSignals (J3)
  → cvGrowthLinks append (signal_extraction · measured)
  ↓
getCvGrowthLinksContext (J5 read)
  → CV Signals Preview UI (CvGrowthInternalSection)
  ↓
reviewCvGrowthLink (J6) — Internal Accept/Reject
  ↓
interpretationCandidates · growthSignals · FII/OVR/Avatar drafts (read-only Internal)
```

**Parent Report / Step 5 GEV 리포트:** I7 LOCK — **approved cvRun 직접 연결 없음** (Parent Exposure = J7+ 별도 Gate).

**Job Monitor:** Validation Console 밖 — `/teams/:teamId/vision/pilot-beta` 또는 Play Vision 섹션.

---

## 검증 체크리스트

| # | 항목 | PASS 조건 | RC5-6 Pilot #1 |
|---|------|-----------|----------------|
| A | approved cvRun | `reviewStatus=approved` · `analysisStatus=completed` | ✅ `1ac305ed36c9…` |
| B | J3 Signal Extraction | `extractApprovedCvSignals` → cvGrowthLinks 1+ | ✅ `linkId=6f09729ed0ab…` · signals 9 |
| C | J5 CV Signals UI | Step 2 I6 패널 · 「CV Signals Preview (J5)」 | ⏳ UI 새로고침 후 확인 |
| D | J6 cvGrowthLinks Review | Accept/Reject UI · reviewStatus | ⏳ |
| E | FII / OVR / Avatar drafts | Internal read-only preview | ⏳ J5 이후 패널 |
| F | Parent Report 연결 | approved cvRun 반영 | ⏳ **설계상 미연결** (I7-6) |
| G | Job Monitor | visionRuns completed | ⏳ Vision 화면 별도 |
| H | Firestore SoT | cvRuns 불변 · playerGrowth* 무변경 | ✅ J3 smoke 확인 |

---

## A. Firestore 확인 (승인 직후)

```text
teams/{teamId}/aiIngest/{mediaId}
  status: completed
  privacyStatus: anonymized
  cvActiveRunId: 1ac305ed36c949e59c3a7d46

teams/.../cvRuns/{runId}
  analysisStatus: completed
  reviewStatus: approved

teams/.../cvGrowthLinks
  (승인 직후) count: 0  ← J3 미호출이 정상
```

---

## B. J3 Signal Extraction 실행

**UI 버튼 없음** — approved 후 **수동 Callable** 필요 (I7 설계).

### 방법 1 — Smoke script (권장)

```powershell
$env:SMOKE_TEAM_ID='D7TUZaOtfxdBc4P0lQLx'
$env:SMOKE_MEDIA_ID='9b4c4c8c58dc4169b603af25'
$env:SMOKE_ACTOR_UID='jMLLIxyOVkN1HERAd2gz88uKj9e2'
node scripts/smoke-cv-i7-signals.mjs
```

**2026-06-29 실행 결과:** ✅ PASS

```text
linkId=6f09729ed0ab49188f00152e
signals=VISIBILITY_RATIO, SESSION_CONFIDENCE, ROI_QUALITY, ...
```

### 방법 2 — UI 확인

1. Validation Console **Step 2** (MP4 패널 · I6 블록)
2. Hard Refresh 후 동일 media hydrate
3. **CV Run · Internal (I6)** → **CV Signals Preview (J5)** 섹션
4. 9 signals + cvGrowthLinks History (1) 표시 확인

---

## C~E. J5 / J6 / Draft 패널

**위치:** `CvRunInternalPanel` → `CvGrowthInternalSection` (Step 2 · Step 5 cyan 블록)

| 패널 | 기대 |
|------|------|
| CV Signals Preview (J5) | Measured signals 카드 |
| cvGrowthLinks History | linkId · append-only |
| Growth Link Review (J6) | Accept / Reject |
| Interpretation / FII / OVR / Avatar | read-only drafts |

---

## F. Parent Report (기대치 정렬)

| 항목 | RC5-6 기대 |
|------|------------|
| Step 5 학부모 리포트 | GEV/Whisper 기반 — **CV Run 미반영** (by design) |
| PDF FII/OVR | CV measured block **미포함** (I7-6 ⏳) |

**Pilot #1 Final GO에서 Parent CV 연결은 RC5-6 범위 밖** — 별도 Gate.

---

## G. Job Monitor

Vision Pilot Beta 또는 Play 탭:

```text
/teams/D7TUZaOtfxdBc4P0lQLx/vision/pilot-beta?matchId=...
```

`visionRuns` · `visionUploadQueue` 상태 `completed` 확인.

---

## Pilot #1 Final GO (RC5-6 완료 후)

| Tier | 필수 |
|------|------|
| **Tier 1 (RC5-5)** | Whisper → ROI → cvRun → APPROVED | ✅ |
| **Tier 2 (RC5-6)** | J3 → J5 Signals · cvGrowthLinks · Firestore | ✅ J3 / ⏳ UI |
| **Tier 3 (Out of scope)** | Parent CV · Job Monitor · FII write | ⏳ 별도 |

**RC5-6 PASS 선언 조건:** B + C + H UI/Firestore 일치.

---

## 알려진 Gap (기능 버그 아님)

1. **`extractApprovedCvSignals` UI 미연결** — approved 후 smoke/Callable 수동 호출 필요
2. **Step 3~5에 ROI 없음** — Step 2 또는 Step 5 I6/J5 패널 사용
3. **I6 smoke mediaId** (`.env.local` `VITE_CV_I6_SMOKE_MEDIA_ID`) — pilot mediaId와 다를 수 있음 → Step 2에서 upload mediaId 기준 확인

---

## 증빙 수집 (PM 제출)

- [ ] Step 2 — CV Signals Preview (J5) 스크린샷
- [ ] cvGrowthLinks History (1) 스크린샷
- [ ] Firestore `cvGrowthLinks/6f09729e…` 캡처
- [ ] (선택) Vision Job Monitor completed
- [ ] Pilot #1 Final GO 재판정
