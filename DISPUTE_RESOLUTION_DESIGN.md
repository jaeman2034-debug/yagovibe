# 🧠 D 단계 — 분쟁 발생 시 운영介入은 어디까지 할까?

> **"서비스가 커져도 무너지지 않는다" 설계**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 핵심 질문

**운영자는 언제, 어디까지 개입해야 하는가?**

### 정답부터 말하면

**"항상 개입 ❌ / 완전 방치 ❌ / 단계적介入 ⭕"**

### ❌ 잘못된 두 극단

#### 1️⃣ 운영자 무개입

**"유저끼리 알아서 하세요"**

**결과:**
- 악성 유저 방치
- 신뢰 붕괴
- 떠나는 건 선량한 유저

#### 2️⃣ 운영자 과개입

**신고 들어오면 즉시 제재**

**결과:**
- 법적 리스크
- 운영 비용 폭증
- 판단 기준 논란

---

## ❌ 흔한 오답

### 1️⃣ 운영자가 모든 분쟁 해결

**문제:**
- 운영 비용 폭증
- 판단 주관성
- 확장 불가능

### 2️⃣ 완전 자동화

**문제:**
- 복잡한 상황 처리 불가
- 오판 가능성
- 사용자 불만 증가

### 3️⃣ 방치

**문제:**
- 신뢰도 하락
- 사용자 이탈
- 법적 리스크

---

## ✅ 정답 구조 — 3단계介入 모델

### 🧱 1단계: 사용자 주도 (기본)

**사용자가 할 수 있는 것:**
- 신고
- 차단
- 후기 작성

**👉 운영介入 ❌**

**이 단계에서:**
- 80% 문제는 자연 소멸
- 운영 리소스 절약

### 🧱 2단계: 시스템 개입 (자동)

**조건:**
- 동일 사용자에 대한 신고 누적
- 차단 빈도 높음
- 거래 분쟁 반복

**시스템 액션 예시:**
- 해당 유저 노출 ↓
- 새 거래 제안 제한
- 후기 점수 가중치 ↓

**❌ 정지 / 퇴출 X**  
**⭕ "조용한 제약"**

### 🧱 3단계: 운영자介入 (최소)

**언제?**
- 명백한 사기
- 반복 악성 행위
- 법적 이슈 가능성

**운영자가 보는 것:**
- deal 기록
- 메시지 로그
- 이미지(증거)
- 신고 히스토리

**👉 판단 근거는 항상 기록 기반**

---

## 🧱 데이터 모델

### 1️⃣ 분쟁 (Dispute)

```typescript
// disputes 컬렉션
dispute {
  id: string
  dealId: string           // 관련 거래
  chatId: string           // 관련 채팅
  reporterId: string       // 신고자
  reportedUserId: string   // 신고당한 사람
  type: "payment" | "product" | "behavior" | "other"
  reason: string
  status: "pending" | "resolved" | "escalated" | "dismissed"
  evidence?: string[]      // 증거 (이미지 URL 등)
  createdAt: Timestamp
  resolvedAt?: Timestamp
  resolvedBy?: string      // 운영자 UID
  resolution?: string      // 해결 내용
}
```

**파일 경로**: `disputes/{disputeId}`

### 2️⃣ 분쟁 이력 (Deal에 연결)

```typescript
// deals 컬렉션 (확장)
deal {
  // ... 기존 필드
  disputeId?: string       // 분쟁이 있으면 연결
  hasDispute: boolean
}
```

---

## 🧩 3단계 분쟁 해결 시스템

### 1단계: 자동 감지 & 경고

#### 자동 감지 조건

```typescript
// 분쟁 가능성 자동 감지
const detectDisputeRisk = async (chatId: string, dealId: string) => {
  // 1. 거래 완료 후 신고 발생
  const reports = await getDocs(
    query(
      collection(db, "chatReports"),
      where("chatId", "==", chatId),
      where("createdAt", ">", deal.completedAt)
    )
  );
  
  if (!reports.empty) {
    // 자동으로 분쟁 생성
    await createDispute({
      dealId,
      chatId,
      reporterId: reports.docs[0].data().reporterId,
      reportedUserId: reports.docs[0].data().reportedUserId,
      type: "behavior",
      status: "pending",
    });
  }
  
  // 2. 거래 완료 후 차단 발생
  const blocked = await getDoc(
    doc(db, `users/${buyerId}/blockedUsers/${sellerId}`)
  );
  
  if (blocked.exists() && blocked.data().blockedAt > deal.completedAt) {
    // 자동으로 분쟁 생성
    await createDispute({
      dealId,
      chatId,
      reporterId: buyerId,
      reportedUserId: sellerId,
      type: "behavior",
      status: "pending",
    });
  }
};
```

