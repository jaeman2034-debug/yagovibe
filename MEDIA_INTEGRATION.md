# 🔥 Media Integration 설계 문서

## 📋 개요

Media System을 플랫폼의 Match, Team, Player, Event 페이지에 통합하여 **스포츠 콘텐츠 플랫폼**으로 확장합니다.

---

## 🎯 목표

### 현재 상태
- ✅ Media Upload System
- ✅ Media Storage (Firebase Storage)
- ✅ Media Gallery Component
- ✅ Media Service Layer

### 통합 목표
- ✅ Match Page에 Media 탭 추가
- ✅ Team Page에 Media 탭 추가
- ✅ Player Page에 Media 탭 추가
- ✅ Event Page에 Media 탭 추가
- ✅ MediaGallery 개선 (Lazy Loading, Lightbox, Navigation)

---

## 📊 데이터 구조

### Firestore Collection

```typescript
media/{mediaId}
{
  type: "photo" | "video",
  entityType: "match" | "team" | "player" | "event",
  entityId: string,
  url: string,
  thumbnailUrl?: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  title?: string,
  description?: string,
  tags?: string[],
  uploadedBy: string,
  status: "processing" | "ready" | "error",
  duration?: number, // video only
  viewCount?: number,
  likeCount?: number,
  createdAt: Timestamp,
  updatedAt?: Timestamp
}
```

### Firebase Storage 구조

```
matches/{matchId}/photos/{timestamp}_{fileName}
matches/{matchId}/videos/{timestamp}_{fileName}
teams/{teamId}/photos/{timestamp}_{fileName}
events/{eventId}/gallery/{timestamp}_{fileName}
players/{playerId}/photos/{timestamp}_{fileName}
```

---

## 🔍 쿼리 패턴

### Match Media

```typescript
query(
  collection(db, "media"),
  where("entityType", "==", "match"),
  where("entityId", "==", matchId),
  orderBy("createdAt", "desc")
)
```

### Team Media

```typescript
query(
  collection(db, "media"),
  where("entityType", "==", "team"),
  where("entityId", "==", teamId),
  orderBy("createdAt", "desc")
)
```

### Player Media

```typescript
query(
  collection(db, "media"),
  where("entityType", "==", "player"),
  where("entityId", "==", playerId),
  orderBy("createdAt", "desc")
)
```

### Event Media

```typescript
query(
  collection(db, "media"),
  where("entityType", "==", "event"),
  where("entityId", "==", eventId),
  orderBy("createdAt", "desc")
)
```

---

## 🎨 UI 구조

### 페이지 탭 구조

#### Match Page
```
Overview | Stats | Lineup | Media
```

#### Team Page
```
Overview | Matches | Players | Records | Awards | Media
```

#### Player Page
```
Overview | Matches | Events | Awards | Media
```

#### Event Page
```
Overview | Teams | Bracket | Matches | Results | Stats | Media
```

---

## 🧩 컴포넌트 구조

### MediaGallery (메인 컴포넌트)

```typescript
<MediaGallery
  entityType="match" | "team" | "player" | "event"
  entityId={string}
  showUpload?: boolean
  onUploadClick?: () => void
/>
```

**기능:**
- 필터링 (전체 / 사진 / 영상)
- Lazy Loading (Intersection Observer)
- Lightbox (전체 화면 보기)
- 키보드 네비게이션 (← → ESC)
- 조회수 표시
- Empty State

---

## 🖼️ MediaGallery 기능

### 1. 필터링

```typescript
const [filter, setFilter] = useState<MediaType | "all">("all");

// 필터 버튼
<Button onClick={() => setFilter("all")}>전체 ({media.length})</Button>
<Button onClick={() => setFilter("photo")}>사진 ({photos.length})</Button>
<Button onClick={() => setFilter("video")}>영상 ({videos.length})</Button>
```

### 2. Lazy Loading

```typescript
const lastMediaElementRef = useCallback((node: HTMLDivElement | null) => {
  if (observerRef.current) observerRef.current.disconnect();
  observerRef.current = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      // 추가 미디어 로드 (필요시)
    }
  });
  if (node) observerRef.current.observe(node);
}, []);

// 이미지에 lazy loading 적용
<img
  src={photo.thumbnailUrl || photo.url}
  loading={index < 8 ? "eager" : "lazy"}
/>
```

