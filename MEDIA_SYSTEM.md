# 🔥 Media System 설계 문서

## 개요

Media System은 플랫폼에 경기 사진/영상, 팀 사진, 이벤트 갤러리 기능을 추가하는 시스템입니다.

## 목표

- 경기 사진/영상 업로드 및 관리
- 팀 사진 갤러리
- 이벤트 갤러리
- 썸네일 자동 생성
- 라이트박스 (확대 보기)

## 데이터 구조

### Firestore 컬렉션

```
media/{mediaId}
```

### 문서 스키마

```typescript
{
  id: string;
  type: "photo" | "video";
  entityType: "match" | "team" | "event" | "player";
  entityId: string;
  url: string; // 원본 파일 URL
  thumbnailUrl?: string; // 썸네일 URL
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  title?: string;
  description?: string;
  tags?: string[];
  uploadedBy: string; // userId
  uploadedByName?: string;
  status: "processing" | "ready" | "error";
  duration?: number; // seconds (video만)
  viewCount?: number;
  likeCount?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

## Firebase Storage 구조

```
matches/{matchId}/photos/{timestamp}_{fileName}
matches/{matchId}/videos/{timestamp}_{fileName}
teams/{teamId}/photos/{timestamp}_{fileName}
events/{eventId}/gallery/{timestamp}_{fileName}
players/{playerId}/photos/{timestamp}_{fileName}
```

## 주요 기능

### 1. 미디어 업로드

**컴포넌트**: `MediaUpload`

- Drag & Drop 지원
- Multi file 업로드 (최대 10개)
- 진행률 표시
- 파일 크기 제한 (50MB)
- 이미지/비디오 지원

**사용 예시**:
```tsx
<MediaUpload
  entityType="match"
  entityId={matchId}
  uploadedBy={userId}
  onUploadComplete={(media) => {
    console.log("업로드 완료:", media);
  }}
/>
```

### 2. 미디어 갤러리

**컴포넌트**: `MediaGallery`

- 사진/영상 필터링
- 라이트박스 (확대 보기)
- 조회수 추적
- 반응형 그리드 레이아웃

**사용 예시**:
```tsx
<MediaGallery
  entityType="match"
  entityId={matchId}
  showUpload={true}
  onUploadClick={() => setShowUpload(true)}
/>
```

### 3. 썸네일 생성

**Cloud Function**: `onMediaUploaded`

- 이미지 업로드 시 자동 썸네일 생성
- media 문서의 `thumbnailUrl` 업데이트
- 상태를 `ready`로 변경

## 페이지 통합

### Event Detail Page

**경로**: `/events/:eventId`

**탭 추가**: "미디어" 탭

```tsx
{activeTab === "media" && (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <h2 className="text-xl font-semibold text-gray-900 mb-4">미디어 갤러리</h2>
    <MediaGallery entityType="event" entityId={eventId!} />
  </div>
)}
```

### Match Detail Page (향후)

**경로**: `/matches/:matchId`

**탭 추가**: "미디어" 탭

```tsx
<MediaGallery
  entityType="match"
  entityId={matchId}
  showUpload={true}
  onUploadClick={() => setShowUpload(true)}
/>
```

## 서비스 레이어

### `mediaService.ts`

주요 함수:

- `uploadMedia()`: 단일 파일 업로드
- `uploadMediaWithProgress()`: 진행률 추적 업로드
- `uploadMultipleMedia()`: 여러 파일 일괄 업로드
- `getMediaByEntity()`: 엔티티별 미디어 조회
- `deleteMedia()`: 미디어 삭제
- `incrementMediaViewCount()`: 조회수 증가

## Cloud Functions

### `onMediaUploaded`

**트리거**: Storage 파일 업로드 완료

**역할**:
1. 이미지 파일 감지
2. 썸네일 생성 (향후 sharp/imagemagick 연동)
3. media 문서 업데이트

**향후 개선**:
- 실제 이미지 리사이즈 (sharp 라이브러리)
- 비디오 썸네일 추출 (ffmpeg)
- 이미지 최적화 (WebP 변환)

## UI/UX

### 업로드 UI

- Drag & Drop 영역
- 파일 선택 버튼
- 선택된 파일 목록
- 진행률 표시
- 업로드 완료 피드백

### 갤러리 UI

- 필터 버튼 (전체/사진/영상)
- 그리드 레이아웃
- 라이트박스 (클릭 시 확대)
- 비디오 재생 오버레이

## 보안

### Storage Rules

```javascript
match /matches/{matchId}/photos/{fileName} {
  allow read: if true; // 공개 읽기
  allow write: if request.auth != null; // 인증된 사용자만 업로드
}

match /matches/{matchId}/videos/{fileName} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

### Firestore Rules

```javascript
match /media/{mediaId} {
  allow read: if true; // 공개 읽기
  allow create: if request.auth != null; // 인증된 사용자만 생성
  allow update: if request.auth.uid == resource.data.uploadedBy; // 업로더만 수정
  allow delete: if request.auth.uid == resource.data.uploadedBy; // 업로더만 삭제
}
```

## 성능 최적화

### 썸네일 사용

- 원본 이미지 대신 썸네일 표시
- 갤러리에서 빠른 로딩

### Lazy Loading

- 이미지 lazy loading 적용
- 스크롤 시 로드

### CDN

- Firebase Storage CDN 활용
- 전역 빠른 접근

## 향후 확장

### 1. 비디오 처리

- 썸네일 추출
- 다중 해상도 생성
- 스트리밍 지원

### 2. 이미지 최적화

- WebP 변환
- 자동 압축
- 반응형 이미지

### 3. 태그 시스템

- 자동 태그 생성 (AI)
- 선수 태그
- 팀 태그

### 4. 소셜 기능

- 좋아요
- 댓글
- 공유

## 현재 구현 상태

✅ **완료**:
- Media 타입 정의
- Media Service (업로드/조회)
- MediaUpload 컴포넌트
- MediaGallery 컴포넌트
- Event Page Media 탭 통합
- Thumbnail 생성 Cloud Function (기본)

🔄 **진행 중**:
- 실제 이미지 리사이즈 (sharp 연동 필요)
- 비디오 썸네일 추출

📋 **향후**:
- Match Page Media 탭
- Team Page Media 탭
- Player Page Media 탭
- 이미지 최적화
- 비디오 처리

## 사용 가이드

### 1. 미디어 업로드

```tsx
import { MediaUpload } from "@/components/media";

<MediaUpload
  entityType="match"
  entityId={matchId}
  uploadedBy={userId}
  accept="image/*,video/*"
  maxFiles={10}
  maxFileSize={50 * 1024 * 1024} // 50MB
  onUploadComplete={(media) => {
    console.log("업로드 완료:", media);
  }}
/>
```

### 2. 미디어 갤러리 표시

```tsx
import { MediaGallery } from "@/components/media";

<MediaGallery
  entityType="match"
  entityId={matchId}
  showUpload={true}
  onUploadClick={() => setShowUpload(true)}
/>
```

### 3. 미디어 조회

```tsx
import { getMediaByEntity } from "@/services/mediaService";

const photos = await getMediaByEntity("match", matchId, {
  type: "photo",
  limitCount: 20,
});
```

## 참고

- Firebase Storage: https://firebase.google.com/docs/storage
- Recharts: https://recharts.org/
- Sharp (이미지 처리): https://sharp.pixelplumbing.com/
