# 🔒 2주 MVP 구현 순서표 (망가지지 않는 루트)

## 원칙

**바이럴 입구 → 가치 노출 → 전환 장치 → 복귀 보장 → 계측**

(이 순서 어기면 다시 뜯는다)

---

## 📆 WEEK 1 — "들어오고, 보고, 막히게 하라"

**목표: QR로 들어와서 무가입으로 충분히 보게 만든다.**

---

### Day 1–2: QR 엔트리

#### 작업 목록

- [ ] `/qr` 단일 엔트리 구현
- [ ] 목적별 즉시 리다이렉트
  - [ ] `market` → `/market`
  - [ ] `item` → `/item/:id`
  - [ ] `chat` → `/chat/:id`
  - [ ] `seller` → `/seller/:id`
- [ ] 로그인/가입 체크 ❌ 제거
- [ ] fallback → `market` 홈

#### 구현 파일

- `src/pages/qr/QRMarketEntryPage.tsx` - QR 진입 페이지
- `src/lib/qrRouter.ts` - QR URL 파싱 & 라우팅

#### 완료 기준

- ✅ QR 찍자마자 화면 뜸
- ✅ 어떤 QR이든 1초 내 이동
- ✅ 중간 화면 없음

---

### Day 3–4: 게스트 탐색

#### 작업 목록

- [ ] 마켓 홈 GET (`/api/market`)
- [ ] 상품 상세 GET (`/api/items/:id`)
- [ ] 검색 GET (`/api/search`)
- [ ] 채팅 읽기 GET (`/api/chats/:id/messages`)
- [ ] UI 버튼 전부 노출 (disabled 최소화)

#### 구현 파일

- `src/pages/market/MarketPage.tsx` - 마켓 홈 (게스트 접근 허용)
- `src/pages/market/ProductDetail.tsx` - 상품 상세 (게스트 접근 허용)
- `src/pages/SearchPage.tsx` - 검색 (게스트 접근 허용)
- `src/pages/chat/ChatRoom.tsx` - 채팅 읽기 (게스트 접근 허용)

#### API 수정

- GET 엔드포인트에서 인증 체크 제거
- Rate limit만 적용

#### 완료 기준

- ✅ 로그인 없이 3분 이상 구경 가능
- ✅ "이 앱 뭐 하는지" 바로 이해
- ✅ 모든 버튼 보임 (회색 처리 최소화)

---

### Day 5: 행동 차단 (Lazy Signup 트리거)

#### 작업 목록

- [ ] 채팅 보내기 클릭 → Lazy Signup 모달
- [ ] 판매하기 클릭 → Lazy Signup 모달
- [ ] 찜 클릭 → Lazy Signup 모달
- [ ] 거래 요청 → Lazy Signup 모달
- [ ] 화면 진입 시 가입 요구 없음

#### 구현 파일

- `src/components/LazySignupModal.tsx` - Lazy Signup 모달
- `src/components/ActionButton.tsx` - 행동 버튼 (requireAuth 연결)
- `src/lib/userState.ts` - `requireAuth()` 함수

#### 완료 기준

- ✅ 딱 "하려는 순간"에만 막힘
- ✅ 화면 진입 시 가입 요구 없음

---

## 📆 WEEK 2 — "가입시키고, 끊김 없이 돌려보내라"

**목표: 전환이 '부드럽게' 일어난다.**

---

### Day 6–7: 초경량 가입

#### 작업 목록

- [ ] 전화번호 + OTP (우선순위 1)
- [ ] Google 로그인 지원
- [ ] Apple 로그인 지원 (선택)
- [ ] CTA: "가입하고 계속하기"
- [ ] 가입 이유 카피 고정:
  - "지금 하던 작업을 가입 후 바로 이어서 할 수 있어요"

#### 구현 파일

- `src/pages/SignupLazyPage.tsx` - 초경량 가입 화면
- Firebase Phone Auth 연동
- Google/Apple OAuth 연동

#### 완료 기준

- ✅ 10초 내 가입 완료
- ✅ 중간 설명/프로필 요구 ❌
- ✅ "가입하고 계속하기" CTA

---

### Day 8–9: 복귀 로직 (가장 중요)

#### 작업 목록

