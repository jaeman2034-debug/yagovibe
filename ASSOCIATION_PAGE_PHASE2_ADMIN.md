# 협회 공식 페이지 Phase 2: 관리자 편집 모드 확장 지시문 (Cursor Architect Mode)

⚠️ **이 지시문은 Phase 1 MVP 아키텍처가 이미 고정되어 있음을 전제로 한다.**
**구조 변경·섹션 추가·라우팅 변경은 절대 금지다.**

---

## 🎯 Phase 2 목적 정의

**핵심 원칙**: Phase 2의 목적은 기능 확장이 아니다. 기존 Association Official Page에 **"관리자 편집 권한"을 조용히 추가**하는 것이다.

- ❌ 새로운 페이지 생성
- ❌ 관리자 전용 대시보드
- ❌ 메뉴 추가
- ❌ UI 재설계

- ⭕ 동일 페이지
- ⭕ 동일 컴포넌트
- ⭕ 권한에 따른 Edit Mode만 추가

---

## ⚠️ Phase 2 핵심 원칙 (절대 위배 금지)

### ❌ 금지 사항

- ❌ 기존 IA 변경
- ❌ 섹션 추가
- ❌ UI 변경 (최소화)
- ❌ "관리자 페이지" 별도 생성
- ❌ 결제/회계/선수DB/유소년 신청 (이건 Phase 3)

### ⭕ 필수 사항

- ⭕ 동일 페이지 (AssociationOfficialPage)
- ⭕ 동일 컴포넌트 구조
- ⭕ 권한에 따라 행동만 달라짐
- ⭕ 관리자 버튼은 hover 시에만 노출
- ⭕ 일반 사용자는 관리 기능 존재 자체를 모름

---

## 1️⃣ Edit Mode 개념 모델 (핵심)

```
AssociationOfficialPage
 ├─ ViewMode (public)          ← Phase 1 MVP 그대로
 └─ EditMode (association_admin only)  ← Phase 2 추가
```

**원칙**: 
- ViewMode: Phase 1 MVP 그대로
- EditMode: 동일 UI + 편집 인터랙션만 활성화

---

## 2️⃣ 권한 모델 (최소)

```typescript
type UserRole = 
  | "public"              // 일반 사용자
  | "association_admin";  // 협회 관리자 (Phase 2 추가)
```

**권한 판별 규칙**:
- boolean 수준이면 충분 (`isAdmin: boolean`)
- 복잡한 RBAC ❌
- 권한 체크는 간단하게: `associations/{associationId}/admins/{userId}` 존재 여부

---

## 3️⃣ 관리자 진입 방식 (Hidden)

**규칙**:
- URL 구조 변경 ❌
- Header 메뉴 변경 ❌

**허용 방식**:

### 옵션 1: URL 쿼리 파라미터 (권장)
```
/associations/:associationId?mode=admin
```

### 옵션 2: 내부 토글
- 페이지 내부에 숨겨진 토글
- 환경 변수 기반

**핵심 원칙**: 👉 **일반 사용자는 관리자 모드 존재를 알 수 없어야 한다**

---

## 4️⃣ 섹션별 Edit Mode 확장 규칙

⚠️ **기존 섹션에만 추가한다**

### 4-1. NoticeSection (공지)

**추가 기능**:
- Create / Edit / Delete
- Draft / Published 상태 관리

**데이터 모델**:
```typescript
interface Notice {
  title: string;
  content: string;
  status: "draft" | "published";  // Phase 2 추가
  updatedAt: Timestamp;  // Phase 2 추가
}
```

**UI 규칙**:
- Edit 버튼은 hover 시에만 표시
- public 사용자는 절대 보이지 않음

---

### 4-2. TournamentSection (대회)

**추가 기능**:
- 대회 정보 수정
- 대진표 링크/파일 연결
- 결과 입력

**데이터 모델**:
```typescript
interface Tournament {
  name: string;
  dateRange: { start: Timestamp; end: Timestamp };
  location: string;
  rulesRef?: string;  // Phase 2 추가
  resultsRef?: string;  // Phase 2 추가
}
```

