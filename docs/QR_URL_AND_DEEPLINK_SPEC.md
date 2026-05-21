# 🔒 QR URL 규칙 & 딥링크 스펙 (STEP 2 LOCK)

## 목표

**QR 하나로 어디서든 '보고 싶은 화면'으로 바로 들어가게 만든다.**
(가입 ❌ / 설명 ❌ / 선택 ❌)

---

## 1️⃣ QR URL의 기본 원칙 (절대 규칙)

- QR URL은 반드시 **의도 하나만** 담는다
- ❌ 여러 파라미터 섞기
- ❌ 상태 판단 로직 넣기
- ⭕ **"어디로 갈지"만 명확**

---

## 2️⃣ QR URL 표준 포맷 (고정)

```
/qr?<type>=<id>
```

- `/qr` → 모든 QR 진입의 단일 엔트리
- `<type>` → 목적
- `<id>` → 리소스 식별자

---

## 3️⃣ 지원하는 QR 타입 (초기 LOCK)

| 목적 | URL 예시 | 진입 화면 |
|------|----------|-----------|
| 마켓 홈 | `/qr?market=home` | 중고 마켓 홈 |
| 상품 공유 | `/qr?item=ITEM_ID` | 상품 상세 |
| 채팅 공유 | `/qr?chat=CHAT_ID` | 채팅방 |
| 사용자 상점 | `/qr?seller=USER_ID` | 판매자 프로필 |

👉 **초기에는 이 4개만**
(늘릴 수는 있어도 줄이지 않는다)

---

## 4️⃣ QR 진입 처리 공통 로직

QR 엔트리 페이지의 책임은 딱 3가지:

1. QR 의도 해석
2. 게스트 상태 허용
3. 목적 화면으로 즉시 이동

### 의사 코드 (프론트 기준)

```typescript
function handleQrEntry(query) {
  if (query.market === "home") {
    redirect("/market");
    return;
  }

  if (query.item) {
    redirect(`/item/${query.item}`);
    return;
  }

  if (query.chat) {
    redirect(`/chat/${query.chat}`);
    return;
  }

  if (query.seller) {
    redirect(`/seller/${query.seller}`);
    return;
  }

  // fallback
  redirect("/market");
}
```

### ❗ 여기서 절대 하지 말 것

- 로그인 체크 ❌
- 가입 체크 ❌
- 권한 체크 ❌

---

## 5️⃣ 게스트 접근 허용 기준 (QR 핵심 철학)

**QR 진입 = 무조건 게스트 허용**

- 화면 접근 ⭕
- 데이터 읽기 ⭕
- 행동은 나중에 차단 ⭕

**QR 단계에서는 아무 것도 묻지 않는다.**

---

## 6️⃣ QR 이후 "행동 → Lazy Signup" 연결

- QR은 진입만 담당
- 가입은 행동 시점에서만 발생

### 예시 흐름

```
QR → 상품 상세 (GUEST)
   → 채팅 보내기 클릭
     → Lazy Signup 모달
       → 가입
         → 원래 채팅 화면 복귀
```

👉 **QR 로직과 가입 로직은 완전히 분리**

---

## 7️⃣ QR URL 설계에서 절대 금지 사항

- ❌ `/qr?item=123&invite=abc`
- ❌ `/qr/signup?item=123`
- ❌ `/qr?auth=required`

**QR은 "보여주기 전용"이다.**

---

## 8️⃣ 분석/성장 관점에서의 QR 확장성

### 이 설계의 장점:

- QR 타입별 전환 분석 가능
- 어떤 QR이 가입을 유도했는지 추적 가능
- 오프라인/온라인 바이럴 모두 대응

### 추후 확장 예

```
/qr?item=123&utm=poster_gym
/qr?chat=abc&utm=friend_share
```

(※ 초기엔 분석 파라미터 안 써도 됨)

---

## 9️⃣ 구현 파일

- `src/lib/qrRouter.ts` - QR URL 파싱 및 경로 변환 로직
- `src/pages/qr/QRMarketEntryPage.tsx` - QR 진입 페이지 (중고 마켓용)

---

## ✅ STEP 2 완료 체크

이 질문에 YES면 끝:

1. **"QR 하나로 바로 원하는 화면에 갈 수 있는가?"**
   → ✅ `handleQREntry()` 함수

2. **"QR 단계에서 가입/로그인 생각이 전혀 안 드는가?"**
   → ✅ QR 진입 페이지는 단순 리다이렉트만

3. **"QR 로직이 가입 로직과 완전히 분리돼 있는가?"**
   → ✅ QR 로직 (`qrRouter.ts`)과 가입 로직 (`userState.ts`) 완전 분리

---

## 다음 단계

👉 **STEP 3 — API 권한 설계 (게스트 vs 회원)**

