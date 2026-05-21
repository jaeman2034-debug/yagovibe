# PR-11D — Avatar Completion

**Status:** **COMPLETE** — IMPLEMENTED · REVIEWED · APPROVED · MERGE SAFE · **PRODUCT BASELINE**.  
**SPEC:** **FROZEN** (계약 문서는 고정; 변경 시 개정 + 승인).  
**Implementation:** **Phase 1 + Phase 2 in repo** — 공용 `PlayerAvatar` 단일 렌더러(SoT), 로컬 AI 스타일 파서·프리셋·하이브리드 온보딩, Hub/Playground·프리뷰 파이프라인 연동; Phase 2는 **`PlayerAvatar.tsx` 비주얼 폴리시만** (XP/배지/라우팅/규칙 미터치).  
**Single source of truth:** 본 파일만.  
**Goal:** 아바타 생성이 **설정 폼**이 아니라 **실제 플레이어 정체성 시스템**처럼 느껴지게 완성한다.

**후속(블로커 아님):** 팔 실루엣·얼굴 미세 차별, 친구 초대 랜딩용 **`previewFriendInvite` 응답에 safe appearance 서브셋** 등은 별도 PR.

---

## Phase 1 & 2 review (제품 승인 기록)

**최종 Verdict:** **APPROVED** — PR-11D **공식 종료**. 아바타는 **placeholder 실험**이 아니라 플랫폼 **제품 v1 베이스라인**에 포함.

| 구간 | 평가 (대략) |
|------|-------------|
| 아키텍처 (공용 렌더러·파서·프리셋) | ~9/10 |
| 온보딩 UX (하이브리드) | ~9/10 |
| 렌더러 비주얼 (Phase 1 v1) | ~6.8–7.0/10 |
| 렌더러 비주얼 (Phase 2 이후) | ~8.7–9.0/10 |

**Phase 1 완료:** 시스템 뼈대 + `PlayerAvatar` 전신·연동 + 온보딩/허브/운동장 일관성.  
**Phase 2 완료:** 비례·팔다리 두께·풋볼 저지/쇼츠/양말/부츠·스탠스·페이스 악센트; 스코프는 **`PlayerAvatar.tsx` only**.

---

## Roadmap priority (권장 — 문서 계약과 별개)

**PR-11D는 완료.** 다음 권장 우선순위는 **PR-11A (challenge aggregates / cache)** — 챌린지 보상·집계 쿼리 비용(`priorBestExcluding` 등) 스케일 대비.

```text
PR-11D (COMPLETE) → PR-11A → PR-11B → PR-11C → PR-12
```

---

## 제품 한 줄

```text
"아바타를 진짜 제품 기능으로 완성"
```

단순 UI 수정이 아님 — **정체성·온보딩·렌더·허브·일관성** 전반.

---

## DO NOT touch

```text
- XP engine
- badge engine
- challenge reward logic
- playground routing
- social graph
- Firestore security rules unrelated to avatars
```

**Scope:** Avatar product completion only.

---

## Current problems (baseline)

- Avatar onboarding exists, but feels like **form input**.
- Hub avatar preview is **MVP-only**, too template-like.
- Different users still look **too similar**.
- No emotional **“this is MY player”** feeling.
- No **AI-assisted personalization** (spec은 경량 파서 우선).

---

## 1. Avatar creation UX redesign

Replace current onboarding **chip-only** experience with a **hybrid flow**.

**Current:** nickname → body / hair / face / skin / top / shoe chips (config form 느낌).

**New flow — Step 1: “내 플레이어 만들기”**

- **Headline:** 야고 플레이어 만들기  
- **Copy:** 원하는 선수 스타일을 설명하거나 직접 꾸며 보세요.

**Two entry paths:**

| Path | Label |
|------|--------|
| A | **AI 스타일로 만들기** |
| B | **직접 꾸미기** |

---

## 2. AI avatar stylist (MVP: no remote LLM required)

- **Free-text prompt** + 버튼 **「AI 추천 만들기」**.
- 예: `빠른 윙어 느낌, 짧은 머리, 근육형`, `깔끔한 공격수 스타일, 보라 유니폼`, `스트리트 풋볼 느낌`.
- **MVP:** 경량 **키워드 매핑 파서** (외부 LLM 없음; 이미 프로젝트에 LLM이 있으면 선택 확장 가능).
- 기존 `avatar` appearance 스키마로 매핑 (예: `짧은 머리` → short hair 계열, `근육` → muscular, `날렵` → slim, `스트리트` → streetwear, `저지` → jersey, `부드러운` → soft face 등).
- **Fallback:** 매칭 부족 시 **합리적 default preset**.
- 결과: appearance **자동 채움** → 사용자는 이후 **수동 수정** 가능.
- **NO** image generation. **NO** remote AI dependency for MVP.

---

## 3. Direct customization mode

