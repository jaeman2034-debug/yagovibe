# 🔒 API 권한 설계 (Guest vs Member) - STEP 3 LOCK

## 목표

**게스트에게는 '보는 자유'를, 회원에게만 '행동 권한'을 준다.**
그리고 이 기준이 API 레벨에서 절대 흔들리지 않게 한다.

---

## 1️⃣ 권한 설계의 대원칙 (절대 규칙)

- **권한은 UI가 아니라 API에서 막는다**
- GET은 대부분 허용
- POST/PUT/DELETE는 거의 전부 회원만
- "막을 때"는 에러가 아니라 가입 UX로 연결

❌ 프론트에서만 버튼 숨기기
❌ API에서 애매한 조건 분기

→ **API가 단일 진실**

---

## 2️⃣ API를 두 부류로 나눈다 (이게 핵심)

### A. Public API (게스트 허용) - "보는 것"
### B. Action API (회원 전용) - "하는 것"

---

## 3️⃣ Public API 목록 (GUEST ⭕)

| API | Method | 설명 |
|-----|--------|------|
| `/api/market` | GET | 마켓 홈 |
| `/api/items` | GET | 상품 목록 |
| `/api/items/:id` | GET | 상품 상세 |
| `/api/search` | GET | 검색 |
| `/api/chats/:id/messages` | GET | 채팅 읽기 |
| `/api/sellers/:id` | GET | 판매자 정보 |

### 서버 기준

```typescript
// middleware
if (req.method === "GET") {
  allow();
}
```

- 인증 토큰 없어도 통과
- Rate limit만 적용

---

## 4️⃣ Action API 목록 (MEMBER 전용)

| API | Method | 설명 |
|-----|--------|------|
| `/api/chats/:id/messages` | POST | 채팅 보내기 |
| `/api/items` | POST | 상품 등록 |
| `/api/items/:id/like` | POST | 찜 |
| `/api/orders` | POST | 거래 요청 |
| `/api/payments` | POST | 결제 |
| `/api/items/:id` | PUT/DELETE | 수정/삭제 |

### 서버 기준 (강제)

```typescript
if (!req.user) {
  return res.status(401).json({
    code: "AUTH_REQUIRED",
    message: "LOGIN_REQUIRED"
  });
}
```

❗ **여기서 절대 UI 메시지 만들지 않는다**
→ UX는 프론트가 담당

---

## 5️⃣ 프론트: API 에러를 Lazy Signup으로 변환

### 에러 코드 표준화 (중요)

서버는 이 코드만 반환:

```json
{
  "code": "AUTH_REQUIRED"
}
```

### 프론트 처리

```typescript
if (error.code === "AUTH_REQUIRED") {
  openSignupModal();
}
```

👉 이 한 줄로 모든 Lazy Signup 연결

---

## 6️⃣ "가입 후 복귀" 연결 (API 관점)

### Action API 호출 직전

```typescript
sessionStorage.setItem("postSignupAction", JSON.stringify({
  type: "SEND_CHAT",
  payload: { chatId, message }
}));
```

### 가입 완료 후

```typescript
resumeAction();
```

👉 **API는 상태를 모른다**
→ "복귀"는 전부 프론트 책임

---

## 7️⃣ API 설계에서 절대 금지 사항

- ❌ `/api/guest/sendMessage`
- ❌ `allowGuest=true` 옵션
- ❌ 회원/게스트 겸용 POST API

**행동은 항상 회원만**

---

## 8️⃣ 보안/확장 관점에서 이 설계가 강한 이유

- 게스트 트래픽 폭증해도 안전
- 권한 우회 경로 없음
- 나중에:
  - 유료 기능
  - 지역 제한
  - KYC
  전부 같은 패턴으로 확장 가능

---

## ✅ STEP 3 완료 체크

이 질문에 YES면 끝:

1. **"GET API는 로그인 없어도 다 된다"**
   → ✅ Public API 정의

2. **"POST API는 무조건 로그인 필요"**
   → ✅ Action API 정의 + AUTH_REQUIRED 에러

3. **"AUTH_REQUIRED 하나로 Lazy Signup이 열린다"**
   → ✅ 프론트 에러 핸들링 표준화

4. **"API 문서 없이도 개발자가 헷갈리지 않는다"**
   → ✅ 명확한 GET vs POST 분리

---

## 구현 파일

- `src/lib/apiErrorHandler.ts` - API 에러를 Lazy Signup으로 연결
- `docs/API_PERMISSION_DESIGN.md` - 이 문서

