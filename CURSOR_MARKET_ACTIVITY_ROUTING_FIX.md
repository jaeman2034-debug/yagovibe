# 🔥 Cursor 개발자 수정 지시문: Market Activity 라우팅 및 삭제 수정

## 📋 목표

상품 등록 후 Activity 클릭 시 올바른 페이지로 이동하고, Activity 타입 표시를 수정하며, 삭제 기능을 완전히 작동시킵니다.

---

## 1️⃣ 상품 등록 후 Activity 클릭 라우팅 수정

### 문제
현재 Activity 카드 클릭 시 Activity 페이지로 이동하지만, **거래 글은 거래 상세 페이지로 이동해야 합니다.**

### 수정 파일
`src/features/activity/ActivityCard.tsx`

### 현재 코드 확인
```typescript
// 이미 수정되어 있지만, 타입별 라우팅이 완전하지 않을 수 있음
const handleClick = () => {
  const postId = item.refId || item.sourceId;
  const sport = item.sport || "soccer";
  
  // Market 관련 타입 처리
  if (isMarketType) {
    navigate(`/sports/${sport}/market/${postId}`);
    return;
  }
  // ...
};
```

### 수정 요구사항
다음 타입별로 정확한 라우팅을 수행해야 합니다:

| Activity Type | 이동 경로 |
|--------------|----------|
| `equipment_created` | `/sports/:sport/market/:postId` |
| `market_created` | `/sports/:sport/market/:postId` |
| `recruit_created` | `/sports/:sport/market/:postId` (또는 `/sports/:sport/recruit/:postId`) |
| `match_created` | `/sports/:sport/market/:postId` (또는 `/sports/:sport/match/:postId`) |
| `team_created` | `/sports/:sport/team/:teamId` |
| `team_event` | `/sports/:sport/event/:eventId` |

### 수정 코드
```typescript
const handleClick = () => {
  const postId = item.refId || item.sourceId;
  const sport = item.sport || "soccer";

  if (!postId) {
    console.warn("⚠️ [ActivityCard] refId/sourceId가 없습니다:", item);
    return;
  }

  // 🔥 타입별 라우팅 분기
  switch (item.type) {
    case "equipment_created":
    case "market_created":
    case "recruit_created":
    case "match_created":
      // 🔥 모든 Market 타입은 거래 상세 페이지로 이동
      navigate(`/sports/${sport}/market/${postId}`);
      break;

    case "team_created":
      navigate(`/sports/${sport}/team/${postId}`);
      break;

    case "team_event":
      navigate(`/sports/${sport}/event/${postId}`);
      break;

    default:
      // 🔥 기본값: Activity 페이지로 이동 (피드만 표시)
      console.warn("⚠️ [ActivityCard] 알 수 없는 타입:", item.type);
      // Activity 페이지는 피드만 담당하므로, 알 수 없는 타입은 현재 페이지 유지
      break;
  }
};
```

---

## 2️⃣ Activity 타입 라벨 표시 수정

### 문제
현재 Activity 카드에 다음과 같이 표시됨:
```
장비 · 장비 · 배구
```

정상 구조는:
```
거래 · 장비 · 배구
```

또는:
```
거래 · 배구
```

### 수정 파일
`src/features/activity/ActivityCard.tsx`

### 현재 코드
```typescript
const getTypeLabel = (type: string) => {
  switch (type) {
    case "equipment_created":
      return "장비";  // ❌ 문제: "거래"로 변경 필요
    case "market_created":
      return "거래";
    // ...
  }
};
```

### 수정 코드
```typescript
// 🔥 타입별 라벨 매핑
const getTypeLabel = (type: string) => {
  switch (type) {
    // 🔥 Market 관련 타입은 모두 "거래"로 표시
    case "market":
    case "market_upload":
    case "market_created":
    case "equipment_created":  // ✅ "장비" → "거래"로 변경
    case "recruit_created":     // ✅ "모집" → "거래"로 변경 (또는 유지)
    case "match_created":       // ✅ "매칭" → "거래"로 변경 (또는 유지)
      return "거래";
    
    case "team":
    case "team_created":
      return "팀";
    
    case "event":
    case "team_event":
      return "이벤트";
    
    default:
      return type;
  }
};
```

