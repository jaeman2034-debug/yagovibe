# 🏁 F 단계 — 거래 라이프사이클 설계도 (한 장 요약)

> **A~E 단계 전체를 한 장으로 요약**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 핵심 원칙 (한 줄)

**거래는 '채팅'이 아니라 '상품 제안'에 귀속된다**

---

## 🧱 데이터 모델 (전체)

### 1️⃣ Chat (관계)

```typescript
chat {
  id: string
  participants: [uidA, uidB]
  productId?: string
  dealStatus?: "CHAT" | "OFFERED" | "RESERVED" | "COMPLETED" | "CANCELLED"
}
```

### 2️⃣ Message (이벤트)

```typescript
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "product" | "system_status"
  productId?: string
  text?: string
  url?: string
  deletedForUserIds?: string[]  // 증거 보관용
  createdAt: Timestamp
}
```

### 3️⃣ Deal (거래) ⭐ 핵심

```typescript
deal {
  id: string
  chatId: string
  productId: string
  sellerId: string
  buyerId: string
  status: "proposed" | "completed" | "cancelled"
  completedAt?: Timestamp
  cancelledAt?: Timestamp
  cancelledBy?: string
  createdAt: Timestamp
}
```

### 4️⃣ Review (후기)

```typescript
review {
  id: string
  dealId: string        // ⭐ 거래에 귀속
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  createdAt: Timestamp
}
```

### 5️⃣ User (신뢰 지표)

```typescript
user {
  uid: string
  averageRating?: number      // 계산 필드
  totalReviews?: number        // 계산 필드
  recentRating?: number        // 최근 30일 가중치
  trustLevel: "NEW" | "RISING" | "TRUSTED" | "VERIFIED"
  systemRestrictions?: {
    exposureReduced: boolean
    newDealLimited: boolean
  }
}
```

---

## 🔄 거래 라이프사이클 (전체 플로우)

```
1. 상품 카드 메시지 전송
   ↓
2. deal 생성 (status: "proposed")
   ↓
3. 판매자가 "거래 완료" 버튼 클릭
   ↓
4. deal.status = "completed"
   ↓
5-A. 거래 완료 전 취소 가능
   ↓
5-B. 거래 완료 후 취소 불가 (분쟁으로 처리)
   ↓
6. 후기 작성 가능 (dealId로 귀속)
   ↓
7. 신뢰 지표 계산 (평점, 거래 수 등)
   ↓
8. 분쟁 발생 시 (신고/차단/후기)
   ↓
9. 시스템 자동 제약 또는 운영자 개입
```

---

## 🧩 UX 흐름 (핵심만)

### 거래 완료 전

- [거래 취소] 버튼 표시
- 양쪽 모두 취소 가능
- 취소 시 deal.status = "cancelled"

### 거래 완료 후

- 취소 버튼 ❌
- 환불 버튼 ❌
- 대신: 신고 / 차단 / 후기
- 채팅은 유지 (상단에 "거래 완료됨" 배지)

### 후기 작성

- 거래 완료 후 CTA: "이번 거래는 어떠셨나요?"
- 평점 필수, 코멘트 옵션
- 한 거래당 1회
- 본인에게는 불가

### 분쟁 처리

- 신고 / 차단 / 후기만 제공
- "분쟁 요청" 버튼 ❌
- 채팅 메시지는 증거 (삭제 ❌, 숨김 ⭕)

---

## 🔐 권한 설계 (전체)

| 액션 | 권한 | 조건 |
|------|------|------|
| 거래 완료 | 판매자만 | `user.uid === product.ownerId` |
| 거래 취소 | 양쪽 모두 | `deal.status === "proposed"` |
| 후기 작성 | 구매자/판매자 | `!hasUserReviewed && deal.status === "completed"` |
| 신고 | 양쪽 모두 | 항상 가능 |
| 차단 | 양쪽 모두 | 항상 가능 |

---

## 🧠 핵심 설계 포인트 (요약)

### 1️⃣ 거래는 상품에 귀속

- deal.productId 필수
- 한 채팅에서 여러 거래 가능

### 2️⃣ 후기는 거래에 귀속

- review.dealId 필수
- 사용자 평점은 계산 결과물

### 3️⃣ 채팅은 관계 유지

- 거래 완료 후에도 채팅 유지
- 새 상품 제안 가능

### 4️⃣ 취소는 신뢰 제어 장치

- 거래 완료 전만 가능
- 자주 취소하면 노출 ↓

### 5️⃣ 운영 개입은 최후 수단

- 사용자 주도 → 시스템 개입 → 운영자 개입
- 증거 기반 판단

---

## 📊 책임 경계선

| 항목 | 플랫폼 책임 |
|------|------------|
| 채팅 제공 | ⭕ |
| 거래 기록 | ⭕ |
| 이미지/증거 보관 | ⭕ |
| 금전 환불 | ❌ |
| 거래 결과 보장 | ❌ |

---

## 🎯 최종 상태

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

