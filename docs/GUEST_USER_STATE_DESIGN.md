# 🔒 게스트/회원 상태 플래그 설계 (STEP 1 LOCK)

## 목표

**"무가입으로 최대한 많이 보여주되, 행동 순간에만 정확히 막고, 가입 후엔 원래 하던 곳으로 되돌린다."**

이걸 코드/기획/UX가 같은 언어로 이해하게 만드는 것이 목적이다.

---

## 1️⃣ 사용자 상태 정의 (절대 바뀌지 않는 기준)

### 상태는 딱 2개만 쓴다

```typescript
type UserState = "GUEST" | "MEMBER";
```

### ❌ 사용하지 않는 상태
- Semi-user
- Temp-user
- Anonymous-member

→ 복잡해지는 순간 망한다

### 상태 판별 기준 (프론트/백엔드 공통)

| 조건 | 상태 |
|------|------|
| 인증 토큰 없음 | GUEST |
| 인증 토큰 있음 | MEMBER |

❗ **전화번호 인증 여부, 프로필 완성 여부는 상태에 영향을 주지 않는다**

---

## 2️⃣ 프론트엔드 상태 판별 규칙

```typescript
function getUserState(): UserState {
  return auth.currentUser ? "MEMBER" : "GUEST";
}
```

- 로그인 안 됨 = GUEST
- 로그인 됨 = MEMBER

👉 UI 분기, 행동 제한은 이 함수 하나만 본다

---

## 3️⃣ 행동 기준 매트릭스 (핵심)

**"보는 것"과 "하는 것"을 분리한다**

| 기능 | GUEST | MEMBER |
|------|-------|--------|
| 마켓 홈 | ⭕ | ⭕ |
| 상품 상세 | ⭕ | ⭕ |
| 검색 | ⭕ | ⭕ |
| 채팅 읽기 | ⭕ | ⭕ |
| 채팅 보내기 | ❌ | ⭕ |
| 판매 등록 | ❌ | ⭕ |
| 찜 | ❌ | ⭕ |
| 거래 요청 | ❌ | ⭕ |
| 결제 | ❌ | ⭕ |

**차단은 UI가 아니라 "행동 시점"에서만 한다**

---

## 4️⃣ Lazy Signup 트리거 연결 방식

### 트리거 함수는 하나만 둔다

```typescript
function requireAuth(action: () => void, actionContext?: PostSignupAction) {
  if (getUserState() === "MEMBER") {
    action();
  } else {
    if (actionContext) {
      savePostSignupAction(actionContext);
    }
    openSignupModal();
  }
}
```

### 사용 예시

```typescript
// 채팅 보내기
requireAuth(() => {
  sendMessage(itemId);
}, {
  type: "OPEN_CHAT",
  payload: { itemId: 123 }
});

// 판매하기
requireAuth(() => {
  openSellForm();
}, {
  type: "OPEN_SELL_FORM",
  payload: {}
});
```

👉 이 패턴 하나로 모든 Lazy Signup 통제

---

## 5️⃣ "가입 후 복귀"를 보장하는 구조 (핵심 중 핵심)

### 행동 시도 시 반드시 저장

```typescript
sessionStorage.setItem("postSignupAction", JSON.stringify({
  type: "OPEN_CHAT",
  payload: { itemId: 123 }
}));
```

### 가입 성공 후

```typescript
const action = sessionStorage.getItem("postSignupAction");

if (action) {
  resumeAction(JSON.parse(action));
  sessionStorage.removeItem("postSignupAction");
}
```

❗ **localStorage ❌**
❗ **sessionStorage ⭕**
(브라우저 세션 종료 시 자연스럽게 사라져야 함)

---

## 6️⃣ UX 기준 문구 (고정)

Lazy Signup 모달에는 이 톤만 허용:

```
이 기능을 사용하려면 회원가입이 필요해요
[ 10초 만에 가입하고 계속]
```

❌ "권한이 없습니다"
❌ "로그인이 필요합니다"

---

## 7️⃣ 이 설계의 본질 (천재 포인트)

- 상태는 단순할수록 강하다
- QR + 게스트 전략은 "보여주는 힘"
- 가입은 마찰이 아니라 연결 단계
- 복귀 UX가 깨지면 모든 전략이 무너진다

---

## 8️⃣ 지금 단계에서 절대 하면 안 되는 것

- 게스트 전용 계정 생성 ❌
- 임시 UID 발급 ❌
- 쿠키로 사용자 흉내 ❌
- 행동 전에 가입 요구 ❌

---

## ✅ STEP 1 완료 조건

이 질문에 YES면 다음 단계로 간다:

1. **"지금 이 사용자가 GUEST인지 MEMBER인지 코드 한 줄로 말할 수 있는가?"**
   → ✅ `getUserState()` 함수

2. **"어디서 가입했든, 다시 원래 행동으로 돌아오는가?"**
   → ✅ `savePostSignupAction()` / `getPostSignupAction()` 구조

---

## 구현 파일

- `src/lib/userState.ts` - 상태 판별 및 requireAuth 로직
- `src/components/LazySignupModal.tsx` - 가입 모달 컴포넌트

---

## 다음 단계

👉 **STEP 2 — QR URL 규칙 & 딥링크 스펙 정의**