#### 자동 경고

```typescript
// 분쟁 발생 시 자동 경고 메시지
const sendDisputeWarning = async (chatId: string, disputeId: string) => {
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    uid: "system",
    senderId: "system",
    text: "⚠️ 분쟁이 접수되었습니다. 운영팀이 검토 중입니다.",
    type: "system_dispute",
    disputeId,
    createdAt: serverTimestamp(),
  });
};
```

### 2단계: 시스템 개입 (자동)

#### 자동 제약 시스템

```typescript
// 시스템이 자동으로 제약을 가하는 경우
const applySystemRestrictions = async (userId: string) => {
  // 신고 누적 체크
  const reportCount = await getReportCount(userId);
  const blockCount = await getBlockCount(userId);
  
  // 조건: 신고 3회 이상 또는 차단 5회 이상
  if (reportCount >= 3 || blockCount >= 5) {
    // 조용한 제약 적용
    await updateDoc(doc(db, "users", userId), {
      systemRestrictions: {
        exposureReduced: true,        // 노출 ↓
        newDealLimited: true,         // 새 거래 제한
        ratingWeightReduced: true,   // 후기 점수 가중치 ↓
        appliedAt: serverTimestamp(),
      },
    });
  }
};
```

#### 노출 감소

```typescript
// 상품 목록에서 노출 순위 낮춤
const calculateExposureScore = (user: User, product: Product) => {
  let score = product.createdAt; // 기본: 최신순
  
  // 시스템 제약이 있으면 노출 순위 낮춤
  if (user.systemRestrictions?.exposureReduced) {
    score -= 1000000; // 순위 하락
  }
  
  return score;
};
```

#### 새 거래 제한

```typescript
// 새 거래 제안 시 체크
const canCreateNewDeal = async (userId: string) => {
  const user = await getDoc(doc(db, "users", userId));
  
  if (user.data()?.systemRestrictions?.newDealLimited) {
    // 제한된 사용자는 새 거래 제안 불가
    return false;
  }
  
  return true;
};
```

**원칙:**
- ❌ 정지 / 퇴출 X
- ⭕ "조용한 제약"

#### 증거 수집

```typescript
// 분쟁 신고 시 증거 수집
const createDispute = async (
  dealId: string,
  reporterId: string,
  reportedUserId: string,
  type: string,
  evidence?: File[]
) => {
  // 증거 이미지 업로드
  const evidenceUrls: string[] = [];
  
  if (evidence) {
    for (const file of evidence) {
      const url = await uploadEvidence(file, disputeId);
      evidenceUrls.push(url);
    }
  }
  
  // 분쟁 생성
  await addDoc(collection(db, "disputes"), {
    dealId,
    chatId,
    reporterId,
    reportedUserId,
    type,
    evidence: evidenceUrls,
    status: "pending",
    createdAt: serverTimestamp(),
  });
};
```

### 3단계: 운영자 개입 (필요시)

#### 운영자 개입 조건

```typescript
// 운영자 개입이 필요한 경우
const shouldEscalateToAdmin = (dispute: Dispute) => {
  // 1. 24시간 내 해결 안 됨
  const hoursSinceCreation = 
    (Date.now() - dispute.createdAt.toMillis()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation > 24 && dispute.status === "pending") {
    return true;
  }
  
  // 2. 증거가 있는 경우 (중요한 분쟁)
  if (dispute.evidence && dispute.evidence.length > 0) {
    return true;
  }
  
  // 3. 반복 신고 (같은 사용자가 여러 번 신고)
  // → 별도 로직으로 확인
  
  return false;
};
```

#### 운영자 대시보드

```typescript
// 운영자가 볼 수 있는 분쟁 목록
const getDisputesForAdmin = async () => {
  const disputes = await getDocs(
    query(
      collection(db, "disputes"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    )
  );
  
  return disputes.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // 추가 정보
    deal: await getDeal(doc.data().dealId),
    chat: await getChat(doc.data().chatId),
    reporter: await getUser(doc.data().reporterId),
    reported: await getUser(doc.data().reportedUserId),
  }));
};
```

#### 운영자 해결

