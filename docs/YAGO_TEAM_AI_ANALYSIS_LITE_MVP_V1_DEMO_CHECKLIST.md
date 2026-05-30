# AI Analysis Lite — MVP v1 데모 · QA 체크리스트

> **Version:** `TEAM_AI_ANALYSIS_LITE_MVP_VERSION = "v1"`  
> **Status:** FROZEN — Phase 2 착수 전 브라우저에서 본 문서를 끝까지 수행  
> **Spec:** `docs/YAGO_TEAM_AI_ANALYSIS_LITE.md`  
> **Page:** `src/pages/team/TeamAiAnalysisLitePage.tsx`

---

## 최종 판정 (고정)

| 항목 | 상태 |
|------|------|
| 개발 | COMPLETE ✅ |
| Freeze | FROZEN ✅ |
| Demo | READY ✅ (G1 통과 후 **Demo DONE**) |
| QA | READY ✅ (G2 통과 후 **QA DONE**) |
| Deploy | READY ✅ (G3 통과 후 **Deploy DONE**) |
| Phase 2 | **LOCKED 🔒** (G1–G4 전까지 Sprint 8B·9·10·11 금지) |

**권장 순서:** MVP v1 COMPLETE → **G1 데모** → **G2 QA** → **G3 배포** → **G4 제품 승인** → Phase 2

### 지금 해야 할 일 (코드 추가 ❌)

```text
1. 브라우저 데모 실행          → G1
2. QA 체크리스트 수행          → G2
3. npm run p0:guard            → G2 §8.4
4. 배포 URL 동일 검증          → G3
5. 제품 승인                   → G4
```

**금지 (G1–G4 미완):** 기능 추가 · YouTube API · Whisper · GPT · Firestore

---

## 사전 조건

- [ ] `npm run dev` 로컬 또는 스테이징/프로덕션 URL 접속
- [ ] 로그인된 **팀 active member** 계정
- [ ] 테스트용 `teamId` 확보 (**생활체육 팀** — Academy 팀은 Lite 탭 없음)

**Canonical URL (QA는 여기서만)**

```text
/team/:teamId?tab=ai-analysis
/team/:teamId/ai-analysis
```

### ⚠️ 잘못된 화면 (G1/G2 불가)

| 화면 | URL 예 | 보이는 것 | Lite QA |
|------|--------|-----------|---------|
| **공개 팀 허브** | `/teams/:teamId` | 플레이 라운지 · 팀 운영 모드 · AI(콘텐츠/멤버/미디어) | ❌ |
| **내부 팀 홈** | `/team/:teamId` | 홈·멤버·채팅·일정·**AI 분석 (BETA)** | ✅ |

`팀 운영 모드` → **AI** 탭 = 운영자 AI 카피·(아카데미) Validation Console — **AI 분석 Lite 아님**.

**가장 빠른 진입:** 주소창에 직접 입력

```text
http://localhost:5173/team/{teamId}/ai-analysis
```

예: `http://localhost:5173/team/VojZWvNb0n1kzOBDlr5n/ai-analysis`

**정상 QA 시작 화면:** `⚽ AI 분석 Lite (BETA)` + YouTube URL + 선수 이름 + [분석 시작]

### ⚠️ `/ai-analysis` 했는데 플레이 라운지가 보일 때

주소창이 아래처럼 바뀌었는지 확인:

```text
/team/{teamId}/public    ← TeamGuard: 비멤버(needTeam) 시 자동 이동
/teams/{teamId}/play     ← 공개 허브·플레이 라운지
```

**원인:** 로그인은 했지만 해당 팀 **active member가 아님** → Lite URL 접근 시 `/public`으로 리다이렉트 → G1 불가.

**해결:** 해당 팀에 가입·승인 후 재시도, 또는 **멤버인 다른 teamId**로 QA.

**멤버 확인 후 팀 홈:** `http://localhost:5173/team/{teamId}` → 세그먼트 **AI 분석 (BETA)** (생활체육 팀만).

### QA용 YouTube URL

`https://www.youtube.com/watch?v=test` — **도메인 검증만** 통과하면 됨. 유튜브에서 「재생 불가」는 정상(가짜 video id).

### 라우트 등록 (코드 확인됨 ✅)

```text
/team/:teamId/ai-analysis  → TeamAiAnalysisLiteRoute → TeamAiAnalysisLitePage
/teams/:teamId/ai-analysis → /team/.../ai-analysis 리다이렉트
```

### teamId 사전 점검 (CLI)

프로젝트 `yago-vibe-spt` · ADC 로그인 후:

```bash
gcloud auth application-default login
npx tsx scripts/check-team-id-lite-qa.ts VojZWvNb0n1kzOBDlr5n
npx tsx scripts/check-team-id-lite-qa.ts <실제팀ID> <본인 Firebase Auth uid>
```

