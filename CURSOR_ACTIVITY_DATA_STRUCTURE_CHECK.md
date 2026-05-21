# 🔥 Activity 데이터 구조 확인 및 라우팅 수정 지시문

## 현재 Activity 데이터 구조 확인

### Firestore `activities` 컬렉션 구조

**예상 구조**:

```typescript
{
  type: string              // "equipment_created" | "recruit_created" | "match_created" | ...
  sport: string             // "soccer" | "basketball" | ...
  collection?: string       // "marketPosts" | "recruitPosts" | "matchPosts" | "teamPosts" | "eventPosts"
  postId?: string           // 게시글 ID
  refId?: string            // 레거시 지원
  refType?: string          // 레거시 지원
  // ... 기타 필드
}
```

**예시**:

```json
{
  "type": "equipment_created",
  "sport": "soccer",
  "collection": "marketPosts",
  "postId": "abc123"
}
```

---

## 🔍 현재 코드 확인

### Activity 생성 코드 확인 필요

**파일들**:
- `src/features/market/components/forms/EquipmentForm.tsx`
- `src/features/market/components/forms/RecruitForm.tsx`
- `src/features/market/components/forms/MatchForm.tsx`

**확인 사항**:
- `collection` 필드가 추가되어 있는지
- `postId` 필드가 추가되어 있는지

---

## ✅ Activity 데이터 구조가 올바르면

다음 단계에서 **Activity 클릭 라우팅 오류까지 한번에 잡아준다.** 🚀

### ActivityCard 라우팅 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수 (약 92줄)

**수정 코드**:

```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 postId 추출 (우선순위: postId > refId > sourceId)
  const postId = (item as any).postId || item.refId || item.sourceId;
  
  if (!postId) {
    console.error("❌ [ActivityCard] postId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 sport 추출
  const sport = item.sport || "soccer";

  // 🔥 collection 기반 라우팅 (우선)
  const collection = (item as any).collection;
  
  if (collection) {
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
        navigate(`/sports/${sport}/team/${postId}`);
        return;
      case "eventPosts":
        navigate(`/sports/${sport}/event/${postId}`);
        return;
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 collection:", collection);
        // 레거시 라우팅으로 fallback
        break;
    }
  }

  // 🔥 레거시 지원: type 기반 라우팅 (collection이 없을 때)
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

## 📋 확인 체크리스트

### 1. Activity 데이터 구조 확인

- [ ] Firebase Console에서 `activities` 컬렉션 확인
- [ ] `collection` 필드 존재 여부 확인
- [ ] `postId` 필드 존재 여부 확인

### 2. Activity 생성 코드 확인

- [ ] `EquipmentForm.tsx`: `collection: "marketPosts"` 추가되어 있는지
- [ ] `RecruitForm.tsx`: `collection: "recruitPosts"` 추가되어 있는지
- [ ] `MatchForm.tsx`: `collection: "matchPosts"` 추가되어 있는지

### 3. ActivityCard 라우팅 수정

- [ ] `collection` 기반 라우팅 구현
- [ ] 레거시 `type` 기반 라우팅 지원
- [ ] 타입 정의에 `postId`, `collection` 추가

---

## 🚀 다음 단계

Activity 데이터 구조가 올바르면 (`collection`, `postId` 필드가 있으면):

1. ✅ ActivityCard 라우팅 수정 (위 코드 적용)
2. ✅ Activity 클릭 시 올바른 상세 페이지로 이동
3. ✅ 모든 Activity 타입에 대해 라우팅 정상 작동

---

**Activity 데이터 구조를 확인한 후, `collection`과 `postId` 필드가 있으면 위 라우팅 코드를 적용하세요.**
