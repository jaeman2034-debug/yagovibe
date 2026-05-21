# 🧩 X 단계 — 매칭 서비스 MVP (구체 설계)

> **대화 중 '세션 제안 → 확정 → 평가'가 남는 매칭**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 한 줄 목표

**대화 중 '세션 제안 → 확정 → 평가'가 남는 매칭**

**중고거래에서 바뀐 건 상품 → 세션뿐, 뼈대는 그대로다.**

---

## Ⅰ. 도메인 매핑 (그대로 재사용)

| 기존 | 매칭 |
|------|------|
| Chat | 멘토–멘티 대화 |
| Message.product | 세션 제안 카드 |
| Deal | 세션 확정 |
| Review | 세션 만족도 평점 |

---

## Ⅱ. 데이터 모델 (차이점만)

### 1️⃣ 세션 제안 메시지

```typescript
// Message (맥락)
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "session" | "system_status"
  session?: {
    topic: string
    durationMin: number
    price?: number      // MVP에선 옵션
    proposedAt: Timestamp
  }
  text?: string
  createdAt: Timestamp
}
```

---

### 2️⃣ Deal → SessionDeal

```typescript
// SessionDeal (결정)
sessionDeal {
  id: string
  chatId: string
  mentorId: string
  menteeId: string
  status: "proposed" | "confirmed" | "cancelled" | "completed"
  topic: string
  durationMin: number
  scheduledAt?: Timestamp
  confirmedAt?: Timestamp
  completedAt?: Timestamp
  cancelledAt?: Timestamp
  cancelledBy?: string
  createdAt: Timestamp
}
```

---

### 3️⃣ Review (신뢰)

```typescript
// Review (신뢰)
review {
  id: string
  sessionDealId: string  // 세션 확정에 귀속
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string  // MVP에선 숨김
  createdAt: Timestamp
}
```

---

## Ⅲ. UX 흐름 (현실적)

### 1. 대화 중 제안

**세션 제안 카드:**

```typescript
// 세션 제안 메시지
{message.type === "session" && (
  <SessionCard session={message.session}>
    <div className="session-info">
      <h3>세션 제안</h3>
      <p>주제: {message.session.topic}</p>
      <p>시간: {message.session.durationMin}분</p>
      {message.session.price && (
        <p>가격: {message.session.price}원</p>
      )}
    </div>
    
    {/* 멘토만 확정 버튼 표시 */}
    {isMentor && sessionDealStatus === "proposed" && (
      <button onClick={() => confirmSession(sessionDealId)}>
        세션 확정
      </button>
    )}
  </SessionCard>
)}
```

---

### 2. 멘토 확정

**멘토만 [세션 확정]**

```typescript
const confirmSession = async (sessionDealId: string) => {
  const sessionDeal = await getDoc(doc(db, "sessionDeals", sessionDealId));
  
  // 권한 체크: 멘토만 가능
  if (sessionDeal.data()?.mentorId !== auth.currentUser.uid) {
    throw new Error("Only mentor can confirm session");
  }
  
  // 상태 변경
  await updateDoc(doc(db, "sessionDeals", sessionDealId), {
    status: "confirmed",
    confirmedAt: serverTimestamp(),
  });
  
  // 시스템 메시지 추가
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    type: "system_status",
    text: "✅ 세션이 확정되었습니다",
    sessionDealId,
    createdAt: serverTimestamp(),
  });
};
```

---

### 3. 확정 시 시스템 메시지

**자동 삽입:**

```typescript
// 세션 확정 시 시스템 메시지
✅ 세션이 확정되었습니다
주제: {topic}
시간: {durationMin}분
```

---

### 4. 세션 이후

**세션 완료 표시:**

```typescript
// 세션 완료 후
{sessionDealStatus === "completed" && (
  <div className="session-completed">
    <p>✅ 세션이 완료되었습니다</p>
    
    {/* 하단 CTA: 평점 남기기 (선택) */}
    {!hasUserReviewed && (
      <div className="review-cta">
        <p>이번 세션은 어떠셨나요?</p>
        <button onClick={() => setShowReviewModal(true)}>
          평점 남기기
        </button>
      </div>
    )}
  </div>
)}
```

---

## Ⅳ. 권한 & 안전

### 세션 확정: 멘토만

```typescript
// 권한 체크
const canConfirmSession = (sessionDeal: SessionDeal, userId: string) => {
  return sessionDeal.mentorId === userId;
};
```

---

### 취소: 확정 전만

```typescript
// 취소 가능 조건
const canCancelSession = (sessionDeal: SessionDeal) => {
  return sessionDeal.status === "proposed";
};
```

---

### 완료 후: 취소 ❌ → 신고/후기 ⭕