### Activity 카드 표시 구조
```typescript
// 타입 라벨 + 카테고리 + 종목
<div className="text-xs text-gray-500 mb-1">
  {getTypeLabel(item.type)}  {/* "거래" */}
  {item.category && (
    <>
      {" · "}
      {item.category === "equipment" ? "장비" :
       item.category === "recruit" ? "모집" :
       item.category === "match" ? "매칭" :
       item.category}
    </>
  )}
  {displaySport && (
    <>
      {" · "}
      {getSportLabel(displaySport)}  {/* "배구" */}
    </>
  )}
</div>
```

**최종 표시**: `거래 · 장비 · 배구`

---

## 3️⃣ Activity 생성 시 타입 저장 수정

### 문제
Activity 생성 시 `type: "equipment_created"`로 저장되어 타입 라벨이 "장비"로 표시됨.

### 수정 파일
1. `src/features/market/components/forms/EquipmentForm.tsx`
2. `src/features/market/components/forms/RecruitForm.tsx`
3. `src/features/market/components/forms/MatchForm.tsx`
4. `functions/src/market/integratedPostProcessor.ts` (Cloud Function)

### 수정 요구사항
**옵션 A (권장)**: Activity 생성 시 `type: "market_created"`로 통일하고, `category` 필드로 구분
**옵션 B**: 타입 라벨만 수정 (현재 코드 유지)

### 옵션 A 수정 코드 (EquipmentForm.tsx)
```typescript
// 🔥 Activity 생성
const activityData = {
  type: "market_created" as const,  // ✅ "equipment_created" → "market_created"
  refType: "market" as const,
  refId: docRef.id,
  authorId: user.uid,
  title: formData.title,
  summary: formData.price ? `${formData.price.toLocaleString()}원` : undefined,
  thumbnailUrl: formData.images?.[0] || undefined,
  visibility: "public" as const,
  sport: formData.sport || "soccer",
  category: "equipment",  // ✅ category로 구분
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
};

await addDoc(collection(db, "activities"), activityData);
```

### Cloud Function 수정 (integratedPostProcessor.ts)
```typescript
// 🔥 카테고리별 type 매핑 제거, 모두 "market_created"로 통일
const activityData = {
  type: "market_created",  // ✅ 모든 Market 타입 통일
  refType: "market",
  refId: postId,
  authorId: authorId,
  title: post.title || "",
  summary: post.price ? `${Number(post.price).toLocaleString()}원` : undefined,
  thumbnailUrl: post.images?.[0] || undefined,
  visibility: "public" as const,
  sport: (post.sport || "soccer").toLowerCase().trim(),
  category: post.category || "equipment",  // ✅ category로 구분
  likeCount: 0,
  commentCount: 0,
  createdAt: FieldValue.serverTimestamp(),
};
```

---

## 4️⃣ 삭제 버튼 동작 수정

### 문제
삭제 클릭 → 확인 → 삭제 안됨 → 리스트 페이지로 이동

### 수정 파일
1. `src/features/market/components/details/EquipmentDetail.tsx`
2. `src/features/market/components/OwnerActions.tsx`

### 현재 코드 확인
```typescript
// 이미 marketPosts 삭제가 추가되어 있지만, 라우팅 확인 필요
const targetSport = post.sport || sport || "soccer";
navigate(`/sports/${targetSport}/market`);
```

### 수정 요구사항
1. **삭제 순서 확인**: `market` → `marketPosts` → `activities`
2. **라우팅 확인**: 삭제 성공 후 `/sports/:sport/market`로 이동
3. **에러 처리**: 삭제 실패 시 `setUpdating(false)` 호출

