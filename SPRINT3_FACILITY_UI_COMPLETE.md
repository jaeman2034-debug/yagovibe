# Sprint 3: 대관(Facility) UI/UX 구현 완료

## ✅ 완료된 작업

### 1. 데이터 스키마 정의
- `src/types/facility.ts` 생성
- `FacilitySlotStatus`: "available" | "blocked" | "event"
- `FacilitySlot` 인터페이스 정의

### 2. 컴포넌트 생성

#### 상태 관련
- `FacilitySlotStatusBadge` - 상태 배지 (사용 가능/사용 불가/행사 사용)

#### 카드 및 리스트
- `FacilitySlotCard` - 슬롯 카드 (Public)
- `FacilityEmptyState` - Empty State

### 3. 페이지 생성

#### Public
- `FacilityListPage` - 대관 현황 페이지 (읽기 전용)
  - 날짜 선택
  - 날짜별 슬롯 표시
  - 공식 기준 안내 문구
  - 전화/카톡 차단 장치

#### Admin
- `FacilityManagementPage` - 대관 관리 페이지
  - 토글 중심 UX
  - 날짜/시간 입력
  - 상태 토글 (available/blocked/event)
  - 충돌 방지 로직 (클라이언트)
  - 슬롯 삭제

### 4. 라우팅 추가
- `/association/:associationId/facility` - Public 리스트
- `/association/:associationId/admin/facility` - Admin 관리

## 📐 데이터 스키마 (MVP 확정)

```typescript
FacilitySlot {
  id: string
  associationId: string
  date: string  // YYYY-MM-DD
  timeStart: string  // HH:mm
  timeEnd: string  // HH:mm
  status: 'available' | 'blocked' | 'event'
  note?: string
  updatedAt: Timestamp
}
```

## 🎯 충돌 방지 로직

- 동일 날짜/시간에 기존 슬롯 존재 체크
- 시간 겹침 체크 (시작/종료 시간 겹침)
- 에러 메시지: "해당 시간대에 이미 등록된 대관 상태가 있습니다."

## ✅ UX 핵심 규칙 적용

### Public
- 읽기 전용
- status만 표시 (사유·연락처 ❌)
- 공식 기준 안내 문구 필수
- Empty State 필수

### Admin
- 토글 중심 UX
- 드래그 ❌
- 복잡한 캘린더 ❌
- 토글 + 저장만

### 절대 구현하지 않음
- 사유/연락처 표시 (Public)
- 개별 문의 기능
- 예외 적용 기능

## 🎯 결과

- ✅ "여기 비었죠?" 전화 ❌
- ✅ "행사 있는 줄 몰랐다" 분쟁 ❌
- ✅ 기준 화면 고정 완료

---

**다음 단계: Sprint 4 - Tournament 참가/결제/선수명단(조인KFA 검증) + 대진표 확정 버튼**

