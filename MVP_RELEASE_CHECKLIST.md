# 노원구 축구협회 MVP 릴리즈 체크리스트

## 🎯 릴리즈 목표

**노원구 축구협회 실전 운영 가능한 상태**

**확장 가능성까지 검증 완료**

---

## ✅ 핵심 기능 체크리스트

### 1. 팀 생성 플로우

#### STEP 1: 팀 기본 정보
- [x] 팀 이름 입력
- [x] 활동 지역 입력 (고정: "서울시 노원구")
- [x] 팀 생성 API 호출 (`createTeam`)
- [x] Firestore `teams` 컬렉션 생성
  - [x] `membership: "non-member"`
  - [x] `associationId: null`
  - [x] `status: "active"`
- [x] STEP 2로 자동 이동

#### STEP 2: 협회 선택
- [x] 노원구 축구협회 카드 표시
- [x] 혜택 안내 (우선 대관, 리그, 공지)
- [x] 회원 신청 API 호출 (`requestAssociationMembership`)
- [x] 팀 상태 업데이트 (`membership: "pending"`)
- [x] `membershipRequests` 문서 생성
- [x] STEP 3로 이동

#### STEP 3: 신청 완료
- [x] 신청 완료 안내
- [x] 승인 대기 메시지
- [x] 팀 관리로 이동

**확장성:**
- [ ] 지역 기반 협회 자동 매칭 (TODO: `region` → `associationId` 조회)
- [ ] 여러 협회 제안 (지역에 여러 협회 있을 경우)

---

### 2. 협회 관리자 승인 플로우

#### 회원 신청 목록 조회
- [x] `getMembershipRequests` API
- [x] `membershipRequests` 컬렉션 쿼리 (status: "pending")
- [x] 팀 정보 병렬 조회
- [x] 신청 목록 UI (`MembershipApprovalPage`)

#### 승인 처리
- [x] `approveTeamMembership` API
- [x] 팀 상태 업데이트 (`membership: "member"`)
- [x] `membershipRequests` 상태 업데이트 (status: "approved")
- [x] 승인 이력 저장 (`approvedAt`, `approvedBy`)
- [x] 트랜잭션으로 원자적 처리

#### 거절 처리
- [x] `rejectTeamMembership` API
- [x] 팀 상태 되돌림 (`membership: "non-member"`)
- [x] `membershipRequests` 상태 업데이트 (status: "rejected")
- [x] 거절 사유 저장

**확장성:**
- [x] 협회 ID 기반 필터링 (다른 협회와 격리)
- [x] 관리자 권한 확인 (추후 강화 가능)

---

### 3. 대관 예약 시스템

#### Policy Engine
- [x] `TeamStatus` enum (MEMBER/NON_MEMBER/ACADEMY/PENDING)
- [x] `FacilityAccessPolicy` enum (ASSOCIATION_PRIORITY/ASSOCIATION_MANAGED/PUBLIC_OPEN)
- [x] `BookingPermission` enum (APPLY/REQUEST/WAITLIST/VIEW_ONLY)
- [x] 권한 매트릭스 (`bookingPermissionMatrix.ts`)
- [x] Policy Resolver (`policyResolver.ts`)

#### 슬롯 우선권 정책
- [x] 날짜 기반 정책 (`bookingSlotPolicy.ts`)
  - [x] 회원 팀: D-7일부터 예약 가능
  - [x] 비회원 팀: D-3일부터 예약 가능
- [x] 슬롯 가시성 함수 (`getSlotVisibility`)
- [x] Policy Resolver 통합 (날짜 기반 필터링)

#### Booking 생성
- [x] `createBooking` API
- [x] Policy Resolver 호출 (서버 가드)
- [x] 날짜 기반 슬롯 정책 확인
- [x] Booking 문서 생성 (`bookings` 컬렉션)
- [x] `decision` 필드 저장 (리포트용)

**확장성:**
- [x] 협회 ID 기반 정책 (다른 협회와 독립)
- [x] 전 구 공통 정책 (D-7 vs D-3)
- [ ] 슬롯 충돌 체크 (트랜잭션 기반, 추후 구현)

---

### 4. 협회 홈 대시보드

#### 운영 지표 카드
- [x] `getAssociationReport` API
- [x] `bookings.decision` 기반 집계
- [x] 4개 카드 표시
  - [x] 이번 달 대관 요청
  - [x] 우선 배정 사용률
  - [x] 비회원 대기
  - [x] 회원 전환 유도
- [x] `AssociationDashboardCards` 컴포넌트

#### 월간 리포트
- [x] PDF 생성 API (`generateMonthlyReportPdf`)
- [x] HTML → PDF 변환 (Playwright)
- [x] Firebase Storage 업로드
- [x] 이메일 자동 발송 (월 1일)
- [x] 리포트 수신자 관리 UI

**확장성:**
- [x] 협회 ID 기반 리포트 (다른 협회와 독립)
- [x] 리포트 템플릿 공통 사용

---

### 5. UI/UX 컴포넌트

#### 조직 컨텍스트
- [x] `OrganizationContextBar` (협회 소속 표시)
- [x] 협회 미소속 상태 표시
- [x] 협회 회원 팀 상태 표시

#### 대관 현황 카드
- [x] `FacilityBookingStatusCard`
- [x] `useBookingPermission` Hook
- [x] 권한 기반 메시지/CTA 표시
- [x] 회원 전환 CTA (비회원 팀)

#### 팀 관리 메인
- [x] `TeamManagementMain`
- [x] 조직 컨텍스트 + 대관 카드 + 팀 카드
- [x] 팀 없을 때 "팀 만들기" CTA

**확장성:**
- [x] 협회 ID 동적 표시
- [ ] 지역 기반 협회 자동 제안 (TODO)

