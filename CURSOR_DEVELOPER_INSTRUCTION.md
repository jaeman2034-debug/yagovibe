# 🔥 어드민 대시보드 백엔드 API 전환 작업 지시문

## ✅ 1. 현황 요약

### 발견된 기존 페이지

#### `AdminDashboard.tsx` → `/app/admin/dashboard`
- **기능**: 유저 현황 통계, 온보딩 퍼널, SMS 인증 로그
- **데이터 소스**: Firestore 직접 조회
- **위치**: `src/pages/admin/AdminDashboard.tsx`

#### `AdminHome.tsx` → `/app/admin/home`
- **기능**: AI 도우미, 리포트 통계, 배포 관리
- **데이터 소스**: Firestore 직접 조회
- **위치**: `src/pages/admin/AdminHome.tsx`

### 현재 구조적 문제

❌ **프론트엔드는 여전히 Firestore 직접 조회 방식**
✅ **백엔드에는 이미 `/api/admin/dashboard/*` 계열의 API가 구현되어 있으나 사용되지 않음**

➡ **프론트-백엔드 분리가 안 된 레거시 구조 상태**

---

## 🎯 2. 목표

기존 Firestore 의존 대시보드를 **백엔드 API 기반 구조로 전환**

특히 다음 데이터를 백엔드에서 일원화:
- League / Story 데이터
- 동기화 상태
- 통계 정보

---

## 📋 3. 작업 지시 (구체)

### 3.1 AdminDashboard.tsx 수정

#### 변경 사항
1. `fetchAdminData` 함수에 백엔드 API 호출 추가
2. Firestore 직접 조회 제거
3. 아래 엔드포인트 사용:

```typescript
// 사용할 백엔드 API 엔드포인트
GET /api/admin/dashboard/summary
GET /api/admin/dashboard/health
GET /api/admin/dashboard/stories
GET /api/leagues
GET /api/stories
```

#### 데이터 흐름 변경

**현재:**
```
AdminDashboard.tsx → Firestore (직접 조회)
```

**변경 후:**
```
AdminDashboard.tsx → Backend API (localhost:3001) → Prisma (임시 메모리 스토어)
```

### 3.2 신규 영역 추가

대시보드에 다음 섹션 추가:

1. **e스포츠 리그 현황**
   - 리그 목록
   - 리그 수 카운트
   - 활성 리그 상태

2. **스토리 현황**
   - 스토리 수 카운트
   - 상태별 분류 (PUBLISHED, DRAFT, EXPIRED 등)

3. **동기화 상태**
   - 마지막 동기화 시간
   - 동기화 상태 배지 (성공/실패)
   - 동기화 버튼 (수동 트리거)

---

## 💡 4. 제안 구현 방향

### 옵션 1: 기존 대시보드 확장 (우선 추천) ⭐

- 현재 UI 유지
- e스포츠 섹션만 추가
- API 연결 교체

**장점**: 기존 사용자 경험 유지, 빠른 구현

### 옵션 2: 신규 컴포넌트 분리

- `AdminEsportsPanel.tsx` 생성
- 기존 대시보드에 임베딩

**장점**: 모듈화, 재사용성

---

## 🔧 5. 구현 상세

### 5.1 API 호출 함수 예시

```typescript
// src/lib/api/admin.ts (신규 생성 또는 기존 파일 수정)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export async function fetchDashboardSummary(region: string = 'seoul') {
  const response = await fetch(`${API_BASE}/api/admin/dashboard/summary?region=${region}`);
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
}

export async function fetchLeagues(region?: string) {
  const url = region 
    ? `${API_BASE}/api/leagues?region=${region}`
    : `${API_BASE}/api/leagues`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch leagues');
  return response.json();
}

export async function fetchStories(region?: string) {
  const url = region
    ? `${API_BASE}/api/stories?region=${region}`
    : `${API_BASE}/api/stories`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch stories');
  return response.json();
}
```

### 5.2 타입 정의

백엔드 API 응답 기준으로 타입 정의:

```typescript
// src/types/admin.ts (신규 생성 또는 기존 파일 수정)
export interface DashboardSummary {
  kpi: {
    storyImp: number;
    storyClick: number;
    storyCtr: number;
    bookingStart: number;
    paymentSuccess: number;
    paymentFail: number;
    revenue: number;
    // ... 기타 KPI 필드
  } | null;
  risk: {
    lowCtrStories: string[];
    apiError: number;
    currentCtr: number;
    isLowCtr: boolean;
  };
  timestamp: string;
}

export interface League {
  id: string;
  region: string;
  name: string;
  startAt: string;
  endAt: string;
  season?: string;
  status?: string;
}

export interface Story {
  id: string;
  region: string;
  source: string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  startAt: string;
  endAt: string;
  // ... 기타 필드
}
```

### 5.3 AdminDashboard.tsx 수정 예시

```typescript
// 기존 Firestore 조회 제거
// useEffect(() => {
//   const unsubUsers = onSnapshot(collection(db, "users"), ...);
// }, []);

// 백엔드 API 호출로 교체
useEffect(() => {
  const loadDashboardData = async () => {
    try {
      const [summary, leagues, stories] = await Promise.all([
        fetchDashboardSummary('seoul'),
        fetchLeagues('seoul'),
        fetchStories('seoul'),
      ]);
      
      setDashboardData({ summary, leagues, stories });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };
  
  loadDashboardData();
}, []);
```

---

## ✅ 6. 체크리스트

작업 완료 후 확인:

- [ ] Firestore 직접 조회 코드 제거됨
- [ ] 백엔드 API 호출 함수 구현됨
- [ ] 타입 정의가 백엔드 스펙과 일치함
- [ ] e스포츠 리그 현황 섹션 추가됨
- [ ] 스토리 현황 섹션 추가됨
- [ ] 동기화 상태 표시 추가됨
- [ ] 에러 핸들링 구현됨
- [ ] 로딩 상태 표시됨

---

## 📝 7. 참고 사항

### 백엔드 API 엔드포인트 목록

```
GET /api/admin/dashboard/summary?region=seoul
GET /api/admin/dashboard/health?region=seoul
GET /api/admin/dashboard/stories?region=seoul
GET /api/admin/dashboard/experiments
GET /api/admin/dashboard/settlements
GET /api/leagues?region=seoul
GET /api/stories?region=seoul
```

### 환경 변수

백엔드 API URL은 환경 변수로 관리:
```env
VITE_API_BASE=http://localhost:3001
```

---

## 🚀 8. 요청 사항

1. **백엔드 API 기반으로 전환 작업 진행**
2. **Firestore 의존 코드 제거**
3. **타입 인터페이스는 백엔드 스펙 기준으로 정의**
4. **에러 핸들링 및 로딩 상태 처리 포함**

---

**작업 완료 후 코드 리뷰 및 연결 테스트 진행 예정** 🎯