### 3. Lightbox

**기능:**
- 전체 화면 미디어 보기
- 이전/다음 네비게이션 (← →)
- 키보드 단축키 (← → ESC)
- 조회수 자동 증가
- 미디어 정보 표시 (제목, 설명, 조회수)

**구현:**
```typescript
const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);

const navigateLightbox = (direction: "prev" | "next") => {
  // 필터된 미디어 목록에서 이전/다음으로 이동
};

// 키보드 이벤트
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox("prev");
    if (e.key === "ArrowRight") navigateLightbox("next");
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [selectedMedia, currentIndex]);
```

### 4. 조회수 증가

```typescript
const handleMediaClick = async (mediaItem: Media, index: number) => {
  setSelectedMedia(mediaItem);
  setCurrentIndex(index);
  
  // 조회수 증가 (비동기)
  await incrementMediaViewCount(mediaItem.id);
};
```

### 5. Empty State

```typescript
if (media.length === 0) {
  return (
    <div className="text-center py-12">
      <Image className="w-16 h-16 text-gray-400 mb-4" />
      <h3>업로드된 미디어가 없습니다</h3>
      <p>첫 번째 사진이나 영상을 업로드해보세요 📷</p>
      {showUpload && <Button onClick={onUploadClick}>미디어 업로드</Button>}
    </div>
  );
}
```

---

## 📱 반응형 디자인

### 사진 그리드

```css
grid-cols-2        /* 모바일 */
sm:grid-cols-3     /* 태블릿 */
md:grid-cols-4     /* 데스크톱 */
```

### 영상 그리드

```css
grid-cols-1        /* 모바일 */
sm:grid-cols-2     /* 태블릿 */
md:grid-cols-3     /* 데스크톱 */
```

---

## ⚡ 성능 최적화

### 1. Lazy Loading

- 첫 8개 이미지는 `eager` 로딩
- 나머지는 `lazy` 로딩
- Intersection Observer로 추가 로드 감지

### 2. Thumbnail 우선 사용

```typescript
<img src={photo.thumbnailUrl || photo.url} />
```

### 3. 이미지 최적화

- Firebase Storage에서 썸네일 자동 생성 (Cloud Function)
- 원본은 필요시에만 로드 (Lightbox)

---

## 🔐 권한 관리

### 업로드 권한

```typescript
// Admin만 업로드 가능
if (user.role === "ADMIN") {
  showUpload = true;
}

// 팀 매니저도 업로드 가능 (향후)
if (isTeamManager(teamId, userId)) {
  showUpload = true;
}
```

---

## 📈 향후 확장

### 1. Infinite Scroll

```typescript
const [hasMore, setHasMore] = useState(true);
const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

const loadMore = async () => {
  if (!hasMore || !lastDoc) return;
  
  const q = query(
    collection(db, "media"),
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(20)
  );
  
  const snapshot = await getDocs(q);
  // ...
};
```

### 2. Social Features

- 좋아요 (Like)
- 댓글 (Comment)
- 공유 (Share)

### 3. Media Moderation

- Admin 승인 시스템
- 자동 필터링 (Cloud Vision API)

---

## ✅ 구현 완료 항목

- [x] Match Page에 Media 탭 추가
- [x] Team Page에 Media 탭 추가
- [x] Player Page에 Media 탭 추가
- [x] Event Page에 Media 탭 추가 (기존)
- [x] MediaGallery 필터링 기능
- [x] MediaGallery Lazy Loading
- [x] MediaGallery Lightbox
- [x] MediaGallery 키보드 네비게이션
- [x] MediaGallery 조회수 표시
- [x] MediaGallery Empty State

---

## 🎯 결과

Media Integration 완료로 플랫폼은:

```
운영 플랫폼 (Admin / Stats / Realtime)
콘텐츠 플랫폼 (Media System) ✅
커뮤니케이션 플랫폼 (Notifications + Email)
```

**3개 레이어가 모두 구축된 상태**입니다.

이제 플랫폼은 **데이터 플랫폼**에서 **스포츠 콘텐츠 플랫폼**으로 확장되었습니다. 📷🎥
