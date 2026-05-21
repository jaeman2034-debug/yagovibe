# 🔥 Activity 라우터 구조 정리

## 📋 현재 라우팅 구조

### 1. App.tsx (최상위 라우팅)

```typescript
/activity/* → ActivityRouter (ProtectedRoute)
```

**위치**: `src/App.tsx:973-982`

**설명**: 모든 `/activity/*` 경로는 ActivityRouter로 위임됨

---

### 2. ActivityRouter.tsx (Activity 서브 라우팅)

**위치**: `src/pages/activity/ActivityRouter.tsx`

#### 라우트 목록

| 경로 | 컴포넌트 | 설명 | 상태 |
|------|----------|------|------|
| `/activity` (index) | `ActivityPage` | 메인 Activity 페이지 (필터 탭 + ActivityFeed) | ✅ 사용 중 |
| `/activity/post/:postId` | `ActivityPostDetailPage` | Activity 상세 페이지 | ✅ 사용 중 |
| `/activity/trading` | `Navigate to /trade` | 중고거래 리다이렉트 | ⚠️ 중복 |
| `/activity/trading/*` | `Navigate to /trade` | 중고거래 리다이렉트 | ⚠️ 중복 |
| `/activity/venues` | `VoiceMapSearch` | 장소/시설 검색 | ⚠️ 중복 |
| `/activity/venues/*` | `VoiceMapSearch` | 장소/시설 검색 | ⚠️ 중복 |
| `/activity/team` | `TeamList` | 팀 메인 페이지 | ✅ 사용 중 |
| `/activity/team/:id` | `TeamRecruitDetailRouter` | 팀 모집 상세 페이지 | ✅ 사용 중 |
| `/activity/team/*` | `TeamList` | 팀 메인 페이지 | ✅ 사용 중 |
| `/activity/events` | `EventsPage` | 대회/이벤트 페이지 | ✅ 사용 중 |
| `/activity/events/:id` | `ScheduleDetailPage` | 일정 상세 페이지 | ✅ 사용 중 |
| `/activity/schedule/create` | `ScheduleCreatePage` | 일정 생성 페이지 | ✅ 사용 중 |
| `/activity/create` | `Navigate to /activity/schedule/create` | 활동 글쓰기 (리다이렉트) | ✅ 사용 중 |
| `/activity/social` | `ChatListPage` | 소셜/채팅 페이지 | ✅ 사용 중 |
| `/activity/social/*` | `ChatListPage` | 소셜/채팅 페이지 | ✅ 사용 중 |
| `/activity/*` (fallback) | `Navigate to /` | 기타 경로 → 홈으로 리다이렉트 | ✅ 사용 중 |

---

### 3. ActivityPage.tsx

**위치**: `src/pages/activity/ActivityPage.tsx`

**역할**:
- ActivityFeedComponent 렌더링
- 필터 탭 제공 (전체/거래/팀/이벤트)
- ActivityFeedComponent에 filter props 전달

**구조**:
```typescript
ActivityPage
 ├─ 필터 탭 (전체/거래/팀/이벤트)
 └─ ActivityFeedComponent (filter prop 전달)
```

**상태**: ✅ 사용 중 (ActivityRouter index에서 렌더링)

---

### 4. ActivityFeed.tsx (페이지 래퍼)

**위치**: `src/pages/activity/ActivityFeed.tsx`

**역할**:
- ActivityFeedComponent 래퍼
- 레이아웃 제공

**상태**: ⚠️ 현재 사용되지 않음 (ActivityPage가 직접 ActivityFeedComponent 사용)

---

### 5. ActivityFeed.tsx (실제 컴포넌트)

**위치**: `src/features/activity/ActivityFeed.tsx`

**역할**:
- activityLogs 컬렉션 조회
- 필터링 (전체/거래/팀/이벤트)
- 무한 스크롤
- ActivityCard 렌더링

**쿼리 구조**:
```typescript
query(
  collection(db, "activityLogs"),
  where("authorId", "==", user.uid),
  where("sourceType", "==", "marketPosts"), // 선택사항 (filter !== "all")
  where("sport", "==", sport), // 선택사항
  orderBy("createdAt", "desc"),
  limit(20)
)
```

**상태**: ✅ 사용 중

---

## 🔄 데이터 흐름

```
사용자 액션
  ↓
Market 등록 (EquipmentForm/RecruitForm/MatchForm)
  ↓
activityLogs 컬렉션에 저장
  ↓
ActivityFeed 쿼리 실행
  ↓
ActivityCard 렌더링
```

---

## 📁 파일 구조

```
src/pages/activity/
 ├─ ActivityRouter.tsx      # 서브 라우팅 정의 ✅
 ├─ ActivityPage.tsx        # 메인 페이지 (필터 탭 + ActivityFeed) ✅
 ├─ ActivityFeed.tsx        # 페이지 래퍼 ⚠️ 미사용
 ├─ ActivityPostDetailPage.tsx ✅
 ├─ EventsPage.tsx ✅
 ├─ ScheduleCreatePage.tsx ✅
 └─ ScheduleDetailPage.tsx ✅

src/features/activity/
 ├─ ActivityFeed.tsx        # 실제 피드 컴포넌트 ✅
 └─ ActivityCard.tsx        # Activity 카드 UI ✅
```

---

## ✅ 현재 상태

### 정상 작동
- ✅ `/activity` → ActivityPage 렌더링
- ✅ ActivityFeed 마운트 확인
- ✅ activityLogs 컬렉션 조회
- ✅ 필터 탭 동작

### 확인 필요
- ⚠️ activityLogs 컬렉션에 문서 존재 여부
- ⚠️ 쿼리 결과가 0개인 원인
- ⚠️ 상품이 생겼다가 사라지는 현상

---

## 🔧 개선 제안

1. **중복 라우트 정리**
   - `/activity/trading` → `/market`로 통일
   - `/activity/venues` → `/voice-map`으로 통일

2. **필터 구조 단순화**
   - ActivityPage에서 필터 관리
   - ActivityFeed는 순수 컴포넌트로 유지

3. **에러 처리 강화**
   - 쿼리 실패 시 사용자 안내
   - 빈 상태 UI 개선

4. **미사용 파일 정리**
   - `src/pages/activity/ActivityFeed.tsx` 제거 고려 (ActivityPage가 직접 사용)