| CLI 결과 | 의미 |
|----------|------|
| `문서 없음` | 예전/잘못된 teamId → **마이 > 내 팀**에서 ID 재확인 |
| `isDeleted=true` | 삭제 팀 |
| `academy` | Lite 탭 없음 (URL 직접 접근은 멤버 시 가능) |
| `members 없음` / `status != active` | `/public` 리다이렉트 원인 |

**「팀을 찾을 수 없어요」** = `TeamPage`에서 `fetchTeamByIdOrSlug` → `null` (문서 없음 또는 Rules로 읽기 실패).

### `/ai-analysis` → `/public` 자동 이동 (수정됨)

**원인:** `TeamGuard` + `guardTeamAccess`가 `members.status !== "active"` 만 허용했으나, 마이·플레이는 `status` 미설정도 active로 처리.

**수정:** `guardTeamAccess`가 `isActiveTeamMemberStatus()` 와 동일 규칙 사용 (`src/utils/guardTeamAccess.ts`).

재검: `/team/{teamId}/ai-analysis` 가 `/public` 으로 바뀌지 않고 **⚽ AI 분석 Lite** 표시되는지 확인.

---

## 1. 진입

| # | 확인 | Pass |
|---|------|------|
| 1.1 | 팀 홈 하단/탭에 **「AI 분석 (BETA)」** 표시 | ☐ |
| 1.2 | 탭 클릭 시 Lite 페이지 로드 (에러·빈 화면 없음) | ☐ |
| 1.3 | 직접 URL `/team/{teamId}/ai-analysis` 접근 정상 | ☐ |
| 1.4 | 상단 **⚽ AI 분석 Lite (BETA)** 헤더·설명 문구 표시 | ☐ |

---

## 2. URL 검증

### 2.1 유효 URL

**입력:** `https://www.youtube.com/watch?v=test`

| # | 확인 | Pass |
|---|------|------|
| 2.1.1 | **✓ YouTube URL 확인됨** (초록 힌트) | ☐ |
| 2.1.2 | **⚽ 영상 정보** 카드 표시 (썸네일·제목·채널) | ☐ |

### 2.2 무효 URL

**입력:** `https://naver.com`

| # | 확인 | Pass |
|---|------|------|
| 2.2.1 | **❌ 올바른 YouTube URL을 입력해주세요.** 표시 | ☐ |
| 2.2.2 | **분석 시작** 버튼 비활성 | ☐ |
| 2.2.3 | 영상 정보 카드 미표시 | ☐ |

### 2.3 기타 (선택)

| # | 입력 | 기대 | Pass |
|---|------|------|------|
| 2.3.1 | `https://youtu.be/abc123` | ✓ 확인됨 | ☐ |
| 2.3.2 | `https://m.youtube.com/watch?v=test` | ✓ 확인됨 | ☐ |
| 2.3.3 | 빈 URL | 버튼 비활성, 에러 없음 | ☐ |

---

## 3. 영상 정보 카드 (Sprint 8A — 하드코딩)

URL 검증 통과 후:

| # | 확인 | Pass |
|---|------|------|
| 3.1 | **⚽ 영상 정보** 제목 | ☐ |
| 3.2 | 썸네일 placeholder + 재생 아이콘 | ☐ |
| 3.3 | 제목: `2026 경기 하이라이트` (더미) | ☐ |
| 3.4 | 채널: `YAGO SPORTS` (더미) | ☐ |

---

## 4. 분석 진행

**입력**

- YouTube URL: 유효 URL 1건
- 선수명: `김민준`

| # | 확인 | Pass |
|---|------|------|
| 4.1 | **분석 시작** 클릭 가능 | ☐ |
| 4.2 | 버튼 문구 **분석 중...** 로 변경 | ☐ |
| 4.3 | URL·선수명 입력 **disabled** | ☐ |
| 4.4 | 로딩 카드: **⚽ 영상 분석 중...** | ☐ |
| 4.5 | 단계: ✓ 영상 확인 / ⏳ 선수 움직임 추출… / ⏳ 활동량 계산… / ⏳ AI 리포트 생성 중… | ☐ |
| 4.6 | 약 **1.5초** 후 로딩 종료 | ☐ |

---

## 5. AI 리포트

| # | 확인 | Pass |
|---|------|------|
| 5.1 | **🏅 AI MVP** + 선수명 `김민준` (또는 입력값) | ☐ |
| 5.2 | **AI 선수 프로파일** 레이더 차트 렌더 | ☐ |
| 5.3 | 5축: 공격·수비·활동량·팀플레이·참여도 + **등급 배지** (색상 구분) | ☐ |
| 5.4 | **AI 코멘트** 블록 1문장 | ☐ |
| 5.5 | **🎯 성장 제안** 1~2개 | ☐ |
| 5.6 | **종합** 등급 배지 | ☐ |

---

## 6. 랜덤성 (더미 엔진)

**동일 URL + 동일 선수**로 **분석 시작** 2회 이상:

