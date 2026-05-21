# 🧠 E 단계 — 거래 취소 / 환불은 어디까지 허용할까?

> **거래 라이프사이클 설계 완성**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 핵심 질문

**플랫폼이 "거래의 결과"까지 책임져야 할까?**

### 정답은

**❌ 직접 책임지지 않는다.**  
**⭕ 하지만 '취소의 흔적'은 관리한다.**

### ❌ 잘못된 설계 2가지

#### 1️⃣ 무제한 취소

**언제든 취소, 사유 없음**

**결과:**
- 장난 거래
- 신뢰 붕괴
- 판매자 이탈

#### 2️⃣ 플랫폼 환불 개입

**"환불 요청" 버튼, 운영자 판단으로 환불**

**결과:**
- 법적 책임
- CS 폭증
- 결제 구조 복잡

---

## ❌ 흔한 오답

### 1️⃣ 무제한 취소

**문제:**
- 악용 가능성
- 신뢰도 하락
- 운영 복잡도 증가

### 2️⃣ 취소 불가

**문제:**
- 사용자 불만
- 분쟁 증가
- 법적 리스크

### 3️⃣ 운영자 개입 필수

**문제:**
- 운영 비용 폭증
- 처리 지연
- 확장 불가능

---

## ✅ 정답 구조 — 상태 기반 취소

### 🔹 거래(Deal) 상태 모델

```typescript
deal {
  id: string
  status: "proposed" | "completed" | "cancelled"
  // proposed: 제안됨
  // completed: 거래 완료
  // cancelled: 취소
}
```

### 🧱 취소 가능 구간 (중요)

#### ✅ 1️⃣ 거래 완료 전

**판매자 / 구매자 모두 취소 가능**

**버튼 명확히 제공: [거래 취소]**

```typescript
if (deal.status === "proposed") {
  allowCancel = true;
}
```

#### ❌ 2️⃣ 거래 완료 후

**취소 버튼 ❌**  
**환불 버튼 ❌**

**대신:**
- 신고
- 후기
- 차단

**👉 분쟁은 '거래 취소'로 해결하지 않는다**

---

## 🧱 데이터 모델

### Deal 상태 확장

```typescript
// deals 컬렉션
deal {
  id: string
  chatId: string
  productId: string
  sellerId: string
  buyerId: string
  status: "proposed" | "reserved" | "completed" | "cancelled"
  cancelledAt?: Timestamp
  cancelledBy?: string      // 취소한 사람 (sellerId 또는 buyerId)
  cancelReason?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}
```

---

## 🧩 UX 흐름

### 1️⃣ 거래 완료 전 취소

```typescript
// 거래 상태가 "proposed"일 때만 취소 가능
{dealStatus === "proposed" && (
  <button
    onClick={() => setShowCancelModal(true)}
    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 active:scale-[0.96] transition-all"
  >
    거래 취소
  </button>
)}
```

**취소 확인 모달 (현실적인 표현):**

```typescript
<Modal>
  <h2>정말 거래를 취소하시겠습니까?</h2>
  <p className="text-sm text-gray-600 mb-4">
    상대방에게 취소 사실이 전달됩니다.
  </p>
  
  {/* 사유 입력 ❌ (초기엔) */}
  {/* 즉시 상태 변경 ⭕ */}
  
  <div className="flex gap-3">
    <button
      onClick={() => setShowCancelModal(false)}
      className="flex-1 py-2 border rounded-lg"
    >
      돌아가기
    </button>
    <button
      onClick={confirmCancel}
      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      취소하기
    </button>
  </div>
</Modal>
```

### 2️⃣ 거래 완료 후 취소 불가

```typescript
// 거래 완료 후에는 취소 버튼 없음
{dealStatus === "completed" && (
  <div className="text-sm text-gray-500">
    거래가 완료되었습니다. 취소할 수 없습니다.
    문제가 있으시면 신고해주세요.
  </div>
)}
```

---

## 🔐 취소 처리 로직

### 취소 실행

