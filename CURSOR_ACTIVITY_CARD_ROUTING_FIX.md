# ActivityCard 클릭 라우팅 수정 지시문

## 문제

현재 ActivityCard는 `market` (refType="market")만 이동 처리되어 있고 `teams` (refType="teams") 라우팅이 누락되어 있습니다.

ActivityCard 클릭 시 `refType` 기준으로 이동하도록 수정하세요.

---

## 라우팅 규칙

```
refType === "market"
→ /market/{refId}

refType === "teams"
→ /teams/{refId}

refType === "events"
→ /events/{refId}
```

---

## 예시

**activity**:
```json
{
  "refType": "teams",
  "refId": "RebopABHiarIVQONL5jm"
}
```

**클릭시 이동**:
```
/teams/RebopABHiarIVQONL5jm
```

---

## 수정 파일

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수

**수정 내용**: `refType` 분기 처리 추가

---

## 수정 코드

### 현재 코드 (문제)
```typescript
const handleClick = (e?: React.MouseEvent) => {
  // ... 기존 코드 ...
  
  // 🔥 refType으로 판단 (레거시 호환)
  if (refType === "market" || refType === "marketPosts") {
    const fallbackPath = `/sports/${sport}/market/${postId}`;
    navigate(fallbackPath);
    return;
  }
}
```

**문제**: `refType` 변수가 정의되지 않음, `teams`와 `events` 처리 누락

---

### 수정 코드 (정답)
```typescript
const handleClick = (e?: React.MouseEvent) => {
  // 🔥 이벤트 전파 방지
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

  // 🔥 refType 추출 (우선순위: refType > sourceType)
  const refType = (item as any).refType || item.sourceType;

  // 🔥 refType 기반 라우팅 (1순위)
  if (refType && postId) {
    console.log("🔥 [ActivityCard] refType 기반 라우팅:", {
      refType,
      postId,
    });

    switch (refType) {
      case "market":
        navigate(`/market/${postId}`);
        return;
      
      case "teams":
        navigate(`/teams/${postId}`);
        return;
      
      case "events":
        navigate(`/events/${postId}`);
        return;
      
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 refType:", refType);
        // 다음 라우팅 로직으로 fallback
        break;
    }
  }

  // 🔥 collection 기반 라우팅 (2순위)
  const collection = (item as any).collection;
  
  if (collection && postId) {
    // ... 기존 collection 라우팅 로직 ...
  }

  // 🔥 type 기반 라우팅 (3순위, 레거시)
  // ... 기존 type 라우팅 로직 ...
}
```

---

## 전체 수정 코드 (handleClick 함수)

```typescript
const handleClick = (e?: React.MouseEvent) => {
  // 🔥 이벤트 전파 방지
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 디버깅: Activity 데이터 확인
  console.log("🔥 [ActivityCard] 클릭됨:", {
    type: item.type,
    refId: item.refId,
    sourceId: item.sourceId,
    sport: item.sport,
    refType: (item as any).refType || item.sourceType,
    fullItem: item,
  });

  // 🔥 postId 추출 (우선순위: postId > refId > sourceId)
  const postId = (item as any).postId ?? item.refId ?? item.sourceId;
  
  if (!postId) {
    console.error("❌ [ActivityCard] postId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 refType 추출 (우선순위: refType > sourceType)
  const refType = (item as any).refType || item.sourceType;

  // 🔥 refType 기반 라우팅 (1순위)
  if (refType && postId) {
    console.log("🔥 [ActivityCard] refType 기반 라우팅:", {
      refType,
      postId,
    });

    switch (refType) {
      case "market":
        navigate(`/market/${postId}`);
        return;
      
      case "teams":
        navigate(`/teams/${postId}`);
        return;
      
      case "events":
        navigate(`/events/${postId}`);
        return;
      
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 refType:", refType);
        // 다음 라우팅 로직으로 fallback
        break;
    }
  }

  // 🔥 sport 추출
  const sport = item.sport || "soccer";

  // 🔥 collection 기반 라우팅 (2순위)
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

  // 🔥 레거시 지원: type 기반 라우팅 (3순위)
  console.log("🔥 [ActivityCard] type 기반 라우팅 (레거시):", {
    type: item.type,
    postId,
    sport,
  });

  switch (item.type) {
    case "equipment_created":
    case "market_created":
      navigate(`/sports/${sport}/market/${postId}`);
      return;

    case "recruit_created":
      navigate(`/sports/${sport}/recruit/${postId}`);
      return;

    case "match_created":
      navigate(`/sports/${sport}/match/${postId}`);
      return;

    case "team_created":
    case "team":
      navigate(`/sports/${sport}/team/${postId}`);
      return;

    case "team_event":
    case "event":
      navigate(`/sports/${sport}/event/${postId}`);
      return;

    default:
      // 🔥 알 수 없는 타입
      console.warn("⚠️ [ActivityCard] 알 수 없는 타입, market으로 처리:", {
        type: item.type,
        refType,
        postId,
        sport,
      });
      navigate(`/sports/${sport}/market/${postId}`);
  }
};
```

---

## 테스트 체크리스트

수정 후 다음을 확인하세요:

- [ ] `refType === "market"` Activity 클릭 시 `/market/{refId}`로 이동
- [ ] `refType === "teams"` Activity 클릭 시 `/teams/{refId}`로 이동
- [ ] `refType === "events"` Activity 클릭 시 `/events/{refId}`로 이동
- [ ] `refType`이 없을 때 collection 기반 라우팅 작동
- [ ] `collection`도 없을 때 type 기반 라우팅 작동

---

## 참고 (지금 시스템 상태)

현재 상태는 매우 좋습니다:

- ✅ Activity Feed → 정상
- ✅ sport 필터 → 정상
- ✅ refType 필터 → 정상
- ✅ Firestore 데이터 → 정상

**이동 라우팅 한 줄만 빠진 상태**입니다.

---

이 지시문을 따라 수정하면 ActivityCard가 모든 refType에 대해 정상적으로 라우팅됩니다.
