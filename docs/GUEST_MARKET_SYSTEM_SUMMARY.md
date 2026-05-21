# 🔒 중고 마켓 무가입 진입 시스템 — 전체 설계 요약

## 🎯 시스템 본질

**QR = 바이럴 유입 채널**  
**게스트 = 가치 경험**  
**Lazy Signup = 전환 장치**  
**복귀 UX = 품질 핵심**  
**이벤트 = 판단 도구**

👉 **중고 마켓에 최적화된 성장형 구조**

---

## 📋 STEP별 완성 상태

### ✅ STEP 1 — 게스트/회원 상태 플래그 설계
- `UserState = "GUEST" | "MEMBER"` (2개만)
- `getUserState()` 함수
- `requireAuth()` 트리거 함수
- 가입 후 복귀 구조 (sessionStorage)

### ✅ STEP 2 — QR URL 규칙 & 딥링크 스펙
- QR URL 표준 포맷: `/qr?<type>=<id>`
- 지원 타입: `market`, `item`, `chat`, `seller`
- QR 진입 페이지 (즉시 목적 화면 이동)

### ✅ STEP 3 — API 권한 설계
- Public API (GET) = 게스트 허용
- Action API (POST/PUT/DELETE) = 회원 전용
- AUTH_REQUIRED 에러 코드 표준화
- API 에러 → Lazy Signup 연결

### ✅ STEP 4 — 가입 UX & Lazy Signup 모달 스펙
- Lazy Signup 모달 (바텀시트/센터)
- 초경량 가입 화면 (전화번호 + OTP)
- 가입 후 복귀 로직
- 모달 카피 (절대 수정 금지)

### ✅ STEP 5 — 상태 기반 UI 표시 규칙
- 버튼은 숨기지 않는다
- 클릭 시 Lazy Signup (게스트) / 즉시 실행 (회원)
- CTA 문구 동일 (Guest/Member)
- `ActionButton` 컴포넌트

### ✅ STEP 6 — 이벤트/로그 설계
- 7개 핵심 이벤트 (의도 중심)
- QR → 가입 → 행동 추적
- Lazy Signup 성공/실패 측정

---

## 🔑 핵심 파일 구조

```
src/
├── lib/
│   ├── userState.ts          # STEP 1: 상태 판별 & requireAuth
│   ├── qrRouter.ts           # STEP 2: QR URL 파싱 & 라우팅
│   ├── apiErrorHandler.ts    # STEP 3: API 에러 → Lazy Signup
│   ├── actionResumer.ts      # STEP 4: 가입 후 액션 복귀
│   ├── uiRules.ts            # STEP 5: UI 표시 규칙
│   └── growthEvents.ts       # STEP 6: 성장 이벤트 추적
├── components/
│   ├── LazySignupModal.tsx   # STEP 4: Lazy Signup 모달
│   ├── ActionButton.tsx      # STEP 5: 행동 버튼 컴포넌트
│   └── SignupBanner.tsx      # STEP 5: 가입 배너 (선택적)
├── pages/
│   ├── qr/
│   │   └── QRMarketEntryPage.tsx  # STEP 2: QR 진입 페이지
│   └── SignupLazyPage.tsx    # STEP 4: 초경량 가입 화면
└── docs/
    ├── GUEST_USER_STATE_DESIGN.md
    ├── QR_URL_AND_DEEPLINK_SPEC.md
    ├── API_PERMISSION_DESIGN.md
    ├── LAZY_SIGNUP_UX_SPEC.md
    ├── UI_RULES_GUEST_VS_MEMBER.md
    └── GROWTH_EVENTS_AND_LOGGING.md
```

---

## 🎯 핵심 원칙 요약

### 1. 상태는 단순할수록 강하다
- `GUEST` vs `MEMBER` (2개만)

### 2. UI는 유혹해야지 차단하면 안 된다
- 버튼은 숨기지 않는다
- 클릭 시 그 순간에만 막고 연결

### 3. 가입은 마찰이 아니라 연결 단계
- Lazy Signup = 행동 시점에만
- 복귀 UX가 깨지면 모든 전략이 무너진다

### 4. 이벤트는 의도 중심
- 7개 핵심 이벤트만
- "결정에 쓰는 이벤트"만

---

## 📊 핵심 메트릭 (7개 이벤트로 측정)

1. **QR 유입량** → `qr_entered`
2. **게스트 탐색** → `guest_view`
3. **전환 시작점** → `auth_required`
4. **가입 전환율** → `signup_started` / `signup_completed`
5. **복귀 성공률** → `post_signup_resumed` / `signup_completed`
6. **회원 활성도** → `member_action`
7. **전체 플로우** → QR → 가입 → 행동 연결

---

## 🚀 다음 단계 (실행)

1. **MVP 개발 체크리스트** - 이 설계 기준으로 구현 우선순위 정리
2. **실제 사용자 5명 테스트 시나리오** - 검증 플로우 정의
3. **초기 KPI 대시보드 설계** - 7개 이벤트 기반 대시보드

---

## ✅ 완성 상태

지금 상태:

- ✅ QR 진입 ⭕
- ✅ 무가입 탐색 ⭕
- ✅ 상태 기반 UI ⭕
- ✅ Lazy Signup 연결 ⭕
- ✅ 복귀 UX ⭕
- ✅ 성장 추적 ⭕

👉 **중고 마켓에 최적화된 성장형 구조 완성**

