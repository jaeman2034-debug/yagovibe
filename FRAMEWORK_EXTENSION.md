# 🚀 NEXT 단계 — 프레임워크 확장 설계 (다른 도메인)

> **이 구조를 다른 도메인으로 확장 설계**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 확장 판단 체크 (YES면 적용)

### 필수 질문 3개

1. **대화 중 "결정"이 발생하는가?**
2. **결정의 주체가 명확한가?**
3. **결정 이후 신뢰/이력이 필요한가?**

**전부 YES → 이 프레임워크 그대로 사용**

---

## 1️⃣ 커뮤니티/협업 → 프로젝트/팀 매칭형

### 예시

- 프로젝트 팀원 모집
- 프리랜서 매칭
- 스터디 그룹

### 매핑

```
Chat → 프로젝트 대화
Message.product → 프로젝트 제안
Deal → 참여 확정
Review → 협업 후기(신뢰)
```

### 데이터 모델

```typescript
// Chat (관계)
chat {
  id: string
  participants: [userIdA, userIdB]
  projectId?: string
  createdAt: Timestamp
}

// Message (맥락)
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "project" | "system_status"
  projectId?: string  // 프로젝트 제안일 때만
  text?: string
  createdAt: Timestamp
}

// Deal (결정) → 참여 확정
deal {
  id: string
  chatId: string
  projectId: string
  proposerId: string  // 프로젝트 제안자
  participantId: string  // 참여 확정한 사람
  status: "proposed" | "confirmed" | "cancelled"
  confirmedAt?: Timestamp
  createdAt: Timestamp
}

// Review (신뢰) → 협업 후기
review {
  id: string
  dealId: string  // 참여 확정에 귀속
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  createdAt: Timestamp
}
```

### 핵심 차이점

- **Deal → 참여 확정**: "이 프로젝트에 참여하겠다"
- **Review → 협업 후기**: "이 사람과 협업은 어떠셨나요?"

### 확장 가능성

👉 **"누가 같이 했는지"가 남는다**  
👉 **프리랜서/팀 매칭으로 확장 가능**

---

## 2️⃣ 매칭 서비스 → 약속/합의형

### 예시

- 멘토–멘티
- 컨설팅
- 클래스 예약

### 매핑

```
Chat → 상담 대화
Message.product → 세션 제안
Deal → 세션 확정
Review → 만족도 평점
```

### 데이터 모델

```typescript
// Chat (관계)
chat {
  id: string
  participants: [mentorId, menteeId]
  createdAt: Timestamp
}

// Message (맥락)
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "session" | "system_status"
  sessionId?: string  // 세션 제안일 때만
  sessionDate?: Timestamp  // 세션 일시
  sessionDuration?: number  // 세션 시간 (분)
  text?: string
  createdAt: Timestamp
}

// Deal (결정) → 세션 확정
deal {
  id: string
  chatId: string
  sessionId: string
  mentorId: string
  menteeId: string
  status: "proposed" | "confirmed" | "cancelled" | "completed"
  sessionDate: Timestamp
  confirmedAt?: Timestamp
  completedAt?: Timestamp
  createdAt: Timestamp
}

// Review (신뢰) → 만족도 평점
review {
  id: string
  dealId: string  // 세션 확정에 귀속
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  createdAt: Timestamp
}
```

### 핵심 차이점

- **Deal → 세션 확정**: "이 세션을 확정하겠다"
- **Review → 만족도**: "이 세션은 어떠셨나요?"

### 확장 가능성

👉 **결제 없어도**  
👉 **"확정 기록"이 신뢰를 만든다**

---

## 3️⃣ B2B → 계약 전 단계 관리형 (고급)

### 예시

- 세일즈
- 외주/납품 협의

### 매핑

```
Chat → 협상 대화
Message.product → 견적/조건 제안
Deal → 합의된 조건
Review → ❌ (대신 거래 이력)
```

### 데이터 모델

```typescript
// Chat (관계)
chat {
  id: string
  participants: [companyAId, companyBId]
  createdAt: Timestamp
}

// Message (맥락)
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "quote" | "system_status"
  quoteId?: string  // 견적 제안일 때만
  quoteAmount?: number  // 견적 금액
  quoteTerms?: string  // 조건
  text?: string
  createdAt: Timestamp
}

// Deal (결정) → 합의된 조건
deal {
  id: string
  chatId: string
  quoteId: string
  sellerId: string  // 판매자
  buyerId: string  // 구매자
  status: "proposed" | "agreed" | "cancelled"
  agreedAmount: number
  agreedTerms: string
  agreedAt?: Timestamp
  createdAt: Timestamp
}

// Review → ❌ (대신 거래 이력)
// B2B는 Review 대신 거래 이력으로 관리
transactionHistory {
  id: string
  dealId: string
  status: "agreed" | "in_progress" | "completed" | "cancelled"
  updatedAt: Timestamp
}
```