- [ ] 행동 시도 시 `postSignupAction` 저장 (sessionStorage)
- [ ] 가입 완료 후 자동 실행
- [ ] 가입 화면/모달 완전 종료
- [ ] 사용자 경험: "아까 누른 게 지금 됐네"

#### 구현 파일

- `src/lib/userState.ts` - `savePostSignupAction()` / `getPostSignupAction()`
- `src/lib/actionResumer.ts` - `resumeAction()` 함수
- `src/pages/SignupLazyPage.tsx` - 가입 완료 후 복귀 로직

#### 완료 기준

- ✅ "아까 누른 게 지금 됐네" 느낌
- ✅ 끊김 없이 원래 행동 실행
- ✅ 가입 화면에서 튕기지 않음

---

### Day 10: API 권한 마무리

#### 작업 목록

- [ ] GET = Guest 허용 (인증 체크 제거)
- [ ] POST/PUT/DELETE = Member only (401 AUTH_REQUIRED)
- [ ] AUTH_REQUIRED 단일 에러 코드
- [ ] 프론트에서 Lazy Signup으로 변환

#### 구현 파일

- API 서버: GET 엔드포인트 인증 체크 제거
- API 서버: POST 엔드포인트 401 반환
- `src/lib/apiErrorHandler.ts` - `handleAuthRequired()` 함수
- `src/components/LazySignupModal.tsx` - API 에러 시 모달 열기

#### 완료 기준

- ✅ 우회 경로 0
- ✅ 버튼 숨김 0
- ✅ API 레벨에서 권한 차단

---

### Day 11–12: 이벤트 로그

#### 작업 목록

- [ ] `qr_entered` - QR 진입 시
- [ ] `guest_view` - 게스트 화면 조회
- [ ] `auth_required` - 행동 시도
- [ ] `signup_started` - 가입 시작
- [ ] `signup_completed` - 가입 완료
- [ ] `post_signup_resumed` - 가입 후 복귀
- [ ] `member_action` - 회원 행동 완료

#### 구현 파일

- `src/lib/growthEvents.ts` - 이벤트 추적 함수
- 기존 `src/lib/analytics.ts`와 통합

#### 완료 기준

- ✅ 퍼널이 숫자로 보임
- ✅ QR → 가입 → 행동 연결 추적 가능

---

### Day 13–14: 실전 테스트

#### 테스트 시나리오

- [ ] 모바일 QR 스캔 (실제 QR 코드 생성)
- [ ] 초면 사용자 3명
- [ ] 말 없이 관찰
- [ ] 체크리스트 검증 (EXEC-1)

#### 관찰 포인트

1. QR 스캔 후 화면 진입 시간
2. 게스트 탐색 시간 (몇 분?)
3. 어디서 행동 시도하는가?
4. 가입 후 복귀가 자연스러운가?
5. 막힘 포인트가 몇 번인가?

#### 완료 기준

- ✅ 설명 없이 사용 가능
- ✅ 막힘 포인트 1회 이하
- ✅ 가입 후 복귀 자연스러움

---

## 🚫 이 2주 동안 절대 금지

- ❌ 추천/랭킹
- ❌ 결제 디테일
- ❌ 프로필 완성
- ❌ 온보딩 튜토리얼
- ❌ 설정 화면

**원칙: 바이럴 입구 → 전환 → 복귀만 집중**

---

## ✅ 2주 후 나와야 하는 것

1. ✅ QR로 사람이 들어온다
2. ✅ 무가입으로 오래 본다
3. ✅ 행동하다가 가입한다
4. ✅ 가입 후 바로 이어서 쓴다
5. ✅ 어디서 막히는지 숫자로 안다

---

## 📋 주간 체크포인트

### Week 1 끝 체크

- QR 진입 즉시 동작 ⭕
- 게스트 탐색 가능 ⭕
- Lazy Signup 트리거 동작 ⭕

### Week 2 끝 체크

- 가입 10초 내 완료 ⭕
- 복귀 로직 자연스러움 ⭕
- 이벤트 로그 동작 ⭕

---

## 🔥 천재 모드 결론

**이 구조는:**
- 이미 성공한 패턴
- 중고 마켓에 최적
- 실행만 제대로 하면 바로 검증 가능

**2주 후:**
- 바이럴 입구 완성
- 전환 장치 완성
- 복귀 UX 완성
- 계측 시스템 완성

**이제 실행만 하면 된다.**