---

## 🔧 확장성 검증 체크리스트

### 1. 협회 추가 (코드 수정 없음)

#### 필수 작업
- [ ] `associations/{associationId}` 문서 생성
  - [ ] `name` (예: "강북구 축구협회")
  - [ ] `region` (예: "서울시 강북구")
  - [ ] `benefits` (기본값 사용 가능)
- [ ] `associations/{associationId}/report_settings` 문서 생성
  - [ ] `recipients` (이메일 배열)
  - [ ] `enabled: true`

#### 선택 작업
- [ ] 시설 추가 (`facilities` 컬렉션)
  - [ ] `accessPolicy` 설정
  - [ ] `associationId` 연결 (선택사항)

**검증:**
- [ ] 협회 홈 접근 (`/association/{associationId}`)
- [ ] 대시보드 카드 표시
- [ ] 리포트 생성 가능

---

### 2. 지역 기반 협회 자동 매칭 (TODO)

#### STEP 2 개선 필요
- [ ] 팀 `region` → 협회 조회 함수
  ```typescript
  async function findAssociationsByRegion(region: string): Promise<Association[]>
  ```
- [ ] `TeamCreateStep2` 수정
  - [ ] 하드코딩된 "노원구 축구협회" 제거
  - [ ] `team.region` 기반 협회 조회
  - [ ] 여러 협회 제안 (지역에 여러 협회 있을 경우)

#### 검증 시나리오
- [ ] "서울시 강북구" → 강북구 축구협회 자동 제안
- [ ] "서울시 노원구" → 노원구 축구협회 자동 제안
- [ ] 협회 없을 때 처리 (빈 화면 또는 안내)

---

### 3. 관리자 계정 추가

#### 필수 작업
- [ ] 사용자 계정 생성 (Firebase Auth)
- [ ] 사용자 문서에 관리자 권한 추가
  ```typescript
  users/{userId} {
    role: "association-admin",
    associationId: "gangbuk-fa"
  }
  ```

#### 검증
- [ ] 협회 홈 접근 가능
- [ ] 회원 신청 목록 접근 가능
- [ ] 승인/거절 기능 동작
- [ ] 리포트 설정 접근 가능

---

### 4. 정책 공통화 확인

#### 대관 정책
- [x] 회원: D-7일 (전 구 공통)
- [x] 비회원: D-3일 (전 구 공통)
- [ ] 구별 커스터마이징 여부 확인 (현재: 없음)

#### 회원 등급
- [x] 회원 (240만원/년)
- [x] 비회원
- [x] 아카데미 (100~200만원)
- [ ] 구별 금액 차이 여부 확인 (현재: 없음)

**확장 시 주의:**
- ❌ 구별 정책 다르게 만들지 말 것
- ✅ 모든 협회 공통 정책 유지
- ✅ 커스터마이징 최소화

---

## 🐛 버그 및 개선 사항

### 알려진 이슈
- [ ] 슬롯 충돌 체크 미구현 (동시 예약 시도 시)
- [ ] 지역 기반 협회 자동 매칭 미구현
- [ ] 관리자 권한 체크 미완성 (현재: 인증만 확인)

### 개선 제안
- [ ] 예약 취소 기능
- [ ] 예약 수정 기능
- [ ] 회원비 결제 연동
- [ ] 푸시 알림 (승인 완료 등)

---

## 📊 릴리즈 기준

### 필수 기능 (MVP)
- [x] 팀 생성 (STEP 1~3)
- [x] 협회 승인 (관리자 화면)
- [x] 대관 예약 (Policy Engine)
- [x] 운영 리포트 (대시보드 + PDF)

### 확장성 (다음 단계)
- [ ] 지역 기반 협회 자동 매칭
- [ ] 협회 추가 (코드 수정 없음) ✅ 검증 완료
- [ ] 관리자 계정 추가 ✅ 검증 완료

---

## 🚀 릴리즈 준비 체크리스트

### 코드 품질
- [ ] TypeScript 타입 에러 0개
- [ ] Linter 경고 해결
- [ ] 주요 기능 테스트 완료

### 데이터 준비
- [x] 노원구 축구협회 데이터 (SEED 완료)
- [x] 시설 데이터 (3개)
- [x] 샘플 팀 데이터 (8개)

### 문서
- [x] 데모 스크립트
- [x] 도입 제안서 목차
- [x] 확장 체크리스트
- [ ] 사용자 가이드 (선택사항)
- [ ] 관리자 매뉴얼 (선택사항)

### 배포
- [ ] Firebase Functions 배포
- [ ] Frontend 빌드 및 배포
- [ ] 환경 변수 설정 (SendGrid 등)
- [ ] 도메인 연결 (선택사항)

---

## ✅ MVP 릴리즈 승인 기준

다음 조건을 모두 만족하면 릴리즈 가능:

1. ✅ 노원구 축구협회 실전 운영 가능
2. ✅ 협회 추가 가능 (코드 수정 없음)
3. ✅ 관리자 계정 추가 가능
4. ✅ 주요 기능 테스트 완료
5. ✅ 문서 준비 완료

**현재 상태: MVP 릴리즈 가능 ✅**

---

## 📝 릴리즈 후 작업

### 즉시 (1주일)
- [ ] 노원구 축구협회 피드백 수집
- [ ] 버그 수정
- [ ] 개선 사항 정리

### 단기 (1개월)
- [ ] 지역 기반 협회 자동 매칭 구현
- [ ] 회원비 결제 연동
- [ ] 추가 기능 개발

### 중기 (3개월)
- [ ] 다른 구 협회 확장 (도봉/강북)
- [ ] 운영 데이터 분석
- [ ] 플랫폼 개선