### 핵심 차이점

- **Deal → 합의된 조건**: "이 조건으로 합의했다"
- **Review → ❌**: 대신 거래 이력으로 관리

### 확장 가능성

👉 **법적 계약 전**  
👉 **히스토리와 책임 구분에 강력**

---

## 🧠 공통으로 절대 변하지 않는 원칙

### 대화는 관계

**Chat → 관계 유지**

- 관계는 유지됨
- 결정과 분리
- 새 결정 가능

---

### 제안은 메시지

**Message → 맥락**

- 모든 제안은 메시지
- 맥락 보존
- 증거의 원천

---

### 결정은 Deal

**Deal → 결정**

- 실제 결정의 기록
- 독립적 존재
- 여러 결정 가능

---

### 신뢰는 결과의 누적

**Review → 신뢰**

- 결정에 귀속
- 사람이 아닌 결정에 귀속
- 누적 결과물

---

### 이 4개가 유지되면

**어떤 도메인이든 깨지지 않는다.**

---

## 📊 도메인별 비교표

| 도메인 | Chat | Message | Deal | Review |
|--------|------|---------|------|--------|
| 중고거래 | 관계 | 맥락 | 거래 완료 | 거래 후기 |
| 커뮤니티/협업 | 프로젝트 대화 | 프로젝트 제안 | 참여 확정 | 협업 후기 |
| 매칭 서비스 | 상담 대화 | 세션 제안 | 세션 확정 | 만족도 평점 |
| B2B | 협상 대화 | 견적 제안 | 합의 조건 | 거래 이력 |

---

## 🎯 확장 적용 가이드

### Step 1: 문제 정의

**질문 3개:**
1. 사람은 무엇을 하려고 대화를 시작하는가?
2. 대화 중 '결정'이 발생하는 순간은 어디인가?
3. 그 결정의 증거는 무엇인가?

---

### Step 2: 도메인 매핑

**4개 도메인 분리:**
- Chat → ?
- Message → ?
- Deal → ?
- Review → ?

---

### Step 3: 데이터 모델 설계

**기존 구조 유지:**
- Chat: participants
- Message: type, chatId
- Deal: status, chatId
- Review: dealId

**도메인별 필드 추가:**
- 중고거래: productId
- 커뮤니티: projectId
- 매칭: sessionId
- B2B: quoteId

---

### Step 4: UX 황금 규칙 적용

**5가지 규칙:**
1. 결정은 항상 '국소적'
2. 사용자는 스스로 보호
3. 플랫폼은 중재자가 아님
4. 숫자는 힌트
5. 닫지 말고 상태만 변경

---

### Step 5: MVP 컷

**KEEP:**
- 끝까지 흐르는 핵심 플로우
- 악용 방지 최소선
- 운영 개입 없이 버팀

**CUT:**
- 돈 직접 만지는 기능
- 자동 판단/제재
- "있으면 좋아 보이는" 것

---

## 🚦 확장 판단 체크 (YES면 적용)

### 필수 질문 3개

1. **대화 중 "결정"이 발생하는가?**
   - YES → 진행
   - NO → 프레임워크 적용 불가

2. **결정의 주체가 명확한가?**
   - YES → 진행
   - NO → 재정의 필요

3. **결정 이후 신뢰/이력이 필요한가?**
   - YES → 진행
   - NO → Review는 선택적

### 전부 YES → 이 프레임워크 그대로 사용

---

## 🏁 다음 선택

### I → 여기서 종료하고, 실제 구현/출시에 집중

**이유:**
- 프레임워크 확장 설계 완료 ✅
- 다른 도메인 적용 가능 ✅
- 바로 사용 가능 ✅

### X → 위 도메인 중 하나를 구체 MVP로 설계

**포함 내용:**
- 선택한 도메인의 상세 설계
- 데이터 모델 상세
- UX 플로우 상세
- MVP 범위 컷

### Y → 이 프레임워크를 문서/블로그/피치용으로 정리

**포함 내용:**
- 프레임워크 요약
- 적용 사례
- 재사용 가이드
- 발표 자료

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

