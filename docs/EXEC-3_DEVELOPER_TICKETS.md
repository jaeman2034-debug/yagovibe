# 🔒 개발자 작업 티켓 목록 (복붙용 / Jira·Linear)

## 목적

**QR 바이럴 → 무가입 탐색 → Lazy Signup → 즉시 복귀**

이 구조를 개발 중에 절대 깨먹지 않게 하는 작업 단위

---

## TICKET 1 — QR 엔트리 라우트 구현

**우선순위:** P0  
**설명:** 모든 QR 진입의 단일 엔트리

### 요구사항

- `/qr` 단일 라우트
- 쿼리 파라미터 해석:
  - `market=home` → `/market`
  - `item=ITEM_ID` → `/item/:id`
  - `chat=CHAT_ID` → `/chat/:id`
  - `seller=USER_ID` → `/seller/:id`
- 로그인/가입 체크 ❌
- 즉시 목적 화면으로 리다이렉트
- 잘못된 파라미터 → `market` 홈

### 구현 파일

- `src/pages/qr/QRMarketEntryPage.tsx`
- `src/lib/qrRouter.ts`

### 완료 조건

- ✅ QR 스캔 시 1초 내 화면 전환
- ✅ 어떤 QR이든 막히지 않음
- ✅ 중간 화면 없음

---

## TICKET 2 — 게스트 탐색 허용 (Public API)

**우선순위:** P0  
**설명:** 무가입 가치 경험 보장

### 요구사항

- GET API 게스트 허용:
  - 마켓 홈 (`GET /api/market`)
  - 상품 목록 (`GET /api/items`)
  - 상품 상세 (`GET /api/items/:id`)
  - 검색 (`GET /api/search`)
  - 채팅 읽기 (`GET /api/chats/:id/messages`)
- UI 버튼 숨김 ❌
- 모든 버튼 보임 (disabled 최소화)

### 구현 파일

- API 서버: GET 엔드포인트 인증 체크 제거
- 프론트: 게스트 접근 허용 확인

### 완료 조건

- ✅ 로그인 없이 3분 이상 탐색 가능
- ✅ 모든 "보는 행위" 가능
- ✅ 버튼은 보이되, 클릭 시 Lazy Signup

---

## TICKET 3 — Lazy Signup 트리거 연결

**우선순위:** P0  
**설명:** 행동 시점에만 가입 유도

### 요구사항

- 아래 행동에서만 트리거:
  - 채팅 보내기
  - 판매 등록
  - 찜
  - 거래 요청
- 화면 진입 시 트리거 ❌
- `requireAuth()` 패턴 사용
- 클릭 시 Lazy Signup 모달 열기

### 구현 파일

- `src/lib/userState.ts` - `requireAuth()` 함수
- `src/components/ActionButton.tsx` - 행동 버튼
- `src/lib/apiErrorHandler.ts` - API 에러 처리

### 완료 조건

- ✅ "하려는 순간"에만 모달 노출
- ✅ 화면 진입 시 가입 요구 없음

---

## TICKET 4 — Lazy Signup 모달 UI

**우선순위:** P0  
**설명:** 초경량 가입 진입 UX

### 요구사항

- 바텀시트(모바일) / 모달(웹)
- 배경 dim (약하게)
- 카피 고정 (절대 수정 금지):
  ```
  제목: 이 기능을 사용하려면 회원가입이 필요해요
  보조: 10초 만에 가입하고 하던 일을 계속할 수 있어요
  ```
- CTA: "가입하고 계속"
- 닫기 가능 (X 버튼 / 바깥 터치 / ESC)
- "나중에 하기" 옵션

### 구현 파일

- `src/components/LazySignupModal.tsx`

### 완료 조건

- ✅ 강요 느낌 ❌
- ✅ 원래 화면 유지
- ✅ 카피 절대 수정 안 함

---

## TICKET 5 — 초경량 가입 플로우

**우선순위:** P0  
**설명:** 전환 최소 마찰

### 요구사항

- 가입 수단 우선순위:
  1. 전화번호 + OTP (기본)
  2. Google 로그인
  3. Apple 로그인 (선택)
- 프로필/설명/튜토리얼 ❌
- 가입 화면 상단 안내 (반드시 표시):
  ```
  지금 하던 작업을
  가입 후 바로 이어서 할 수 있어요
  ```
- CTA: "가입하고 계속하기"

### 구현 파일