### 수정 코드 (EquipmentDetail.tsx)
```typescript
const handleDelete = async () => {
  if (!post.id) {
    console.warn("⚠️ 삭제 불가: post.id가 없습니다.");
    return;
  }
  
  const confirmed = window.confirm(
    "이 상품을 삭제하시겠습니까?\n\n" +
    "• 삭제 후에는 복구할 수 없습니다.\n" +
    "• 관련 활동 피드도 함께 삭제됩니다."
  );
  
  if (!confirmed) return;
  
  setUpdating(true);
  try {
    // 🔥 1. Firestore market 문서 삭제
    const marketRef = doc(db, "market", post.id);
    await deleteDoc(marketRef);
    console.log("✅ Market 문서 삭제 완료:", { postId: post.id, sport: post.sport });
    
    // 🔥 2. marketPosts 문서 삭제 (랭킹 시스템용)
    try {
      const marketPostsRef = doc(db, "marketPosts", post.id);
      await deleteDoc(marketPostsRef);
      console.log("✅ MarketPosts 문서 삭제 완료:", { postId: post.id });
    } catch (marketPostsError: any) {
      console.warn("⚠️ MarketPosts 삭제 실패 (무시):", marketPostsError);
    }
    
    // 🔥 3. activities 문서 삭제 (refId로 찾아서)
    try {
      const activitiesQuery = query(
        collection(db, "activities"),
        where("refId", "==", post.id)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      
      const deletePromises = activitiesSnapshot.docs.map((activityDoc) =>
        deleteDoc(activityDoc.ref)
      );
      await Promise.all(deletePromises);
      
      console.log("✅ Activities 문서 삭제 완료:", { count: activitiesSnapshot.size });
    } catch (activityError: any) {
      console.warn("⚠️ Activities 삭제 실패 (무시):", activityError);
    }
    
    // 🔥 4. 삭제 후 해당 종목 마켓으로 리다이렉트
    const targetSport = post.sport || sport || "soccer";
    navigate(`/sports/${targetSport}/market`);
    
    // ✅ setUpdating은 navigate 후 자동으로 해제됨 (컴포넌트 언마운트)
  } catch (error: any) {
    console.error("❌ 삭제 오류:", error);
    
    let errorMessage = "삭제 중 오류가 발생했습니다.";
    if (error.code === "permission-denied") {
      errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
    } else if (error.code === "not-found") {
      errorMessage = "게시글을 찾을 수 없습니다.";
    } else if (error.message) {
      errorMessage += `\n${error.message}`;
    }
    
    alert(errorMessage);
    setUpdating(false);  // ✅ 에러 시에만 setUpdating 해제
  }
};
```

---

## 5️⃣ 삭제 시 Activity도 같이 삭제 (이미 구현됨)

### 확인 사항
삭제 코드에 이미 `activities` 삭제 로직이 포함되어 있는지 확인:

```typescript
// activities 문서 삭제 (refId로 찾아서)
const activitiesQuery = query(
  collection(db, "activities"),
  where("refId", "==", post.id)
);
const activitiesSnapshot = await getDocs(activitiesQuery);
await Promise.all(
  activitiesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
);
```

**이미 구현되어 있으면 수정 불필요**

---

## 6️⃣ 최종 정상 플로우

### 상품 등록 플로우
```
1. 상품 등록 (EquipmentForm)
   ↓
2. market 컬렉션 저장
   ↓
3. marketPosts 컬렉션 동기화
   ↓
4. activities 컬렉션 생성
   type: "market_created"
   category: "equipment"
   sport: "volleyball"
   refId: "abc123"
   ↓
5. 홈 페이지 이동
   ↓
6. Recent Activity 표시
   "거래 · 장비 · 배구"
   ↓
7. Activity 클릭
   ↓
8. /sports/volleyball/market/abc123 이동
   (거래 상세 페이지)
```

### 삭제 플로우
```
1. 삭제 버튼 클릭
   ↓
2. 확인 다이얼로그
   ↓
3. market 컬렉션 삭제
   ↓
4. marketPosts 컬렉션 삭제
   ↓
5. activities 컬렉션 삭제 (refId로 찾아서)
   ↓
6. /sports/:sport/market 이동
   ↓
7. 목록에서 삭제된 게시물 사라짐
```

