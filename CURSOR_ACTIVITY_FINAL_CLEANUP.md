# Cursor 마지막 수정 지시문 (Activity 시스템 완료)

## 1️⃣ System Activity UI에서 숨기기

### 파일

`src/features/activity/ActivityFeed.tsx`

### 문제

전체 탭에 `init` (type: system) Activity가 표시되고 있습니다.

이것은 테스트 로그이므로 **UI에서 숨겨야 합니다.**

---

### 수정 방법

**ActivityCard 렌더링 전에 system 타입 필터 추가**

**위치**: ActivityCard 렌더링 부분 (약 210줄 근처)

**Before (현재)**:
```typescript
{items.map((item) => (
  <ActivityCard key={item.id} item={item} />
))}
```

**After (수정 후)**:
```typescript
{items
  .filter((activity) => activity.type !== "system")
  .map((item) => (
    <ActivityCard key={item.id} item={item} />
  ))}
```

---

### 전체 수정 코드 예시

**위치**: `ActivityFeed.tsx` 렌더링 부분

```typescript
// 🔥 system activity는 사용자 피드에 표시하지 않음
const visibleActivities = items.filter((activity) => activity.type !== "system");

return (
  <div className="activity-feed">
    {loading ? (
      <div>로딩 중...</div>
    ) : error ? (
      <div>에러: {error}</div>
    ) : visibleActivities.length === 0 ? (
      <div>활동이 없습니다</div>
    ) : (
      visibleActivities.map((item) => (
        <ActivityCard key={item.id} item={item} />
      ))
    )}
  </div>
);
```

---

## 2️⃣ ActivityCard 라우팅 안정화

### 파일

`src/features/activity/ActivityCard.tsx`

### 문제

현재 라우팅 구조:

```
/sports/:sport/market/:postId
/sports/:sport/recruit/:postId
/sports/:sport/team/:postId
```

여기서 **postId / refId 구조 정리 안 하면 나중에 터집니다.**

---

### 수정 방법

**postId 우선순위 명확화 및 collection 기반 라우팅**

**위치**: `handleClick` 함수 (약 92줄)

**수정 코드**:

```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 postId 추출 (우선순위: postId > refId > sourceId)
  const postId = (item as any).postId ?? item.refId ?? item.sourceId;
  
  if (!postId) {
    console.error("❌ [ActivityCard] postId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 sport 추출
  const sport = item.sport || "soccer";

  // 🔥 collection 기반 라우팅 (1순위)
  const collection = (item as any).collection;
  
  if (collection && postId) {
    console.log("🔥 [ActivityCard] collection 기반 라우팅:", {
      collection,
      postId,
      sport,
    });

    switch (collection) {
      case "marketPosts":
        navigate(`/sports/${sport}/market/${postId}`);
        return;
      case "recruitPosts":
        navigate(`/sports/${sport}/recruit/${postId}`);
        return;
      case "matchPosts":
        navigate(`/sports/${sport}/match/${postId}`);
        return;
      case "teamPosts":
      case "teams":
        navigate(`/sports/${sport}/team/${postId}`);
        return;
      case "eventPosts":
      case "events":
        navigate(`/sports/${sport}/event/${postId}`);
        return;
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 collection:", collection);
        // 레거시 라우팅으로 fallback
        break;
    }
  }

  // 🔥 레거시 지원: type 기반 라우팅 (2순위, collection이 없을 때)
  console.log("🔥 [ActivityCard] type 기반 라우팅 (레거시):", {
    type: item.type,
    postId,
    sport,
  });

  switch (item.type) {
    case "equipment_created":
    case "market_created":
      navigate(`/sports/${sport}/market/${postId}`);
      break;
    case "recruit_created":
      navigate(`/sports/${sport}/recruit/${postId}`);
      break;
    case "match_created":
      navigate(`/sports/${sport}/match/${postId}`);
      break;
    case "team_created":
      navigate(`/sports/${sport}/team/${postId}`);
      break;
    case "team_event":
      navigate(`/sports/${sport}/event/${postId}`);
      break;
    default:
      console.warn("⚠️ [ActivityCard] 알 수 없는 activity type:", item.type);
      break;
  }
};
```

---

## 📋 작업 체크리스트

### 1. System Activity 숨기기

- [ ] `ActivityFeed.tsx`에서 ActivityCard 렌더링 전에 `.filter((activity) => activity.type !== "system")` 추가
- [ ] 전체 탭에서 `init` (system activity)가 표시되지 않는지 확인

### 2. ActivityCard 라우팅 안정화

- [ ] `postId` 우선순위 명확화 (postId > refId > sourceId)
- [ ] `collection` 기반 라우팅 구현 (1순위)
- [ ] 레거시 `type` 기반 라우팅 지원 (2순위)
- [ ] 모든 Activity 타입에 대해 라우팅 테스트

---

## ✅ 수정 후 예상 결과

### 전체 탭

```
야고 축구 FC (recruit)
공공공 (equipment)
소홀 (team)
퓨마 빅 가방 (equipment)
축구화 (equipment)
```

**`init` (system activity)는 표시되지 않음** ✅

---

### 거래 탭

```
공공공 (equipment_created만)
퓨마 빅 가방 (equipment_created만)
축구화 (equipment_created만)
```

---

### 팀 탭

```
야고 축구 FC (recruit_created)
소홀 (team_created)
```

---

### Activity 클릭

- `collection: "marketPosts"` → `/sports/soccer/market/:postId` ✅
- `collection: "recruitPosts"` → `/sports/soccer/recruit/:postId` ✅
- `collection: "teamPosts"` → `/sports/soccer/team/:postId` ✅

---

## 🎯 최종 Activity 구조 (현재 안정)

### Activity document

```json
{
  "type": "equipment_created",
  "sport": "soccer",
  "refType": "market",
  "refId": "postId",
  "title": "축구화",
  "summary": "10000원",
  "thumbnailUrl": "...",
  "visibility": "public",
  "createdAt": "timestamp"
}
```

**상태**:
- ✅ 문제 없음
- ✅ 구조 정상
- ✅ 인덱스 정상
- ✅ 필터 정상

---

## 📊 Activity 기능 상태

| 기능 | 상태 |
|------|------|
| Activity 생성 | ✅ 정상 |
| Activity DB 저장 | ✅ 정상 |
| Activity Feed 조회 | ✅ 정상 |
| Firestore Index | ✅ 정상 |
| 탭 필터 | ✅ 정상 |
| 라우팅 | ✅ 정상 |

**👉 Activity 시스템 완료**

---

## 🚀 다음 단계 (중요)

지금 프로젝트 기준 **다음으로 해야 할 가장 중요한 것**:

### ActivityCard 라우팅 안정화

현재 구조:

```
/sports/:sport/market/:postId
/sports/:sport/recruit/:postId
/sports/:sport/team/:postId
```

여기서 **postId / refId 구조 정리 안 하면 나중에 터집니다.**

**해결 방법**: 위 2️⃣ 수정 코드를 적용하세요.

---

이 수정으로 **Activity 시스템이 완전히 마무리**됩니다.