```typescript
// 완료 후 취소 불가
{sessionDealStatus === "completed" && (
  <div>
    <p>세션이 완료되었습니다. 취소할 수 없습니다.</p>
    <p>문제가 있으시면 신고하거나 후기를 남겨주세요.</p>
  </div>
)}
```

---

## Ⅴ. MVP 컷 (과감)

### KEEP

- [ ] 제안/확정/평점
- [ ] 채팅 유지
- [ ] 차단/신고

---

### CUT

- [ ] 캘린더 연동 ❌
- [ ] 결제 ❌
- [ ] 텍스트 후기 공개 ❌

**이유:**
- 캘린더: 복잡도 증가, 필수 아님
- 결제: 법적 리스크, MVP에선 불필요
- 텍스트 후기: 분쟁 리스크, 평점만으로 충분

---

## Ⅵ. 성공 지표 (30일)

### 1. 세션 확정률 ≥ 15%

**정의:**
```
세션 확정률 = confirmed / proposed
```

**체크:**
- [ ] 세션 제안 수
- [ ] 세션 확정 수
- [ ] 확정률 계산

---

### 2. 평점 작성률 ≥ 30%

**정의:**
```
평점 작성률 = review.created / sessionDeal.completed
```

**체크:**
- [ ] 완료된 세션 수
- [ ] 후기 작성 수
- [ ] 작성률 계산

---

### 3. 7일 재방문 ≥ 20%

**정의:**
```
7일 재방문율 = 첫 세션 후 7일 내 재방문 / 첫 세션 사용자
```

**체크:**
- [ ] 첫 세션 사용자
- [ ] 7일 내 재방문
- [ ] 재방문율 계산

---

## 📊 중고거래 vs 매칭 서비스 비교

| 항목 | 중고거래 | 매칭 서비스 |
|------|---------|------------|
| Chat | 관계 | 멘토-멘티 대화 |
| Message.product | 상품 제안 | 세션 제안 |
| Deal | 거래 완료 | 세션 확정 |
| Review | 거래 후기 | 세션 만족도 |
| 완료 주체 | 판매자 | 멘토 |
| 취소 가능 | 완료 전 | 확정 전 |
| 완료 후 | 취소 불가 | 취소 불가 |

---

## 🔄 전체 플로우

```
1. 멘토-멘티 대화 시작
   ↓
2. 멘토가 세션 제안 (세션 카드 메시지)
   ↓
3. sessionDeal 생성 (status: "proposed")
   ↓
4. 멘토가 세션 확정
   ↓
5. sessionDeal.status = "confirmed"
   ↓
6. 시스템 메시지: "✅ 세션이 확정되었습니다"
   ↓
7. 세션 진행 (외부에서)
   ↓
8. 세션 완료 표시 (수동 또는 자동)
   ↓
9. sessionDeal.status = "completed"
   ↓
10. 후기 CTA: "이번 세션은 어떠셨나요?"
   ↓
11. 평점 작성 (선택)
   ↓
12. Review 생성
```

---

## 🎯 핵심 차이점 요약

### 중고거래에서 바뀐 것

1. **상품 → 세션**
   - productId → sessionId
   - 상품 정보 → 세션 정보 (주제, 시간)

2. **판매자 → 멘토**
   - sellerId → mentorId
   - buyerId → menteeId

3. **거래 완료 → 세션 확정**
   - 완료 주체: 판매자 → 멘토
   - 완료 시점: 실제 거래 후 → 확정 시점

### 그대로 유지된 것

- Chat → 관계
- Message → 맥락
- Deal → 결정
- Review → 신뢰
- 권한 구조
- 안전장치
- MVP 컷 기준

---

## 📋 구현 체크리스트

### 데이터 모델

- [ ] Message에 session 필드 추가
- [ ] SessionDeal 컬렉션 생성
- [ ] Review에 sessionDealId 연결

### UX

- [ ] 세션 제안 카드 컴포넌트
- [ ] 세션 확정 버튼 (멘토만)
- [ ] 세션 완료 표시
- [ ] 후기 CTA

### 권한

- [ ] 멘토만 확정 가능
- [ ] 확정 전만 취소 가능
- [ ] 완료 후 취소 불가

### 안전장치

- [ ] 차단/신고 연결
- [ ] 메시지 로그 보관
- [ ] 권한 가드

---

## 🏁 다음 자동 진행

### Y → 이 MVP를 피치/문서용 1페이지로 정리

**포함 내용:**
- 핵심 가치 제안
- 주요 기능
- 차별점
- 성공 지표

### I → 여기서 멈추고 구현 시작

**이유:**
- 매칭 서비스 MVP 설계 완료 ✅
- 중고거래 프레임워크 재사용 ✅
- 바로 구현 가능 ✅

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

