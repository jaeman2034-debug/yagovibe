# 🔒 이벤트 / 로그 설계 (성장 & 전환 추적) - STEP 6 LOCK

## 목표

**QR이 얼마나 퍼지는지, 게스트가 어디서 막히는지, 가입이 어디서 터지는지를 '한 눈에' 알 수 있게 한다.**

---

## 1️⃣ 이벤트 설계 원칙 (천재 기준)

- 이벤트 수는 적을수록 강하다
- 모든 이벤트는 "의도" 중심
- 로그는 분석가가 아니라 PM/대표가 바로 읽을 수 있어야 한다
- "있으면 좋은 이벤트" ❌ → "결정에 쓰는 이벤트" ⭕

---

## 2️⃣ 전체 이벤트 맵 (초기 LOCK)

**이 플랫폼에서 반드시 필요한 이벤트는 딱 7개다.**

---

## 3️⃣ QR 관련 이벤트 (바이럴 측정 핵심)

### ① qr_entered

**언제:** QR URL 진입 시  
**왜:** QR이 실제로 스캔되고 있는지 확인

```typescript
{
  "event": "qr_entered",
  "type": "item | chat | market | seller",
  "id": "ITEM_ID | CHAT_ID | null",
  "is_guest": true
}
```

👉 **이 이벤트 하나로:**
- QR 유입량
- QR 타입별 성과
를 전부 본다.

---

## 4️⃣ 게스트 행동 이벤트 (가치 경험 측정)

### ② guest_view

**언제:** 게스트가 주요 화면을 본 경우

```typescript
{
  "event": "guest_view",
  "screen": "market | item | chat"
}
```

👉 **"구경만 하고 나가는지" 판단**

---

## 5️⃣ Lazy Signup 트리거 이벤트 (전환 직전)

### ③ auth_required

**언제:** 게스트가 행동을 시도했을 때

```typescript
{
  "event": "auth_required",
  "action": "send_chat | sell | like | order"
}
```

👉 **이게 전환 퍼널의 시작점**

---

## 6️⃣ 가입 이벤트 (전환 성공)

### ④ signup_started

```typescript
{
  "event": "signup_started",
  "method": "phone | google | apple"
}
```

### ⑤ signup_completed

```typescript
{
  "event": "signup_completed",
  "method": "phone | google | apple"
}
```

👉 **여기서:**
- 가입 전환율
- 가입 방식 성과
가 바로 나온다.

---

## 7️⃣ 복귀 성공 이벤트 (UX 품질 핵심)

### ⑥ post_signup_resumed

**언제:** 가입 후 원래 하려던 행동이 자동 실행됐을 때

```typescript
{
  "event": "post_signup_resumed",
  "action": "send_chat | sell | like | order"
}
```

👉 **이 이벤트가 없으면 Lazy Signup 실패다.**

---

## 8️⃣ 회원 행동 이벤트 (실제 가치)

### ⑦ member_action

**언제:** 회원이 핵심 행동을 완료했을 때

```typescript
{
  "event": "member_action",
  "action": "send_chat | sell | order"
}
```

👉 **"가입만 하고 안 쓰는지" 바로 보임**

---

## 9️⃣ 이벤트 수집 구현 기준 (초경량)

### 프론트 기준 (예시)

```typescript
trackGrowthEvent({
  event: "auth_required",
  action: "send_chat"
});
```

Firebase / Segment / GA / 자체 로그 아무거나 가능

**중요한 건 이벤트 이름과 의미가 고정된 것**

---

## 🔟 이 이벤트들로 바로 답 나오는 질문들

### 이 설계로 바로 답 나오는 질문 👇

1. **QR이 실제로 퍼지고 있는가?**
   → `qr_entered` 이벤트 수

2. **어떤 QR이 가입을 만든다?**
   → `qr_entered` → `signup_completed` 연결 분석

3. **게스트는 어디서 가장 많이 막히는가?**
   → `auth_required` 액션별 분포

4. **가입 후 복귀 UX는 제대로 동작하는가?**
   → `post_signup_resumed` / `signup_completed` 비율

5. **가입만 하고 행동 안 하는 비율은?**
   → `signup_completed` / `member_action` 비율

👉 **이 질문들에 답 못 하면, 데이터는 의미 없다**

---

## 1️⃣1️⃣ 절대 하지 말아야 할 로그 설계

- ❌ 클릭마다 이벤트
- ❌ 스크롤 이벤트
- ❌ 버튼 노출 이벤트
- ❌ 페이지뷰 남발

→ 데이터만 쌓이고, 판단은 못 한다

---

## ✅ STEP 6 완료 체크

이 질문에 YES면 끝:

1. **"QR → 가입 → 행동까지 숫자로 연결되는가?"**
   → ✅ 7개 이벤트로 전체 플로우 추적

2. **"Lazy Signup이 성공했는지 실패했는지 보이는가?"**
   → ✅ `post_signup_resumed` 이벤트

3. **"이 데이터로 다음 기능 우선순위를 정할 수 있는가?"**
   → ✅ 의도 중심 이벤트 설계

---

## 구현 파일

- `src/lib/growthEvents.ts` - 이벤트 타입 정의 및 추적 함수

---

## 🧠 전체 천재 모드 요약 (한 번에)

- QR = 바이럴 입구
- 게스트 = 가치 경험
- Lazy Signup = 전환 장치
- 복귀 UX = 품질 핵심
- 이벤트 = 판단 도구

👉 **중고 마켓에 최적화된 성장형 구조 완성**

