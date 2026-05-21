# 🗣️ O 단계 — 출시 공지 & 인앱 가이드 (필수 최소본)

> **기능이 아니라 기대치 관리. 잘 쓰면 CS 반으로 줄인다**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 목표

- "플랫폼이 해주는 것 / 안 해주는 것"을 명확히
- 오해로 생기는 분쟁·문의 차단

---

## 1️⃣ 출시 공지 (짧고 단단하게)

### 제목

```
채팅으로 안전하게 거래하세요
```

### 본문

```
이제 채팅 안에서 상품을 제안하고 거래 완료 여부를 남길 수 있어요.

거래 완료 후에도 대화는 계속할 수 있으며,
문제 발생 시 신고·차단으로 스스로 보호할 수 있습니다.

※ 금전 결제·환불은 당사에서 직접 처리하지 않습니다.
```

**핵심:**
- ✔ 핵심만
- ✔ 책임 경계 명확

---

## 2️⃣ 채팅 화면 인앱 가이드 (툴팁 3개면 충분)

### 🧩 가이드 ① 상품 제안

**문구:**
```
대화 중 상품을 제안해 보세요.
여러 상품을 제안할 수 있어요.
```

**노출 시점:** 첫 상품 카드 전송 전 1회

**구현:**
```typescript
// 첫 상품 제안 전에만 표시
{!hasShownProductGuide && !hasSentProduct && (
  <Tooltip
    message="대화 중 상품을 제안해 보세요. 여러 상품을 제안할 수 있어요."
    onClose={() => setHasShownProductGuide(true)}
  />
)}
```

---

### 🧩 가이드 ② 거래 완료

**문구:**
```
판매자만 거래 완료를 표시할 수 있어요.
```

**노출 시점:** 상품 카드 첫 노출 시

**구현:**
```typescript
// 상품 카드 첫 노출 시
{isFirstProductCard && isSeller && (
  <Tooltip
    message="판매자만 거래 완료를 표시할 수 있어요."
    onClose={() => setHasShownCompleteGuide(true)}
  />
)}
```

---

### 🧩 가이드 ③ 거래 후

**문구:**
```
거래가 완료되어도 대화는 계속할 수 있어요.
후기는 선택 사항입니다.
```

**노출 시점:** 첫 거래 완료 후

**구현:**
```typescript
// 첫 거래 완료 후
{isFirstCompletedDeal && (
  <Tooltip
    message="거래가 완료되어도 대화는 계속할 수 있어요. 후기는 선택 사항입니다."
    onClose={() => setHasShownPostDealGuide(true)}
  />
)}
```

---

## 3️⃣ 신고/차단 가이드 (분쟁 예방 핵심)

### 메뉴 하단 설명

**문구:**
```
문제가 발생하면 신고하거나 차단할 수 있습니다.
차단 시 더 이상 메시지를 주고받을 수 없습니다.
```

**위치:** 3-dot 메뉴 하단

**구현:**
```typescript
<div className="menu-footer">
  <p className="text-xs text-gray-500">
    문제가 발생하면 신고하거나 차단할 수 있습니다.
    차단 시 더 이상 메시지를 주고받을 수 없습니다.
  </p>
</div>
```

**원칙:**
- ❌ "운영자가 해결해드립니다" 같은 표현
- ⭕ "스스로 보호할 수 있습니다"

---

## 4️⃣ FAQ 최소 4문장 (CS 방패)

### Q1. 환불은 어떻게 하나요?

**A:**
```
거래는 사용자 간에 이루어지며, 환불은 당사에서 직접 처리하지 않습니다.
```

**이유:**
- 책임 경계 명확
- 법적 리스크 방지

---

### Q2. 거래 완료 후 취소할 수 있나요?

**A:**
```
거래 완료 전에는 취소할 수 있으며, 완료 후에는 신고/후기를 이용해주세요.
```

**이유:**
- 취소 가능 구간 명확
- 완료 후 대안 제시

---

### Q3. 여러 상품을 한 채팅에서 거래할 수 있나요?

**A:**
```
네, 가능합니다. 상품별로 거래가 구분됩니다.
```

**이유:**
- 핵심 기능 설명
- 혼란 방지

---

### Q4. 후기는 꼭 남겨야 하나요?

**A:**
```
선택 사항입니다.
```

**이유:**
- 강요하지 않음
- 기대치 관리

---

## 🧠 천재 포인트 하나

### 문구는 기능을 설명하는 게 아니라 '기대를 고정'하는 도구다

**이 문구들 덕분에:**
- "왜 안 되죠?" ↓
- "이건 누가 해주나요?" ↓
- 운영 개입 요청 ↓

---

## 📋 인앱 가이드 구현 가이드

### Tooltip 컴포넌트

```typescript
interface TooltipProps {
  message: string;
  onClose: () => void;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  message,
  onClose,
  position = "bottom",
}) => {
  return (
    <div className={`tooltip tooltip-${position}`}>
      <div className="tooltip-content">
        <p>{message}</p>
        <button onClick={onClose} className="tooltip-close">
          확인
        </button>
      </div>
    </div>
  );
};
```

### 가이드 표시 상태 관리

```typescript
// 사용자별 가이드 표시 여부 저장
const userGuides = {
  productGuide: false,    // 첫 상품 제안 전
  completeGuide: false,  // 상품 카드 첫 노출
  postDealGuide: false,   // 첫 거래 완료 후
};

// localStorage 또는 Firestore에 저장
localStorage.setItem('userGuides', JSON.stringify(userGuides));
```

---

## 📱 공지사항 UI

### 공지사항 컴포넌트

```typescript
const AnnouncementBanner = () => {
  return (
    <div className="announcement-banner bg-blue-50 border-b border-blue-200">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              채팅으로 안전하게 거래하세요
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              이제 채팅 안에서 상품을 제안하고 거래 완료 여부를 남길 수 있어요.
              거래 완료 후에도 대화는 계속할 수 있으며,
              문제 발생 시 신고·차단으로 스스로 보호할 수 있습니다.
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ※ 금전 결제·환불은 당사에서 직접 처리하지 않습니다.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎨 문구 톤 가이드

### ✅ 좋은 예

- "스스로 보호할 수 있습니다"
- "선택 사항입니다"
- "당사에서 직접 처리하지 않습니다"

### ❌ 나쁜 예

- "운영자가 해결해드립니다"
- "꼭 남겨주세요"
- "환불은 저희가 처리합니다"

---

## 📌 체크리스트

### 출시 전 확인

- [ ] 출시 공지 문구 확인
- [ ] 인앱 가이드 3개 구현
- [ ] 신고/차단 가이드 문구 확인
- [ ] FAQ 4문장 확인
- [ ] 문구 톤 일관성 확인

---

## 🏁 다음 선택

### P → QA 체크리스트 최종본 (출시 직전)

**포함 내용:**
- 기능별 테스트 케이스
- 시나리오 테스트
- 회귀 테스트

### I → 여기서 멈추고 구현 & 배포

**이유:**
- 출시 공지 완료 ✅
- 가이드 문구 완료 ✅
- FAQ 완료 ✅
- 바로 사용 가능 ✅

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