```typescript
// 운영자가 분쟁 해결
const resolveDisputeByAdmin = async (
  disputeId: string,
  adminId: string,
  resolution: string,
  outcome: "resolved" | "dismissed"
) => {
  await updateDoc(doc(db, "disputes", disputeId), {
    status: outcome,
    resolvedBy: adminId,
    resolution,
    resolvedAt: serverTimestamp(),
  });
  
  // 채팅에 해결 메시지 추가
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    uid: "system",
    senderId: "system",
    text: `✅ 분쟁이 해결되었습니다: ${resolution}`,
    type: "system_dispute_resolved",
    createdAt: serverTimestamp(),
  });
};
```

---

## 🔐 권한 설계

### 누가 무엇을 할 수 있나?

#### 일반 사용자
- 분쟁 신고 ⭕
- 증거 제출 ⭕
- 중재 요청 ⭕
- 분쟁 해결 (상호 합의) ⭕

#### 운영자
- 모든 분쟁 조회 ⭕
- 분쟁 해결 ⭕
- 분쟁 기각 ⭕
- 사용자 제재 ⭕

---

## 🧠 핵심 설계 포인트 (중요)

### ❗ 채팅 메시지는 "증거"가 될 수 있다

**그래서:**
- 삭제 ❌ (사용자에게만 숨김 ⭕)
- 서버에는 일정 기간 보관

```typescript
// 메시지 삭제는 실제 삭제가 아니라 숨김
message {
  id: string
  text: string
  deletedForUserIds?: string[]  // 이 사용자들에게만 숨김
  // 서버에는 항상 보관 (증거용)
}
```

```typescript
// 메시지 삭제 처리
const deleteMessage = async (messageId: string, userId: string) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  const message = await getDoc(messageRef);
  
  const deletedForUserIds = message.data()?.deletedForUserIds || [];
  
  // 사용자에게만 숨김 (서버에는 보관)
  await updateDoc(messageRef, {
    deletedForUserIds: [...deletedForUserIds, userId],
  });
};
```

### 🔐 분쟁 버튼 UX (있으면 안 됨)

**❌ "분쟁 요청" 버튼 ❌**  
**❌ "운영자에게 문의" 버튼 ❌**

**👉 이런 버튼은 분쟁을 키운다**

**⭕ 대신:**
- 신고
- 차단
- 후기

**이 3가지만 제공**

```typescript
// ❌ 나쁜 예
<button onClick={() => requestDispute()}>
  분쟁 요청
</button>

// ✅ 좋은 예
<div className="action-buttons">
  <button onClick={() => handleReport()}>
    신고
  </button>
  <button onClick={() => handleBlock()}>
    차단
  </button>
  <button onClick={() => handleReview()}>
    후기 남기기
  </button>
</div>
```

### 🧠 천재 포인트 하나

**운영介入은 "기능"이 아니라 "최후 수단"이어야 한다**

**사용자가:**
- 혼자 문제를 해결할 수 있어야
- 플랫폼이 건강해진다

### 1️⃣ 자동 차단은 신중하게

```typescript
// ❌ 나쁜 예: 분쟁 발생 시 즉시 차단
if (disputeCreated) {
  await blockUser(...);
}

// ✅ 좋은 예: 분쟁은 분쟁대로, 차단은 별도
// 분쟁 발생 ≠ 자동 차단
// 운영자 판단 후 제재
```

**이유:**
- 오판 가능성
- 사용자 불만 증가
- 법적 리스크

### 2️⃣ 증거 수집은 필수

**채팅 메시지 로그는 자동으로 증거가 됨**

```typescript
// 운영자가 볼 수 있는 증거
const getDisputeEvidence = async (disputeId: string) => {
  const dispute = await getDoc(doc(db, "disputes", disputeId));
  const deal = await getDoc(doc(db, "deals", dispute.data().dealId));
  const chatId = deal.data().chatId;
  
  // 채팅 메시지 전체 (삭제된 것도 포함)
  const messages = await getDocs(
    query(
      collection(db, `chats/${chatId}/messages`),
      orderBy("createdAt", "asc")
    )
  );
  
  return {
    dispute: dispute.data(),
    deal: deal.data(),
    messages: messages.docs.map(doc => ({
      ...doc.data(),
      // deletedForUserIds는 운영자에게는 보임
    })),
  };
};
```

**이유:**
- 객관적 판단 가능
- 법적 대응 가능
- 운영 효율성 증가

---

## 📊 UI 컴포넌트 설계

### 1️⃣ 분쟁 신고 버튼

```typescript
// 거래 완료 후 분쟁 신고 버튼
{dealStatus === "completed" && !hasDispute && (
  <button
    onClick={() => setShowDisputeModal(true)}
    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
  >
    분쟁 신고
  </button>
)}
```