⚠️ **대회 개수 늘리기 ❌**
⚠️ **대회 생성 UI ❌** (Phase 3)

---

### 4-3. FacilitySection (대관 — 최중요)

**Edit Mode에서만 가능**:
- 시간 슬롯 상태 변경
- 대회 일정 슬롯 강제 잠금

**데이터 모델**:
```typescript
interface ReservationSlot {
  date: Date;
  time: string;
  status: "available" | "blocked" | "event";  // Phase 2 추가
  lockedBy?: string;  // Phase 2 추가 (association_admin)
}
```

**중요 규칙**:
- 신청 기능 ❌
- 승인 워크플로우 ❌
- 관리자는 **"잠금/해제"만 가능**

---

### 4-4. StorySection

**추가 기능**:
- 스토리 승인 / 비노출
- 노출 순서 조정

**데이터 모델**:
```typescript
interface Story {
  title: string;
  status: "visible" | "hidden";  // Phase 2 추가
  createdAt: Timestamp;
}
```

### 4-5. ClubSummarySection

- Edit Mode에서도 수정 ❌
- Phase 2에서는 참조 전용

---

## 5️⃣ UI 원칙 (절대 위반 금지)

**관리자 버튼 규칙**:
- 아이콘 + hover
- "관리자 화면"이라는 느낌 ❌
- 기존 레이아웃 변경 ❌

👉 **같은 페이지, 다른 권한**

---

## 6️⃣ 데이터 확장 규칙

**기존 데이터 구조에 필드만 추가한다**:
- `+ status`
- `+ lockedBy`
- `+ updatedAt`

**금지 사항**:
- 컬렉션 추가 ❌
- 관계 변경 ❌

---

## 6-1. Phase 2 데이터 확장 (Firestore 구조)

### Notice 확장

```
notices/{noticeId}
  └─ status: "draft" | "published"  (Phase 2 추가)
  └─ author: string (UID)
```

### Reservation 확장

```
bookings/{bookingId}  또는
associations/{associationId}/schedules/{date}
  └─ slots[].lockedBy?: string (관리자 UID)
  └─ slots[].tournamentId?: string (대회 전용)
```

### Tournament 확장

```
tournaments/{tournamentId}
  └─ managedBy?: string (관리자 UID)
  └─ results?: { ... } (결과 데이터)
```

### Story 확장

```
stories/{storyId}
  └─ status: "pending" | "published" | "hidden"  (Phase 2 추가)
  └─ approvedBy?: string
  └─ approvedAt?: Timestamp
```

---

## 7️⃣ Phase 2 성공 기준 (Cursor 판단 기준)

**단일 질문**:
> "협회 관리자가 공지 / 대회 / 대관을 전화·엑셀 없이 이 화면에서 직접 통제할 수 있는가?"

- **YES → 성공**
- **NO → 실패**

---

## 8️⃣ Phase 2에서 절대 하지 말 것

- ❌ 결제
- ❌ 회계
- ❌ 클럽 로그인
- ❌ 선수 관리
- ❌ 유소년 기능
- ❌ 관리자 전용 페이지 생성

---

## 9️⃣ 관리자 권한 체크 구조

```typescript
// hooks/useAssociationAdmin.ts
export function useAssociationAdmin(associationId: string) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    
    // associations/{associationId}/admins/{userId} 확인
    // 또는 associations/{associationId}.admins 배열 확인
    checkAdminPermission(associationId, user.uid)
      .then(setIsAdmin)
      .finally(() => setLoading(false));
  }, [associationId, user?.uid]);
  
  return { isAdmin, loading };
}
```

**Firestore 구조**:
```
associations/{associationId}
  └─ admins: string[]  // 관리자 UID 배열
  또는
associations/{associationId}/admins/{userId}
  └─ role: "admin"
  └─ addedAt: Timestamp
```

---

## 🔟 Phase 2 컴포넌트 확장 패턴

### 기존 컴포넌트 확장 (새 컴포넌트 생성 금지)

