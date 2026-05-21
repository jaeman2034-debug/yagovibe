# 공지 시스템 패턴 템플릿

공지 시스템을 기준으로 대회/시설 등 다른 엔티티에 동일 패턴을 적용하기 위한 템플릿입니다.

## 📁 파일 구조

```
src/
├── types/
│   └── notice.ts                    # 타입 정의
├── hooks/
│   └── useNotices.ts                # 목록 조회 훅
├── components/association/notice/
│   ├── NoticeEditDrawer.tsx         # 등록/수정 Drawer
│   ├── NoticeCard.tsx               # 카드 컴포넌트
│   └── NoticeAdminTable.tsx         # 관리자 테이블
├── pages/association/
│   ├── NoticeListPage.tsx           # 목록 페이지
│   └── NoticeDetailPage.tsx         # 상세 페이지
└── utils/
    └── noticeValidation.ts          # Validation 유틸리티
```

## 🔄 적용 방법 (Tournament 예시)

### 1. 타입 정의 (`src/types/tournament.ts`)

```typescript
// Notice 패턴 기반
export type TournamentStatus = "draft" | "published" | "archived";
export type TournamentVisibility = "public" | "member" | "admin";

export interface Tournament {
  id: string;
  associationId: string;
  title: string;
  content: string; // 본문 추가
  status: TournamentStatus;
  visibility?: TournamentVisibility;
  isPinned?: boolean;
  isOfficial?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  // Tournament 전용 필드
  dateStart: Timestamp;
  dateEnd: Timestamp;
  venue: string;
  // ... 기타 필드
}
```

### 2. Hook 생성 (`src/hooks/useTournaments.ts`)

```typescript
// useNotices.ts 패턴 그대로 복사
// notices → tournaments 변경
// Notice → Tournament 타입 변경
// 나머지 로직 동일
```

### 3. EditDrawer 생성 (`src/components/association/tournament/TournamentEditDrawer.tsx`)

```typescript
// NoticeEditDrawer.tsx 패턴 그대로 복사
// Notice → Tournament 변경
// noticeValidation → tournamentValidation 변경
// 나머지 로직 동일
```

### 4. ListPage 업데이트 (`src/pages/association/TournamentListPage.tsx`)

```typescript
// NoticeListPage.tsx 패턴 그대로 복사
// useNotices → useTournaments
// NoticeEditDrawer → TournamentEditDrawer
// 나머지 로직 동일
```

## ✅ 공통 패턴

### Validation
- 제목: 최소 2자, 최대 200자
- 본문: 필수, 최대 10,000자, 플레이스홀더 차단
- 공백만 입력 차단

### 저장 로직
- `serverTimestamp()` 사용
- `createdAt`, `updatedAt` 필수
- `createdBy`, `updatedBy` 필수

### UX
- 저장 중 로딩 스피너
- 성공/실패 Toast
- 변경사항 확인 (Drawer 닫기 시)
- 자동 목록 갱신

### 권한
- 관리자 모드: draft 포함 조회
- 일반 모드: published만 조회
- 수정/삭제: 관리자만 가능