---

## 7️⃣ 수정 체크리스트

### ActivityCard.tsx
- [ ] `handleClick` 함수에서 타입별 라우팅 분기 확인
- [ ] `getTypeLabel` 함수에서 "equipment_created" → "거래"로 변경
- [ ] Activity 카드 표시 구조 확인 (타입 · 카테고리 · 종목)

### EquipmentForm.tsx
- [ ] Activity 생성 시 `type: "market_created"`로 변경 (옵션 A)
- [ ] `category: "equipment"` 필드 확인

### RecruitForm.tsx
- [ ] Activity 생성 시 `type: "market_created"`로 변경 (옵션 A)
- [ ] `category: "recruit"` 필드 확인

### MatchForm.tsx
- [ ] Activity 생성 시 `type: "market_created"`로 변경 (옵션 A)
- [ ] `category: "match"` 필드 확인

### integratedPostProcessor.ts (Cloud Function)
- [ ] Activity 생성 시 `type: "market_created"`로 통일
- [ ] `category` 필드로 구분

### EquipmentDetail.tsx
- [ ] 삭제 순서 확인 (market → marketPosts → activities)
- [ ] 삭제 후 라우팅 확인 (`/sports/:sport/market`)
- [ ] 에러 처리 확인 (`setUpdating(false)`)

### OwnerActions.tsx
- [ ] 삭제 순서 확인 (market → marketPosts → activities)
- [ ] 삭제 후 라우팅 확인 (`/sports/:sport/market`)
- [ ] 에러 처리 확인 (`setUpdating(false)`)

---

## 8️⃣ 테스트 방법

### Activity 라우팅 테스트
1. 상품 등록 (장비)
2. 홈 페이지에서 Recent Activity 확인
3. Activity 카드 클릭
4. `/sports/:sport/market/:postId`로 이동하는지 확인

### Activity 타입 표시 테스트
1. 상품 등록 (장비, 배구)
2. Activity 카드 확인
3. "거래 · 장비 · 배구"로 표시되는지 확인

### 삭제 테스트
1. 상품 상세 페이지에서 삭제 버튼 클릭
2. 확인 다이얼로그 확인
3. 삭제 후 콘솔 로그 확인:
   - `✅ Market 문서 삭제 완료`
   - `✅ MarketPosts 문서 삭제 완료`
   - `✅ Activities 문서 삭제 완료`
4. `/sports/:sport/market`로 이동하는지 확인
5. 목록에서 삭제된 게시물이 사라지는지 확인

---

## 9️⃣ 중요 원칙

### Activity 페이지 역할
```
Activity 페이지 = 피드만 담당
실제 컨텐츠 페이지 아님
```

### Activity 클릭 동작
```
Activity 클릭 → 원본 컨텐츠 상세 페이지로 이동
- market_created → /sports/:sport/market/:postId
- team_created → /sports/:sport/team/:teamId
- team_event → /sports/:sport/event/:eventId
```

### 삭제 동작
```
삭제 = market + marketPosts + activities 모두 삭제
삭제 후 = /sports/:sport/market로 이동
```

---

## 🔟 참고사항

### 컬렉션 구조
- **market**: 메인 컬렉션 (게시글 데이터)
- **marketPosts**: 랭킹 시스템용 동기화 컬렉션
- **activities**: Activity Feed용 컬렉션

### Activity 타입 통일 (옵션 A 권장)
- 모든 Market 관련 Activity는 `type: "market_created"`로 통일
- `category` 필드로 구분 (equipment, recruit, match)

### Activity 타입 라벨
- Market 관련: "거래"
- Team 관련: "팀"
- Event 관련: "이벤트"

---

이 지시문대로 수정하면 **상품 등록 → Activity 클릭 → 거래 상세 페이지 이동**이 정상 작동합니다.