- Chip 커스터마이징 유지하되 **레이아웃 재설계**.
- **Requirements:**
  - visual-first  
  - **preview 항상 표시**  
  - 칩 그룹 정리 (덜 form-like)  
- **Layout:**  
  - **LEFT / TOP:** live avatar preview  
  - **RIGHT / BELOW:** appearance controls  
- **Groups:** 헤어 · 얼굴 · 체형 · 피부톤 · 상의 · 신발  
- **Preset quick styles:** 공격수, 플레이메이커, 드리블러, 수비수, 스트리트 — 선택 시 칩/값 동기화.

---

## 4. Avatar renderer v2

현재 MVP 실루엣 → **“mini player”** 품질로 업그레이드.

**Requirements:**

- full body (**다리·신발** 가시)  
- 체형·얼굴·헤어 실루엣 **차별 강화**  
- 의상 스타일 **시각적 구분**  
- **sporty idle stance** (정적 포즈로 표현 가능)  
- **Still CSS / SVG based** — NO 3D, NO spritesheet dependency.  
- appearance config에서 **결정적(deterministic) 렌더** — 동일 config = 동일 아바타.

---

## 5. Hub identity card (desktop / mobile)

`HubAvatarIdentityCard` 재정렬 (이미 2열 방향이면 **스펙과 정합** 유지).

**Desktop / tablet — 2-column hero:**

```text
[avatar preview]   nickname
                    Lv
                    XP progress
                    badge summary
                    [운동장 입장] [프로필 공유]

Below:
「내 플레이 스타일 보기」
```

**Mobile:** stack layout.

**Requirements:** responsive, 과도한 세로 공백 없음, identity-first, action clarity.

---

## 6. Stat presentation cleanup

- 슛 / 패스 / 드리블 / 수비 / 스피드  
- **0은 숨김**; 전부 0이면: **「첫 활동 후 플레이 스타일이 표시됩니다」**  
- 0이 아닌 것만 표시 — **영구 빈 5그리드 금지**.

---

## 7. Avatar emotional continuity (critical)

온보딩에서 만든 아바타가 **동일 appearance**로 보여야 함:

- Hub  
- Playground avatar summary  
- Profile share card  

**Duplicate renderer divergence 금지.**

**Shared component 예:** `src/components/avatar/PlayerAvatar.tsx` (또는 동일 역할 단일 진입점).

**Used by:** onboarding preview, Hub, Playground, invite/profile cards.

---

## 8. XP display consistency

프론트 XP 구간이 백엔드와 **중복**이면 drift 위험.

- 모노레포 **shared package**가 쉬우면 임계값 단일화.  
- 아니면 프론트 **한 파일 집중 + 경고 주석** 필수.  
- **Must stay consistent with:** `functions/src/lib/avatar/avatarXpConfig.ts`.

---

## 9. Accessibility / polish

- 버튼 **키보드 접근**  
- 컨트롤 **focus visible**  
- 커스터마이징 **ARIA**  
- **대비** 합리적 수준  

---

## 10. Performance

- 렌더러 **경량** — NO heavy canvas, NO animation loops, NO runtime image generation.  
- **즉시 렌더** 목표.

---

## 11. Explicit NO

```text
Do NOT add:
- NFT / avatar marketplace
- image upload avatars
- AI image generation
- premium cosmetics
- monetization
- random loot cosmetics
- multiplayer avatar sync
- realtime avatar animation
```

Identity completion이지 **메타게임 확장**이 아님.

---

## Acceptance criteria

User can:

1. 텍스트로 원하는 플레이어를 설명 → **자동 생성 appearance config**  
2. **시각적으로** 수동 커스터마이즈  
3. **동일 아바타**가 onboarding · hub · playground · profile share에서 일치  
4. 사용자 간 **유니크함**이 체감됨  
5. **동일 정체성 카드**에서 progression 이해  
6. **모바일 + 데스크톱** 레이아웃이 깔끔함  

**Definition of done:** Avatar가 **실제 제품 정체성 시스템**처럼 느껴짐 — **설정 폼이 아님**.

---

## Product maturity note (shipping v1)

**달성 상태:**

```text
MVP identity placeholder → shipping product avatar (PlayerAvatar v1 product line)
```

추가 미세 폴리시는 **마이크로 개선**으로 분리 가능.

---

## See also

- `src/components/avatar/AvatarAppearancePreview.tsx` — `PlayerAvatar` 위 thin 래퍼(레거시 import 호환)  
- `src/components/avatar/PlayerAvatar.tsx` — 단일 소스 전신 렌더(CSS)  
- `src/components/hub/HubAvatarIdentityCard.tsx` — 허브 히어로  
- `src/lib/avatar/avatarLevelUi.ts` — XP UI 구간 (PR-11D §8과 정합)  
- `functions/src/lib/avatar/avatarXpConfig.ts` — 서버 XP/레벨 SoT  