```typescript
const handleCancelDeal = async () => {
  if (!dealId || !user || !cancelReason) return;
  
  // 거래 완료 전인지 확인
  const deal = await getDoc(doc(db, "deals", dealId));
  const dealData = deal.data();
  
  if (dealData.status === "completed") {
    setToastMessage("완료된 거래는 취소할 수 없습니다.");
    return;
  }
  
  // 취소 처리
  await updateDoc(doc(db, "deals", dealId), {
    status: "cancelled",
    cancelledBy: user.uid,
    cancelReason: cancelReason,
    cancelledAt: serverTimestamp(),
  });
  
  // 채팅에 시스템 메시지 추가
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    uid: "system",
    senderId: "system",
    text: `⚠️ 거래가 취소되었습니다. (이유: ${cancelReason})`,
    type: "system_status",
    createdAt: serverTimestamp(),
  });
  
  // 채팅 상태 업데이트
  await updateDoc(doc(db, "chats", chatId), {
    dealStatus: "CANCELLED",
  });
  
  setToastMessage("거래가 취소되었습니다.");
};
```

---

## 🧠 시간 제한 설계

### 거래 완료 후 취소 불가

```typescript
// 거래 완료 후 취소 불가 (시간 제한 없음)
const canCancelDeal = (deal: Deal) => {
  // 거래 완료 전만 취소 가능
  return deal.status !== "completed";
};
```

**이유:**
- 거래 완료 = 책임 전이 완료
- 완료 후 취소는 분쟁으로 처리

---

## 🔐 책임 소재

### 취소 책임

**거래 완료 전:**
- 취소한 사람의 책임 (이유 기록)
- 상대방에게 알림

**거래 완료 후:**
- 취소 불가
- 문제 발생 시 분쟁으로 처리

---

## 📊 UI 컴포넌트

### 거래 취소 버튼

```typescript
// 거래 완료 전에만 표시
{dealStatus !== "completed" && dealStatus !== "cancelled" && (
  <button
    onClick={() => setShowCancelModal(true)}
    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 active:scale-[0.96] transition-all"
  >
    거래 취소
  </button>
)}
```

### 취소된 거래 표시

```typescript
// 취소된 거래 표시
{dealStatus === "cancelled" && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
    <p className="text-sm text-red-800">
      ⚠️ 이 거래는 취소되었습니다.
    </p>
    {deal.cancelReason && (
      <p className="text-xs text-red-600 mt-1">
        이유: {deal.cancelReason}
      </p>
    )}
  </div>
)}
```

---

## 🧠 천재 포인트 하나

### 취소는 기능이 아니라 "신뢰 제어 장치"다

**그래서:**
- 자주 취소하는 유저
- 거래 성사율 ↓
- 노출 ↓ (시스템 레벨)

**❌ 사용자에게 직접 말하지 않음**  
**⭕ 시스템 내부 지표로만 사용**

```typescript
// 취소 빈도 추적 (내부 지표)
const trackCancelFrequency = async (userId: string) => {
  const cancelledDeals = await getDocs(
    query(
      collection(db, "deals"),
      where("cancelledBy", "==", userId),
      where("cancelledAt", ">", thirtyDaysAgo)
    )
  );
  
  const cancelRate = cancelledDeals.size / totalDeals;
  
  // 취소율이 높으면 노출 순위 낮춤 (내부 처리)
  if (cancelRate > 0.3) {
    await updateDoc(doc(db, "users", userId), {
      systemRestrictions: {
        exposureReduced: true, // 노출 ↓
        reason: "high_cancel_rate",
      },
    });
  }
};
```

### 1️⃣ 거래 완료 후 취소 불가

**완료 = 책임 전이 완료**

**이유:**
- 완료 후 취소는 분쟁으로 처리
- 운영 개입 최소화

### 2️⃣ 환불은 플랫폼 범위 밖

**환불은 사용자 간 직접 처리**

**이유:**
- 법적 리스크 최소화
- 운영 복잡도 감소
- 플랫폼은 중개만

---

## 🔐 책임 경계선 (아주 중요)

| 항목 | 플랫폼 책임 |
|------|------------|
| 채팅 제공 | ⭕ |
| 거래 기록 | ⭕ |
| 이미지/증거 보관 | ⭕ |
| 금전 환불 | ❌ |
| 거래 결과 보장 | ❌ |

👉 **이 선 넘으면 법적 플랫폼이 된다.**

---

## 📌 여기까지 왔을 때 최종 판정

### ✅ 완료된 설계

- [x] 거래 생성 ✅
- [x] 거래 완료 ✅
- [x] 거래 취소 ✅
- [x] 후기 귀속 ✅
- [x] 분쟁 처리 경로 ✅

### 🎯 이제 이 앱은

👉 **거래 라이프사이클 완전 닫힘**

**단순 중고채팅 ❌**  
**거래 플랫폼 ⭕**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

