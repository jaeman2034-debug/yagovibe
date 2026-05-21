# 노원구 축구협회 실전 Firestore 스키마 (확정)

## 🎯 핵심 원칙

1. **팀은 STEP 1에서 생성** (active + non-member)
2. **회원 신청은 STEP 2에서 발생** (membership: pending)
3. **협회 승인은 관리자 화면에서 처리** (membership: member)

---

## 📊 컬렉션 구조

### 1. `teams` 컬렉션

```typescript
// teams/{teamId}
{
  // 기본 정보
  id: string; // 문서 ID
  name: string; // 팀 이름
  sportType: "football"; // 종목
  region: "서울시 노원구"; // 활동 지역 (고정)
  
  // 상태
  status: "active" | "inactive"; // 팀 활성/비활성 상태
  membership: "non-member" | "pending" | "member" | "academy"; // 협회 회원 상태
  associationId: string | null; // 협회 ID (pending/member일 때만 값 있음)
  
  // 소유자
  ownerUid: string; // 팀 생성자 UID
  owners: string[]; // 소유자 UID 배열
  
  // 기타
  plan: "free"; // 플랜 (기본값)
  seatLimit: number; // 좌석 제한
  seatUsed: number; // 사용 중 좌석
  allowManualFee: boolean;
  isDeleted: boolean;
  
  // 타임스탬프
  createdAt: Timestamp; // 팀 생성 시각
  updatedAt?: Timestamp; // 마지막 업데이트 시각
}
```

#### 상태 전이

```
STEP 1 완료
  → status: "active", membership: "non-member", associationId: null

STEP 2 회원 신청
  → membership: "pending", associationId: "assoc-nowon-football"

관리자 승인
  → membership: "member", associationId: "assoc-nowon-football"
```

---

### 2. `associations` 컬렉션

```typescript
// associations/{associationId}
{
  id: string; // 문서 ID
  name: string; // 협회명 (예: "노원구축구협회")
  region: string; // 지역 (예: "서울 노원구")
  
  // 설정
  config: {
    // 정책 설정 등 (필요시 확장)
  },
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// 예시: associations/assoc-nowon-football
{
  id: "assoc-nowon-football",
  name: "노원구축구협회",
  region: "서울 노원구",
  createdAt: Timestamp,
}
```

---

### 3. `membershipRequests` 컬렉션 (노원 실전: 승인 히스토리)

```typescript
// membershipRequests/{requestId}
{
  id: string; // 문서 ID
  teamId: string; // 팀 ID
  associationId: string; // 협회 ID (예: "assoc-nowon-football")
  
  // 상태
  status: "pending" | "approved" | "rejected";
  
  // 신청 정보
  requestedAt: Timestamp; // 신청 시각
  requestedBy: string; // 신청한 사용자 UID
  memo?: string; // 신청 메모 (선택)
  
  // 승인/거절 정보
  reviewedAt?: Timestamp; // 검토 시각
  reviewedBy?: string; // 검토한 관리자 UID
  rejectionReason?: string; // 거절 사유
}
```

#### 상태 전이

```
STEP 2 회원 신청
  → status: "pending", requestedAt: now, requestedBy: uid

관리자 승인
  → status: "approved", reviewedAt: now, reviewedBy: adminUid
  → teams/{teamId}.membership: "member"
  → teams/{teamId}.associationId: associationId
  → teams/{teamId}.approvedAt: now
  → teams/{teamId}.approvedBy: adminUid

관리자 거절
  → status: "rejected", reviewedAt: now, reviewedBy: adminUid, rejectionReason
  → teams/{teamId}.membership: "non-member" (되돌림)
  → teams/{teamId}.associationId: null (되돌림)
```

---

## 🔄 데이터 플로우

### STEP 1: 팀 생성

```typescript
// teams/{teamId} 생성
{
  name: "공릉 FC",
  sportType: "football",
  region: "서울시 노원구",
  status: "active",
  membership: "non-member",
  associationId: null,
  ownerUid: user.uid,
  owners: [user.uid],
  plan: "free",
  seatLimit: 5,
  seatUsed: 1,
  allowManualFee: true,
  isDeleted: false,
  createdAt: serverTimestamp(),
}
```

**결과**: 팀이 존재하는 상태, 비회원 대관 가능

---

### STEP 2: 회원 신청

```typescript
// teams/{teamId} 업데이트
{
  membership: "pending",
  associationId: "assoc-nowon-football",
  updatedAt: serverTimestamp(),
}

// membership_conversions/{conversionId} 생성
{
  teamId: teamId,
  associationId: "assoc-nowon-football",
  status: "PENDING",
  requestedAt: serverTimestamp(),
  memo: undefined, // 나중에 확장 가능
}
```

**결과**: 승인 대기 상태, 비회원 대관 정책 유지

---

### 관리자 승인

```typescript
// teams/{teamId} 업데이트
{
  membership: "member",
  associationId: "assoc-nowon-football",
  updatedAt: serverTimestamp(),
}

// membership_conversions/{conversionId} 업데이트
{
  status: "APPROVED",
  approvedAt: serverTimestamp(),
  approvedBy: adminUid,
}
```

**결과**: 회원 권한 활성화, 우선 대관 가능

---

## 🔐 인덱스 및 쿼리 패턴

### 협회별 신청 팀 조회

```typescript
// 노원구 축구협회의 승인 대기 팀 목록
db.collection("membershipRequests")
  .where("associationId", "==", "assoc-nowon-football")
  .where("status", "==", "pending")
  .orderBy("requestedAt", "desc")
  .get();
```

### 팀의 회원 상태 확인

```typescript
// Policy Engine에서 사용
const teamDoc = await db.doc(`teams/${teamId}`).get();
const teamData = teamDoc.data();
const membership = teamData?.membership || "non-member";
const associationId = teamData?.associationId || null;
```

---

## ✅ 검증 규칙

### 팀 생성 시

- ✅ `membership`은 항상 `"non-member"`로 시작
- ✅ `associationId`는 항상 `null`로 시작
- ✅ `status`는 항상 `"active"`로 시작

### 회원 신청 시

- ✅ `membership`은 `"non-member"`에서만 `"pending"`으로 변경 가능
- ✅ `associationId`는 `null`에서만 값 설정 가능
- ✅ `membership_conversions` 문서는 항상 생성되어야 함

### 관리자 승인 시

- ✅ `membership`은 `"pending"`에서만 `"member"`로 변경 가능
- ✅ `membership_conversions.status`는 `"PENDING"`에서만 `"APPROVED"`로 변경 가능
- ✅ Transaction으로 팀 업데이트 + 신청 문서 업데이트 (원자적)

---

## 🚀 다음 단계

이 스키마가 확정되면:

1. **`createTeam` API 수정**: `membership: "non-member"`, `associationId: null` 추가
2. **`requestMembership` API 생성**: 팀 상태 업데이트 + 신청 문서 생성
3. **관리자 화면**: `membership_conversions` 쿼리로 신청 목록 표시

