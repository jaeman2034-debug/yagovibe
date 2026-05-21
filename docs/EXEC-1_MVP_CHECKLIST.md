# 🔒 MVP 구현 체크리스트 (천재 모드 EXEC-1)

## 목적

❌ 문서용 아님  
❌ 보고용 아님  
⭕ **"이거 하나라도 빠지면 제품 철학이 깨진다"는 경계선**

---

## ✅ 체크리스트 (YES/NO만)

### 1️⃣ QR 진입 (바이럴 입구)

- [ ] `/qr` 단일 엔트리 존재
- [ ] QR 진입 시 로그인/가입 체크 없음
- [ ] QR 목적별 즉시 리다이렉트
  - [ ] `item` → `/item/:id`
  - [ ] `chat` → `/chat/:id`
  - [ ] `market` → `/market`
  - [ ] `seller` → `/seller/:id`
- [ ] 잘못된 QR → `market` 홈 fallback

**체크 기준:** QR 스캔 시 중간 화면 없이 즉시 목적 화면으로 이동

---

### 2️⃣ 게스트 탐색 (가치 경험)

- [ ] 마켓 홈 게스트 접근 가능 (GET `/api/market`)
- [ ] 상품 상세 게스트 접근 가능 (GET `/api/items/:id`)
- [ ] 검색 가능 (GET `/api/search`)
- [ ] 채팅 읽기 가능 (GET `/api/chats/:id/messages`)
- [ ] 버튼은 보이되 숨기지 않음 (disabled 최소화)

**체크 기준:** 로그인 없이 모든 "보는 행위" 가능

---

### 3️⃣ 행동 차단 지점 (Lazy Signup)

- [ ] 채팅 보내기 → Lazy Signup 모달
- [ ] 판매 등록 → Lazy Signup 모달
- [ ] 찜 → Lazy Signup 모달
- [ ] 거래 요청 → Lazy Signup 모달
- [ ] 화면 진입 시 가입 요구 없음

**체크 기준:** 행동 시도 시에만 가입 요구, 화면 진입 시 절대 안 묻기

---

### 4️⃣ 가입 UX (초경량)

- [ ] 전화번호 + OTP 1순위 (기본)
- [ ] Google 로그인 지원
- [ ] Apple 로그인 지원 (선택)
- [ ] 가입 이유 문구 단순
  - [ ] "지금 하던 작업을 가입 후 바로 이어서 할 수 있어요"
- [ ] CTA = "가입하고 계속하기"

**체크 기준:** 가입 화면에서 설명 없이 빠르게 진행 가능

---

### 5️⃣ 가입 후 복귀 (가장 중요)

- [ ] 행동 시도 시 context 저장 (sessionStorage)
- [ ] 가입 성공 후 자동 복귀
- [ ] 사용자는 "끊김"을 느끼지 않음

**체크 기준:** 가입 전 하려던 행동이 가입 후 자동 실행됨

---

### 6️⃣ API 권한

- [ ] GET = Guest 허용 (인증 체크 없음)
- [ ] POST/PUT/DELETE = Member only (401 AUTH_REQUIRED)
- [ ] AUTH_REQUIRED 단일 에러 코드
- [ ] 프론트에서 Lazy Signup으로 변환

**체크 기준:** API 레벨에서 권한 차단, 프론트는 에러를 UX로 전환

---

### 7️⃣ 이벤트 로그 (최소)

- [ ] `qr_entered` - QR 진입 시
- [ ] `guest_view` - 게스트 화면 조회
- [ ] `auth_required` - 행동 시도 (Lazy Signup 트리거)
- [ ] `signup_started` - 가입 시작
- [ ] `signup_completed` - 가입 완료
- [ ] `post_signup_resumed` - 가입 후 복귀
- [ ] `member_action` - 회원 행동 완료

**체크 기준:** 7개 이벤트로 전체 플로우 추적 가능

---

## 🎯 체크리스트 합격 기준

### 필수 통과 조건

1. **QR 스캔 → 즉시 마켓/상품 화면** (중간 화면 없음)
2. **게스트로 모든 화면 탐색 가능** (가입 요구 없음)
3. **행동 시도 시에만 Lazy Signup** (화면 진입 시 요구 없음)
4. **가입 후 원래 행동 자동 실행** (끊김 없음)

### 실패 조건 (하나라도 있으면 재작업)

- ❌ QR 진입 시 로그인/가입 화면 노출
- ❌ 게스트가 상품 상세 못 봄
- ❌ 화면 진입 시 가입 요구
- ❌ 가입 후 다른 화면으로 이동

---

## 📋 구현 파일 체크

### 필수 구현 파일

- [ ] `src/lib/userState.ts` - 상태 판별 & requireAuth
- [ ] `src/lib/qrRouter.ts` - QR URL 파싱
- [ ] `src/lib/apiErrorHandler.ts` - API 에러 → Lazy Signup
- [ ] `src/lib/actionResumer.ts` - 가입 후 복귀
- [ ] `src/lib/uiRules.ts` - UI 표시 규칙
- [ ] `src/lib/growthEvents.ts` - 이벤트 추적
- [ ] `src/components/LazySignupModal.tsx` - Lazy Signup 모달
- [ ] `src/components/ActionButton.tsx` - 행동 버튼
- [ ] `src/pages/qr/QRMarketEntryPage.tsx` - QR 진입 페이지
- [ ] `src/pages/SignupLazyPage.tsx` - 초경량 가입 화면

---

## ✅ 최종 합격 기준

이 질문에 전부 YES면 MVP 배포 가능:

1. **QR 스캔한 사람이 설명 없이 바로 마켓/상품을 볼 수 있는가?**
2. **게스트가 가입 없이 모든 화면을 탐색할 수 있는가?**
3. **행동 시도 시에만 가입 요구가 나오는가?**
4. **가입 후 원래 하려던 행동이 자동 실행되는가?**
5. **7개 이벤트로 전체 플로우를 추적할 수 있는가?**

---

## 🔥 천재 모드 결론

**이 구조는:**
- 이미 성공한 패턴
- 중고 마켓에 최적
- 실행만 제대로 하면 바로 검증 가능

**이 시점에서의 최고의 판단:**
- ❌ 더 똑똑해지는 것
- ⭕ 더 단순하게 구현하는 것

