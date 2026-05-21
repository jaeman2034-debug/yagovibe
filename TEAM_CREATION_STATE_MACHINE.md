# 팀 생성 상태 머신 설계 (확정)

## 🎯 핵심 질문 답변

**Q: 팀 생성이 완료되는 정확한 순간은 언제인가?**

### 답변: 모드별로 다름

#### 1. 비회원 모드 (`mode=non-member`)
- **완료 시점**: STEP 1 제출 시 (팀 이름 + 활동 지역 입력 완료)
- **Firestore write**: 즉시
- **팀 상태**: `status: "active"`, `associationStatus: "NON_MEMBER"`
- **사용자 액션**: 즉시 팀 관리 페이지로 이동

#### 2. 회원 신청 모드 (`mode=member-request`)
- **완료 시점**: STEP 3 제출 시 (협회 선택 + 신청 사유 입력 완료)
- **Firestore write**: 즉시 (팀 생성 + membership_conversion 문서 생성)
- **팀 상태**: `status: "active"`, `associationStatus: "PENDING"`
- **사용자 액션**: "신청 완료" 메시지, 대기 상태 표시
- **최종 완료**: 협회 승인 시 (`associationStatus: "PENDING" → "MEMBER"`)

---

## 📊 상태 전이 다이어그램

```
[팀 생성 시작]
    │
    ├─ [비회원 모드]
    │   │
    │   └─ STEP 1 제출
    │       │
    │       ├─ Firestore: teams/{teamId} 생성
    │       │   - status: "active"
    │       │   - associationStatus: "NON_MEMBER"
    │       │   - associationId: null
    │       │
    │       └─ [완료] → 팀 관리 페이지
    │
    └─ [회원 신청 모드]
        │
        ├─ STEP 1: 팀 기본 정보
        ├─ STEP 2: 활동 정보
        └─ STEP 3: 협회 선택
            │
            └─ STEP 3 제출
                │
                ├─ Firestore: teams/{teamId} 생성
                │   - status: "active"
                │   - associationStatus: "PENDING"
                │   - associationId: 선택한 협회 ID
                │
                ├─ Firestore: membership_conversions/{id} 생성
                │   - teamId
                │   - associationId
                │   - status: "PENDING"
                │   - requestedAt
                │
                └─ [신청 완료] → "승인 대기 중" 상태 표시
                    │
                    └─ [협회 승인]
                        │
                        ├─ teams/{teamId}.associationStatus: "MEMBER"
                        ├─ membership_conversions/{id}.status: "APPROVED"
                        └─ [완료] → 회원 권한 활성화
```

---

## 🗂️ 데이터 구조

### teams 컬렉션

```typescript
{
  // 기본 필드
  name: string;
  region: string;
  sportType: string;
  status: "active" | "inactive"; // 팀 활성/비활성 상태
  
  // 협회 관련 필드
  associationStatus: "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING";
  associationId: string | null; // PENDING/MEMBER일 때만 값 있음
  
  // 기타
  ownerUid: string;
  createdAt: Timestamp;
}
```

### membership_conversions 컬렉션

```typescript
{
  teamId: string;
  associationId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: Timestamp;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
  memo: string | null;
}
```

---

## 🔄 상태 전이 규칙

### 1. 비회원 팀 생성
```
[없음] → [생성] → associationStatus: "NON_MEMBER"
```

### 2. 회원 신청 플로우
```
[없음] 
  → [STEP 3 제출] 
  → associationStatus: "PENDING"
  → [협회 승인]
  → associationStatus: "MEMBER"
```

### 3. 비회원 → 회원 전환 (기존 팀)
```
associationStatus: "NON_MEMBER"
  → [회원 전환 문의]
  → associationStatus: "PENDING"
  → [협회 승인]
  → associationStatus: "MEMBER"
```

---

## ✅ Firestore Write 타이밍

### 비회원 모드
- **Write 시점**: STEP 1 제출 시 (한 번만)
- **Write 내용**: teams/{teamId} 문서 생성

### 회원 신청 모드
- **Write 시점**: STEP 3 제출 시 (한 번만, atomic transaction)
- **Write 내용**: 
  - teams/{teamId} 문서 생성
  - membership_conversions/{id} 문서 생성

---

## 🔔 알림 트리거

### 비회원 모드
- 팀 생성 완료 토스트 메시지
- 팀 관리 페이지로 자동 이동

### 회원 신청 모드
- 신청 완료 토스트 메시지
- "승인 대기 중" 상태 표시
- 협회 관리자에게 신청 알림 (선택)

### 협회 승인 시
- 팀에게 승인 완료 알림
- 회원 권한 즉시 활성화 (재로그인 불필요)

