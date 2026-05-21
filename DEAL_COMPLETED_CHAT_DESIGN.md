# 🧠 B 단계 — 거래 완료 후 채팅을 닫을까, 유지할까?

> **결론: 채팅은 닫지 않는다. 다만 "거래가 끝났음"은 명확히 표시한다.**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 결론 (명확)

**채팅은 닫지 않는다.**

**다만 "거래가 끝났음"은 명확히 표시한다.**

👉 **유지 ⭕ / 방치 ❌ / 종료 ❌**

---

## ❌ 채팅을 닫아버리면 생기는 문제

### 거래 후 사용자 시나리오

1. **"연락 좀 더 하고 싶은데…"**
   - 채팅이 닫히면 → 막힘
   - 후속 문의 불가

2. **"물건 문제 생겼는데…"**
   - 채팅이 닫히면 → 막힘
   - 분쟁 해결 경로 차단

3. **"후기 남기려고 다시 들어왔는데…"**
   - 채팅이 닫히면 → 막힘
   - 후기 작성률 하락

### 결과

- 고객센터 문의 폭증
- 분쟁 증가
- 후기 작성률 하락

---

## ❌ 계속 열어만 두는 것도 아님

### 그냥 열어두면 생기는 문제

1. **"이 채팅 아직 유효한 건가?"**
   - 맥락 상실
   - 혼란 증가

2. **"또 거래하자는 건가?"**
   - 의도 불명확
   - 오해 발생

3. **"메시지 보내도 되나?"**
   - 불안감 증가
   - 소통 위축

---

## ✅ 정답 UX 패턴 (실서비스급)

### 1️⃣ 채팅 상단에 "거래 완료 배지"

```typescript
// 채팅 상단 고정 배지
{dealStatus === "completed" && (
  <div className="fixed top-0 left-0 right-0 bg-green-50 border-b border-green-200 z-50">
    <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
      <span className="text-green-600">✅</span>
      <span className="text-sm font-medium text-green-800">
        거래 완료됨
      </span>
      <span className="text-xs text-green-600">
        이 상품의 거래는 종료되었습니다
      </span>
    </div>
  </div>
)}
```

**특징:**
- 상단 고정
- 스크롤해도 유지
- 명확한 상태 표시

### 2️⃣ 입력창은 살짝 제한

```typescript
// 입력창 위 안내 메시지
{dealStatus === "completed" && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-sm text-blue-800">
    <p className="mb-1">
      거래가 완료되었습니다.
    </p>
    <p>
      추가 문의가 있다면 메시지를 남겨주세요.
    </p>
  </div>
)}
```

**원칙:**
- 기본 입력 ⭕
- 하지만 CTA는 다름
- "다시 거래하자" 느낌 ❌
- "후속 커뮤니케이션" 느낌 ⭕

### 3️⃣ 새 상품 제안은 여전히 가능

```typescript
// 상품 카드 메시지 전송은 여전히 가능
const sendProductMessage = async (productId: string) => {
  // 거래 완료 후에도 새 상품 제안 가능
  await addDoc(collection(db, `chats/${id}/messages`), {
    type: "product",
    productId,
    // ... 기타 필드
  });
  
  // 새 deal 생성 가능
  await createDeal(id, productId, sellerId, buyerId);
};
```

**핵심:**
- 상품 카드 메시지 전송 ⭕
- 새로운 deal 생성 ⭕
- 사람 간 관계는 유지

---

## 🧠 천재 포인트 하나

### 거래 완료 = "상태"  
### 채팅 = "관계"

**이 둘을 섞지 않는 게 핵심이다.**

- 거래 완료는 **상태** (deal.status = "completed")
- 채팅은 **관계** (사람 간 소통 채널)
- 상태가 바뀌어도 관계는 유지

---

## 🔐 권한 & 악용 방지

### 거래 완료 후 제한

1. **자동 메시지 폭탄 ❌**
   - 알림 빈도 제한
   - 스팸 방지

2. **스팸 ❌**
   - 상대가 차단하면 즉시 차단
   - (이미 네 구조에 있음)

### 구현

```typescript
// 메시지 전송 시 체크
const sendMessage = async (text: string) => {
  // 거래 완료 후에도 메시지 전송 가능
  // 단, 스팸 방지 로직 적용
  
  // 알림 빈도 제한 (예: 1분에 1회)
  const lastMessageTime = getLastMessageTime();
  if (Date.now() - lastMessageTime < 60000) {
    setToastMessage("메시지를 너무 자주 보낼 수 없습니다.");
    return;
  }
  
  // 메시지 전송
  await addDoc(collection(db, `chats/${id}/messages`), {
    text,
    // ... 기타 필드
  });
};
```

---

## 📊 UI 컴포넌트 설계

### 1️⃣ 거래 완료 배지 (상단 고정)

```typescript
// ChatRoom 컴포넌트 상단
{dealStatus === "completed" && (
  <div 
    className="fixed top-0 left-0 right-0 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 z-50"
    style={{ top: HEADER_HEIGHT }}
  >
    <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
      <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
      <span className="text-sm font-medium text-green-800 dark:text-green-200">
        거래 완료됨
      </span>
      <span className="text-xs text-green-600 dark:text-green-400">
        이 상품의 거래는 종료되었습니다
      </span>
    </div>
  </div>
)}
```

### 2️⃣ 입력창 안내 메시지

```typescript
// ChatInput 위에 표시
{dealStatus === "completed" && (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2 text-sm animate-fadeIn">
    <p className="text-blue-800 dark:text-blue-200 mb-1 font-medium">
      거래가 완료되었습니다.
    </p>
    <p className="text-blue-600 dark:text-blue-400">
      추가 문의가 있다면 메시지를 남겨주세요.
    </p>
  </div>
)}
```

### 3️⃣ 상품 카드 내 거래 완료 표시

```typescript
// ChatBubble 또는 ProductCard 컴포넌트 내부
{message.type === "product" && dealStatus === "completed" && (
  <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-sm text-green-800 dark:text-green-200">
    ✅ 이 상품의 거래가 완료되었습니다
  </div>
)}
```

---

## 🔄 전체 플로우

### 거래 완료 → 채팅 유지 → 후속 커뮤니케이션

```
1. 판매자가 "거래 완료" 버튼 클릭
   ↓
2. deal 생성 (status: "completed")
   ↓
3. 채팅 상단에 "거래 완료됨" 배지 표시
   ↓
4. 상품 카드에 "거래 완료됨" 표시
   ↓
5. 입력창 위에 안내 메시지 표시
   ↓
6. 채팅은 계속 열려있음 (메시지 전송 가능)
   ↓
7. 새 상품 제안도 가능 (새 deal 생성)
   ↓
8. 후기 작성 가능
   ↓
9. 후속 문의 가능
```

---

## 📌 여기까지 왔을 때 상태

### ✅ 완료된 설계

- [x] 거래 종료 UX 명확 (배지, 안내 메시지)
- [x] 분쟁/후기 경로 열려 있음 (채팅 유지)
- [x] 재거래 확장 가능 (새 상품 제안 가능)

### 🎯 이제 진짜 플랫폼 형태다

👉 **거래 완료 = 상태, 채팅 = 관계**  
👉 **이 둘을 분리해서 설계했다.**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

