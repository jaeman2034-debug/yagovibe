# Sprint 7: 권한·역할·브랜딩 확정 구현 완료

## ✅ 완료된 작업

### 1. 권한 모델 정의

#### Role 타입
- `guest` - 비회원
- `member` - 회원
- `admin` - 협회 관리자
- `super_admin` - 플랫폼 운영자

#### 권한 매트릭스
| 기능 | guest | member | admin | super_admin |
|------|-------|--------|-------|-------------|
| 공지 읽기 | ⭕ | ⭕ | ⭕ | ⭕ |
| 대회 보기 | ⭕ | ⭕ | ⭕ | ⭕ |
| 참가 신청 | ❌ | ⭕ | ⭕ | ⭕ |
| 회비 상태 | ❌ | ⭕ | ⭕ | ⭕ |
| Admin CRUD | ❌ | ❌ | ⭕ | ⭕ |
| 브랜드 설정 | ❌ | ❌ | ⭕ | ⭕ |

### 2. 라우팅 가드 유틸리티

- `requireRole` - 역할 체크
- `hasPermission` - 권한 체크
- `withRoleGuard` - 컴포넌트 래퍼 (예시)

### 3. 협회별 브랜딩

- `AssociationTheme` 타입
- `useAssociationTheme` Hook
- 기본 테마 (fallback)

### 4. 역할 조회 Hook

- `useAssociationRole` - 협회별 역할 조회

### 5. 공통 고정 문구

- `OfficialStandardFooter` - 전국 공통 문구

## 🎯 핵심 원칙 (확정)

### 권한 모델
- 버튼 자체를 권한별로 렌더링 분기 (숨김, 비활성 ❌)
- 화면/API 이중 잠금

### 브랜딩
- 콘텐츠(기록)는 절대 변형 없음
- 껍데기만 다름
- 적용 범위: 헤더, 버튼 강조, 배지, 인쇄/PDF

### 다중 협회 구조
- 모든 핵심 테이블에 associationId 필수
- 쿼리 시 항상 association scope
- 같은 코드, 다른 데이터

## ✅ 완료 체크

- ✅ 권한 모델 타입 정의
- ✅ 권한 매트릭스
- ✅ 라우팅 가드 유틸리티
- ✅ 협회별 브랜딩 구조
- ✅ 역할 조회 Hook
- ✅ 공통 고정 문구

---

**다음 단계: Sprint 8 - 공식 시스템 배지 + 첫 접속 UX(데모 플로우)**

Phase 5 사실상 완료. 전국 확장 구조 완성.