| # | 확인 | Pass |
|---|------|------|
| 6.1 | 5축 등급 중 **일부 이상 변경** | ☐ |
| 6.2 | **AI 코멘트** 변경 가능 | ☐ |
| 6.3 | **성장 제안** 변경 가능 | ☐ |
| 6.4 | 레이더 형태가 등급에 따라 달라짐 | ☐ |

---

## 7. 최근 분석 기록 (localStorage)

| # | 확인 | Pass |
|---|------|------|
| 7.1 | 분석 완료 직후 **최근 분석 기록**에 1건 추가 (날짜·선수·종합) | ☐ |
| 7.2 | **새로고침** 후에도 기록 유지 | ☐ |
| 7.3 | 기록 없을 때: **아직 분석 기록이 없습니다.** | ☐ |
| 7.4 | **6회 이상** 분석 후 **최대 5건**만 유지 (오래된 항목 제거) | ☐ |
| 7.5 | 종합 등급 **배지** 표시 (풀 내 등급) | ☐ |

**Storage key:** `yago-ai-analysis-history` (브라우저 DevTools → Application → Local Storage)

---

## 8. G2 — QA (회귀 · 반응형 · 엣지)

### 8A 회귀 · 금지

| # | 확인 | Pass |
|---|------|------|
| 8.1 | Academy `AIGrowthValidationConsole` UI **미노출** (일반 팀) | ☐ |
| 8.2 | 분석 중 **네트워크 호출 없음** (Whisper/GPT/Functions 미연동) | ☐ |
| 8.3 | 팀 홈 다른 탭(채팅·일정·라인업) **회귀 없음** | ☐ |
| 8.4 | `npm run p0:guard` PASS (배포 PR 전) | ☐ |

### 8B 세션 · 재진입

| # | 확인 | Pass |
|---|------|------|
| 8.5 | **새로고침** 후 탭/URL 재진입 — 크래시·빈 화면 없음 | ☐ |
| 8.6 | 팀 홈 다른 탭 이동 → **AI 분석** 재진입 — 정상 | ☐ |
| 8.7 | `/team/:teamId/ai-analysis` 직접 재접속 — 정상 | ☐ |

### 8C 반응형

| # | 뷰포트 | 확인 | Pass |
|---|--------|------|------|
| 8.8 | 모바일 (~390px) | 입력·버튼·레이더·기록 스크롤 가능, 잘림 없음 | ☐ |
| 8.9 | 태블릿 (~768px) | 동일 | ☐ |
| 8.10 | 데스크톱 | 동일 | ☐ |

### 8D 엣지 입력

| # | 확인 | Pass |
|---|------|------|
| 8.11 | URL·선수명 **빈 값** — 분석 시작 비활성 | ☐ |
| 8.12 | **잘못된 URL** — 에러 문구 + 버튼 비활성 | ☐ |
| 8.13 | 분석 **진행 중** URL/이름 수정 불가 | ☐ |

**G1 요약 (데모):** URL 검증 · 영상 정보 · 분석 진행 UI · 랜덤 리포트 · 레이더 · 성장 제안 · 최근 기록 → §1–7

---

## 9. 데모 시연 스크립트 (3분)

1. 팀 홈 → **AI 분석 (BETA)**  
2. YouTube URL 붙여넣기 → ✓ 확인 → **영상 정보**  
3. 선수명 → **분석 시작** → 로딩 1.5초  
4. **MVP · 레이더 · 배지 · 코멘트 · 성장 제안 · 종합**  
5. **최근 분석 기록** + 새로고침 유지  
6. (선택) 재분석으로 **등급/코멘트 변화** 보여주기  

---

## Phase 2 착수 게이트

아래 **4개 모두** 만족 전까지 **Phase 2 LOCKED 🔒** — Sprint 8B·9·10·11 **금지**.

| # | 게이트 | 범위 | Pass | 완료 라벨 | 날짜 |
|---|--------|------|------|-----------|------|
| G1 | **MVP 데모** | §1–7 | ☐ | Demo DONE | |
| G2 | **QA** | §8 (회귀·반응형·엣지·p0:guard) | ☐ | QA DONE | |
| G3 | **배포** | 배포 URL `/team/:teamId/ai-analysis` §1–7 재검 | ☐ | Deploy DONE | |
| G4 | **제품 승인** | Phase 2(Whisper) 착수 승인 | ☐ | Product Sign-off DONE | |

**Phase 2 순서 (G1–G4 후에만):**

```text
Sprint 9  Whisper PoC (Transcript)
Sprint 10 GPT Lite 리포트
Sprint 11 Firestore 저장
(Sprint 8B YouTube API — 후순위)
```

---

## 서명 (선택)

| 역할 | 이름 | 날짜 |
|------|------|------|
| 데모 수행 | | |
| QA | | |
| 제품 승인 | | |

---

**FINAL:** MVP v1은 코드 기준 **COMPLETE / FROZEN**. Phase 2는 **본 체크리스트 + 게이트 G1–G4** 통과 후 시작.