### 2️⃣ 분쟁 상태 표시

```typescript
// 분쟁 발생 시 상태 표시
{hasDispute && (
  <div className="dispute-status bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
    {disputeStatus === "pending" && (
      <>
        <p className="text-sm text-yellow-800 mb-2">
          ⚠️ 이 거래에 대한 분쟁이 접수되었습니다.
        </p>
        <div className="flex gap-2">
          <button onClick={() => requestMediation(disputeId)}>
            중재 요청
          </button>
          <button onClick={() => markResolved(disputeId)}>
            해결됨
          </button>
        </div>
      </>
    )}
    
    {disputeStatus === "resolved" && (
      <p className="text-sm text-green-800">
        ✅ 분쟁이 해결되었습니다.
      </p>
    )}
  </div>
)}
```

### 3️⃣ 운영자 대시보드

```typescript
// 운영자 분쟁 관리 페이지
<AdminDisputeDashboard>
  <h1>분쟁 관리</h1>
  
  <div className="dispute-list">
    {disputes.map(dispute => (
      <DisputeCard key={dispute.id}>
        <div className="dispute-info">
          <div>거래 ID: {dispute.dealId}</div>
          <div>신고자: {dispute.reporter.displayName}</div>
          <div>신고당한 사람: {dispute.reported.displayName}</div>
          <div>유형: {dispute.type}</div>
          <div>상태: {dispute.status}</div>
        </div>
        
        {dispute.evidence && (
          <div className="evidence">
            {dispute.evidence.map(url => (
              <img key={url} src={url} alt="증거" />
            ))}
          </div>
        )}
        
        <div className="actions">
          <button onClick={() => resolveDispute(dispute.id, "resolved")}>
            해결됨
          </button>
          <button onClick={() => resolveDispute(dispute.id, "dismissed")}>
            기각
          </button>
        </div>
      </DisputeCard>
    ))}
  </div>
</AdminDisputeDashboard>
```

---

## 🔄 전체 플로우

### 분쟁 발생 → 해결

```
1. 거래 완료 후 문제 발생
   ↓
2. 사용자가 "분쟁 신고" 클릭
   ↓
3. 분쟁 생성 (status: "pending")
   ↓
4. 자동 경고 메시지 (채팅에 표시)
   ↓
5. 사용자 간 해결 시도 (24시간)
   ↓
6-A. 해결됨 → dispute.status = "resolved"
   ↓
6-B. 해결 안 됨 → 운영자 개입
   ↓
7. 운영자 판단 및 해결
   ↓
8. 해결 메시지 (채팅에 표시)
```

---

## 🔐 악용 방지

### 1️⃣ 반복 신고 제한

```typescript
// 같은 거래에 대한 반복 신고 방지
const canCreateDispute = async (dealId: string, reporterId: string) => {
  const existing = await getDocs(
    query(
      collection(db, "disputes"),
      where("dealId", "==", dealId),
      where("reporterId", "==", reporterId)
    )
  );
  
  return existing.empty; // 이미 신고했으면 불가
};
```

### 2️⃣ 악성 신고 패턴 감지

```typescript
// 한 사용자가 여러 번 신고하는 경우
const detectAbusePattern = async (reporterId: string) => {
  const disputes = await getDocs(
    query(
      collection(db, "disputes"),
      where("reporterId", "==", reporterId),
      where("status", "==", "dismissed") // 기각된 신고
    )
  );
  
  // 기각된 신고가 3개 이상이면 악성 패턴
  if (disputes.size >= 3) {
    // 신고 권한 제한 또는 경고
    return true;
  }
  
  return false;
};
```

### 3️⃣ 증거 필수 (중요한 분쟁)

```typescript
// 결제 문제나 상품 문제는 증거 필수
const requireEvidence = (type: string) => {
  return type === "payment" || type === "product";
};
```

---

## 📌 여기까지 왔을 때 상태

### ✅ 완료된 설계

- [x] 3단계 개입 모델 (사용자 주도 → 시스템 개입 → 운영자 개입)
- [x] 채팅 메시지 증거 보관 (삭제 ❌, 숨김 ⭕)
- [x] 분쟁 버튼 없음 (신고/차단/후기만)
- [x] 시스템 자동 제약 (조용한 제약)
- [x] 운영자 개입은 최후 수단
- [x] 악용 방지 전략

### 🎯 이제 이 앱은

👉 **커져도 운영자가 죽지 않는다.**

**분쟁 발생 구조 이해 ✅**  
**운영 리스크 최소화 ✅**  
**확장 가능한 개입 모델 ✅**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

