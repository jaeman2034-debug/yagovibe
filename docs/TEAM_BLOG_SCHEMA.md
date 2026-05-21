# 팀 블로그 Firestore 스키마 설계

## 📋 개요

AI가 자동으로 생성하는 팀 홍보 블로그의 Firestore 데이터 구조입니다.

## 🗂️ 컬렉션 구조

```
teams/{teamId}/
  ├── blog/
  │   └── settings          # 블로그 설정 (단일 문서)
  └── blog_posts/           # 블로그 포스트 컬렉션
      └── {postId}          # 개별 포스트
```

## 📄 문서 스키마

### 1. `teams/{teamId}/blog/settings`

블로그 전역 설정 (단일 문서)

```typescript
interface BlogSettings {
  enabled: boolean;                    // 블로그 활성화 여부
  plan: "free" | "pro";                // 플랜 (팀 플랜과 동기화)
  teamSlug: string;                    // URL 친화적 팀명 (예: "소흘-60대-FC")
  createdAt: Timestamp;                 // 생성일
  updatedAt: Timestamp;                 // 수정일
}
```

**예시:**
```json
{
  "enabled": true,
  "plan": "free",
  "teamSlug": "소흘-60대-FC",
  "createdAt": "2025-01-15T09:00:00Z",
  "updatedAt": "2025-01-15T09:00:00Z"
}
```

### 2. `teams/{teamId}/blog_posts/{postId}`

개별 블로그 포스트

```typescript
interface BlogPost {
  title: string;                        // 포스트 제목
  content: string;                       // HTML 본문
  excerpt: string;                      // 2-3줄 요약
  seoMeta: {
    title?: string;                     // SEO 최적화 제목 (Pro 전용)
    description?: string;                // SEO 메타 설명 (Pro 전용)
    keywords?: string[];                 // SEO 키워드 (Pro 전용)
  };
  status: "draft" | "published";       // 발행 상태
  createdAt: Timestamp;                 // 생성일
  createdBy: "ai" | string;              // 생성자 ("ai" 또는 uid)
  postType: "intro" | "weekly" | "game_preview" | "game_review" | "recruitment";
  publishedAt?: Timestamp;              // 발행일
  viewCount: number;                    // 조회수
  plan: "free" | "pro";                 // 생성 시점의 플랜
}
```

**예시:**
```json
{
  "title": "소흘 60대 FC를 소개합니다",
  "content": "<h2>우리 팀을 소개합니다</h2><p>소흘 60대 FC는...</p>",
  "excerpt": "경기도 소흘 지역에서 활동하는 60대 축구팀입니다.",
  "seoMeta": {
    "title": "소흘 60대 FC - 경기도 소흘 지역 축구팀",
    "description": "경기도 소흘 지역에서 활동하는 60대 축구팀 소흘 60대 FC를 소개합니다.",
    "keywords": ["소흘", "60대", "축구", "경기도", "아마추어"]
  },
  "status": "published",
  "createdAt": "2025-01-15T09:00:00Z",
  "createdBy": "ai",
  "postType": "intro",
  "publishedAt": "2025-01-15T09:00:00Z",
  "viewCount": 0,
  "plan": "free"
}
```

## 🔍 인덱스 요구사항

### `blog_posts` 컬렉션 인덱스

```json
{
  "collectionGroup": "blog_posts",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "publishedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**사용 쿼리:**
```typescript
// 발행된 포스트 최신순 조회
const q = query(
  collection(db, `teams/${teamId}/blog_posts`),
  where("status", "==", "published"),
  orderBy("publishedAt", "desc")
);
```

## 🔐 Firestore 보안 규칙

```javascript
// teams/{teamId}/blog/settings
match /teams/{teamId}/blog/settings {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
                 request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []);
}

// teams/{teamId}/blog_posts/{postId}
match /teams/{teamId}/blog_posts/{postId} {
  // 읽기: 공개 (인증 불필요)
  allow read: if true;
  
  // 쓰기: 관리자만 (Functions는 서버 권한으로 자동 허용)
  allow write: if request.auth != null && 
                 request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []);
}
```

## 📊 플랜별 제한

### Free 플랜
- 블로그 1개
- 글 월 2개 (첫 글 포함)
- 기본 템플릿
- YAGO VIBE 브랜딩 포함
- SEO 최적화 없음

### Pro 플랜
- 무제한 글
- SEO 최적화 자동 삽입
- YAGO VIBE 배지 제거
- 모집 CTA 커스터마이즈
- SNS 자동 공유 (향후)
- 이미지 생성 (AI 썸네일, 향후)

## 🚀 Cloud Functions

### `generateTeamBlogPost`
- **타입**: Callable (HTTPS)
- **역할**: 수동 블로그 포스트 생성
- **권한**: 관리자만
- **파라미터**: `{ teamId, postType?, weekStart? }`

### `autoWeeklyTeamPost`
- **타입**: Scheduled (매주 월요일 09:00 KST)
- **역할**: Pro 플랜 팀 대상 주간 자동 포스트 생성
- **파라미터**: 없음 (전체 팀 스캔)

## 📝 포스트 타입

1. **intro**: 팀 소개 (첫 글)
2. **weekly**: 주간 활동 요약
3. **game_preview**: 경기 전 미리보기 (향후)
4. **game_review**: 경기 후 리뷰 (향후)
5. **recruitment**: 멤버 모집 (향후)

## 🔗 공개 URL 구조

```
/teams/{teamSlug}/blog              # 블로그 목록
/teams/{teamSlug}/blog/{postId}     # 개별 포스트
```

**예시:**
- `/teams/소흘-60대-FC/blog`
- `/teams/소흘-60대-FC/blog/abc123`