**패턴**:
```typescript
// Phase 1 (MVP)
interface AssociationNoticeSectionProps {
  associationId: string;
  limit?: number;
}

// Phase 2 (확장)
interface AssociationNoticeSectionProps {
  associationId: string;
  limit?: number;
  // Phase 2 추가
  userRole?: UserRole;  // 선택적 (기본값: "public")
  onCreateNotice?: () => void;
  onEditNotice?: (noticeId: string) => void;
  onDeleteNotice?: (noticeId: string) => void;
}
```

**구현 원칙**:
- 기존 컴포넌트에 props만 추가
- 조건부 렌더링으로 관리자 기능 표시
- userRole이 없거나 "public"이면 MVP 동작 유지

---

## 1️⃣1️⃣ 관리자 액션 모달/폼 구조

### 공지 작성/편집 모달

```typescript
<NoticeEditModal
  associationId={string}
  noticeId?: string  // 없으면 새로 작성
  onSave={(notice) => void}
  onCancel={() => void}
/>
```

### 대회 편집 모달

```typescript
<TournamentEditModal
  associationId={string}
  tournamentId={string}
  onSave={(tournament) => void}
  onCancel={() => void}
/>
```

### 대관 슬롯 관리 모달

```typescript
<SlotManagementModal
  facilityId={string}
  date={Date}
  timeSlot={TimeSlot}
  onLock={(slot, reason) => void}
  onUnlock={(slot) => void}
  onSetTournament={(slot, tournamentId) => void}
  onCancel={() => void}
/>
```

---

## 1️⃣2️⃣ Phase 2 구현 체크리스트

- [ ] `useAssociationAdmin` Hook 생성 (권한 체크)
- [ ] URL 쿼리 파라미터 `?mode=admin` 처리
- [ ] PermissionContext 생성 (페이지 레벨)
- [ ] 각 섹션 컴포넌트에 `userRole` prop 추가
- [ ] NoticeSection 관리자 기능 (생성/수정/삭제)
- [ ] TournamentSection 관리자 기능 (편집/대진표/결과)
- [ ] FacilitySection 관리자 기능 (슬롯 잠금/해제)
- [ ] StorySection 관리자 기능 (승인/숨기기)
- [ ] 관리자 버튼 hover 노출 스타일
- [ ] 관리자 액션 모달 컴포넌트 (4개)
- [ ] Firestore 데이터 모델 확장 (status 필드 등)
- [ ] Cloud Functions API (Create/Update/Delete)

---

## 🎯 Cursor 최종 인식 문장

> **Phase 2는 확장이 아니라 '권한 주입'이다. 구조는 건드리지 말고, 행동만 바꿔라.**

---

## ⚠️ Phase 2 위배 시나리오 (금지)

### ❌ 위배 예시 1: 새 섹션 추가

```
❌ 잘못된 확장
AssociationOfficialPage
 ├─ ... (기존 섹션)
 └─ AdminDashboardSection  ← 새 섹션 추가 금지!
```

**올바른 방식**: 기존 섹션에 관리 기능만 추가

---

### ❌ 위배 예시 2: 별도 관리자 페이지

```
❌ 잘못된 구조
/associations/:id          (일반 페이지)
/associations/:id/admin    (관리자 페이지) ← 별도 페이지 금지!
```

**올바른 방식**: 동일 페이지, 쿼리 파라미터로 모드 전환

---

### ❌ 위배 예시 3: 항상 보이는 관리자 메뉴

```
❌ 잘못된 UI
Header
 └─ [관리자 메뉴]  ← 항상 보이는 메뉴 금지!
```

**올바른 방식**: hover 시에만 버튼 노출

---

## 📋 Phase 2 최종 원칙 요약

1. **MVP 구조 절대 변경 금지**
2. **섹션 추가 금지**
3. **관리 기능은 기존 섹션에만 추가**
4. **관리자 UI는 hover 시에만 노출**
5. **동일 페이지, 동일 컴포넌트**
6. **공식성 유지 (관리 페이지처럼 보이지 않음)**

---

**이 지시문을 기반으로 Phase 2 확장 구조를 설계하시오.**