- `src/pages/SignupLazyPage.tsx`
- Firebase Phone Auth 연동
- Google/Apple OAuth 연동

### 완료 조건

- ✅ 평균 가입 시간 10초 이내
- ✅ 중간 설명 없음
- ✅ 프로필 요구 없음

---

## TICKET 6 — 가입 후 복귀 로직

**우선순위:** 🔥 P0 (가장 중요)  
**설명:** 끊김 없는 UX 보장

### 요구사항

- 행동 시도 시 `postSignupAction` 저장 (sessionStorage)
- 가입 완료 후 자동 실행
- 가입 UI 완전 종료
- 사용자 경험: "아까 누른 게 지금 됐네"

### 구현 파일

- `src/lib/userState.ts` - `savePostSignupAction()` / `getPostSignupAction()`
- `src/lib/actionResumer.ts` - `resumeAction()` 함수
- `src/pages/SignupLazyPage.tsx` - 가입 완료 후 복귀

### 완료 조건

- ✅ 사용자가 "끊겼다"는 느낌 없음
- ✅ 가입 전 행동이 가입 후 자동 실행
- ✅ 가입 화면에서 튕기지 않음

---

## TICKET 7 — API 권한 분리

**우선순위:** P1  
**설명:** 게스트/회원 권한 명확 분리

### 요구사항

- GET = Guest 허용 (인증 체크 제거)
- POST/PUT/DELETE = Member only (401 반환)
- 에러 코드 단일화:
  ```json
  {
    "code": "AUTH_REQUIRED"
  }
  ```
- 프론트에서 `AUTH_REQUIRED` → Lazy Signup 모달 열기

### 구현 파일

- API 서버: GET/POST 권한 분리
- `src/lib/apiErrorHandler.ts` - `handleAuthRequired()` 함수

### 완료 조건

- ✅ 우회 경로 0
- ✅ 버튼 숨김 0
- ✅ API 레벨에서 권한 차단

---

## TICKET 8 — 이벤트 로그 (최소)

**우선순위:** P1  
**설명:** 성장 & 전환 추적

### 요구사항

- 다음 이벤트 추적:
  - `qr_entered` - QR 진입 시
  - `guest_view` - 게스트 화면 조회
  - `auth_required` - 행동 시도
  - `signup_started` - 가입 시작
  - `signup_completed` - 가입 완료
  - `post_signup_resumed` - 가입 후 복귀
  - `member_action` - 회원 행동 완료

### 구현 파일

- `src/lib/growthEvents.ts` - 이벤트 추적 함수
- 기존 `src/lib/analytics.ts`와 통합

### 완료 조건

- ✅ QR → 가입 → 행동 퍼널이 숫자로 보임
- ✅ 전체 플로우 추적 가능

---

## 🚫 개발 중 절대 허용 안 되는 변경

- ❌ QR 진입 시 가입 요구
- ❌ 버튼 숨김 / disabled 처리
- ❌ 행동 전 가입 유도
- ❌ 프로필 완성 요구
- ❌ 튜토리얼 강제

---

## 이 티켓 묶음의 역할

- ❌ 기능 늘리기 아님
- ⭕ **제품 철학을 코드로 고정**

### 이걸 그대로 쓰면:

- 개발자가 각자 판단 안 함
- UX가 중간에 틀어지지 않음
- MVP가 2주 안에 나온다

---

## 📋 티켓 순서 (의존성 고려)

1. **TICKET 1** - QR 엔트리 (독립)
2. **TICKET 2** - 게스트 탐색 (TICKET 1 후)
3. **TICKET 3** - Lazy Signup 트리거 (TICKET 2 후)
4. **TICKET 4** - Lazy Signup 모달 (TICKET 3과 병렬)
5. **TICKET 5** - 초경량 가입 (TICKET 4 후)
6. **TICKET 6** - 가입 후 복귀 (TICKET 5 후)
7. **TICKET 7** - API 권한 분리 (TICKET 2, 3과 병렬)
8. **TICKET 8** - 이벤트 로그 (전체 완료 후)

---

## ✅ 최종 완료 기준

이 질문에 전부 YES면 MVP 배포:

1. **QR 스캔 → 즉시 마켓/상품 화면?**
2. **게스트로 모든 화면 탐색 가능?**
3. **행동 시도 시에만 가입 요구?**
4. **가입 후 원래 행동 자동 실행?**
5. **7개 이벤트로 전체 플로우 추적 가능?**

