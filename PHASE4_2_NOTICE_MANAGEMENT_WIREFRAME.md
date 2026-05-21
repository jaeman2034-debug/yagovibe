# Phase 4-2: 공지 관리 시스템 와이어프레임

**디자인/색상 ❌, 구조만 ⭕ — 개발자 바로 구현 가능**

---

## 화면 1) 공지 관리 목록 (사무국 전용)

### URL
```
/association/:associationId/admin/notices
```

### 권한
- 접근: 사무국(Admin)만
- Public 접근 ❌

### 구조

#### [상단]
- 페이지 타이틀: **공지 관리**
- 버튼: **+ 새 공지 작성**

#### [필터 영역]
- 상태 필터: **전체 | 게시중 | 예약 | 종료**
- 기간 필터: **시작일 ~ 종료일**

#### [리스트 테이블]
| 제목 | 상태 | 게시기간 | 상단고정 | 마지막 수정 | 액션 |
|------|------|----------|----------|-------------|------|
| 제목1 | 게시중 | 2025-01-01 ~ 2025-01-31 | ⭐ | 2025-01-15 | [편집] [미리보기] [게시/중지] |
| 제목2 | 예약 | 2025-02-01 ~ 2025-02-28 | - | 2025-01-20 | [편집] [미리보기] [게시/중지] |

- 액션: **[편집] [미리보기] [게시/중지]**

---

## 화면 2) 공지 작성/수정 (핵심)

### URL
```
/association/:associationId/admin/notices/new
/association/:associationId/admin/notices/:noticeId/edit
```

### 구조

#### [기본 정보]
- **제목** (필수)
- **공지 유형**: 일반 | 대회 | 대관
- **상단 고정**: ON/OFF

#### [내용]
- **본문** (리치텍스트)
- **첨부**: 이미지/파일 (선택)

#### [게시 설정]
- **게시 시작일/시간**
- **게시 종료일/시간** (선택)
- **상태**: 즉시 게시 | 예약

#### [하단 액션]
- **저장** (임시)
- **게시**
- **취소**

### 가드
- 저장/게시 전 필수값 검증
- 게시 시 확인 다이얼로그

---

## 화면 3) Public 공지 노출 (읽기 전용)

### URL
```
/association/:associationId#notice
```

### 구조

#### [공지 리스트]
- **상단 고정 공지** (최상단)
- **일반 공지 리스트** (최신순)

#### [공지 카드]
- 제목
- 게시일
- 요약
- 첨부 아이콘

#### [상세]
- 본문
- 첨부 미리보기/다운로드

---

## 데이터 스키마 (초안)

### Firestore 구조
```
associations/{associationId}/notices/{noticeId}
```

### 필드 정의

```typescript
interface Notice {
  // 기본 정보
  title: string;                    // 제목 (필수)
  type: "notice" | "tournament" | "facility";  // 공지 유형
  content: string;                  // 본문 (리치텍스트)
  attachments: Array<{              // 첨부 파일
    url: string;
    name: string;
    type: string;
  }>;
  
  // 표시 설정
  isPinned: boolean;                 // 상단 고정 여부
  
  // 상태 관리
  status: "draft" | "scheduled" | "published" | "ended";
  publishAt: Timestamp;            // 게시 시작일/시간
  endAt?: Timestamp;                // 게시 종료일/시간 (선택)
  
  // 메타데이터
  createdBy: string;                // 작성자 UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string;                // 수정자 UID
}
```

---

## 완료 기준 (Phase 4-2 Step 1)

1. ✅ 사무국이 전화/카톡 없이 공지 게시 가능
2. ✅ Public은 읽기 전용
3. ✅ 게시/예약/종료 상태 명확

---

## 구현 우선순위

### Step 1 (필수)
1. 공지 작성/수정 화면
2. 공지 목록 화면 (Admin)
3. Public 공지 노출 (읽기 전용)

### Step 2 (다음 단계)
- 권한 가드 규칙표
- Firestore Rules
- 상태 관리 로직

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 와이어프레임 완료 (개발자 구현 가능)

