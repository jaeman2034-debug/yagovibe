# 📌 Cursor 개발자 최종 수정 지시문

## 프로젝트: YAGO VIBE 스포츠 커뮤니티 플랫폼

**목표**: 현재 프로젝트에서 **거래 / 활동 / 팀 / 채팅 / 이벤트 기능이 종목(sport) 기준으로 분리되지 않아 구조가 꼬이는 문제를 해결한다.**

모든 기능은 **sport 기반 라우팅 아키텍처**로 재구성해야 한다.

---

## 1️⃣ 핵심 아키텍처 규칙

플랫폼은 **종목 중심 구조**로 동작해야 한다.

### ❌ 현재 구조 (문제)
```
market
activity
team
chat
event
```
기능 중심 구조라 데이터와 UI가 계속 충돌한다.

### ✅ 목표 구조
```
sports
 ├ soccer
 │   ├ market
 │   ├ activity
 │   ├ team
 │   ├ chat
 │   └ event
 │
 ├ basketball
 │   ├ market
 │   ├ activity
 │   ├ team
 │   ├ chat
 │   └ event
 │
 └ baseball
     ├ market
     ├ activity
     ├ team
     ├ chat
     └ event
```

**즉, 모든 기능은 sport 아래에서 동작한다.**

---

## 2️⃣ React Router 구조 수정

### 현재 상태 확인
프로젝트는 이미 일부 `/sports/:sport` 구조를 사용하고 있습니다:
- ✅ `/sports/:sport` → `SportHubPage` (이미 구현됨)
- ✅ `/sports/:sport/market` → `SportMarketPage` (이미 구현됨)
- ✅ `/sports/:sport/market/write` → `MarketWritePage` (이미 구현됨)
- ✅ `/sports/:sport/market/:postId` → `MarketPostDetailPage` (이미 구현됨)

### 추가 구현 필요
다음 라우트를 추가/확인해야 합니다:

```tsx
// src/App.tsx에 추가
<Route path="/sports/:sport" element={<SportHubPage />} />
<Route path="/sports/:sport/market" element={<SportMarketPage />} />
<Route path="/sports/:sport/market/write" element={<MarketWritePage />} />
<Route path="/sports/:sport/market/:postId" element={<MarketPostDetailPage />} />
<Route path="/sports/:sport/activity" element={<ActivityPage />} />
<Route path="/sports/:sport/activity/:id" element={<ActivityDetailPage />} />
<Route path="/sports/:sport/team" element={<TeamPage />} />
<Route path="/sports/:sport/chat" element={<ChatPage />} />
<Route path="/sports/:sport/event" element={<EventPage />} />
```

---

## 3️⃣ SportHubPage (종목 홈) UX

### 페이지 경로
```
/sports/:sport
```

### 기능 탭 제공
```tsx
// src/pages/sports/[sport]/SportHubPage.tsx
<Link to={`/sports/${sport}/market`}>거래</Link>
<Link to={`/sports/${sport}/activity`}>활동</Link>
<Link to={`/sports/${sport}/team`}>팀</Link>
<Link to={`/sports/${sport}/chat`}>채팅</Link>
<Link to={`/sports/${sport}/event`}>이벤트</Link>
```

---

## 4️⃣ MarketWritePage 수정 (중요)

### 상품 업로드 시 sport 값 자동 추출

**현재 구현 확인**: `src/features/market/pages/MarketWritePage.tsx`에서 이미 `useParams`로 sport를 추출하고 있습니다.

### 확인 사항
```tsx
// 이미 구현되어 있는지 확인
import { useParams } from "react-router-dom"

const { sport } = useParams<{ sport: Sport }>()

// Firestore 저장 시 sport 필드 포함 확인
await addDoc(collection(db, "market"), {
  title,
  description,
  price,
  sport: sport, // ✅ 반드시 포함되어야 함
  authorId: user.uid,
  createdAt: serverTimestamp()
})
```

### 중요: 컬렉션 구조
프로젝트는 **두 개의 컬렉션**을 사용합니다:
- `market` 컬렉션: 실제 게시글 데이터
- `marketPosts` 컬렉션: 랭킹 시스템용 동기화 데이터

**두 컬렉션 모두에 `sport` 필드가 포함되어야 합니다.**

---

## 5️⃣ 상품 등록 후 이동 경로 수정

### 기존 코드 확인
```tsx
// ❌ 잘못된 경로
navigate("/market")

// ✅ 올바른 경로
navigate(`/sports/${sport}/market`)
```

### 수정 위치
- `src/features/market/components/forms/EquipmentForm.tsx`
- `src/features/market/components/forms/RecruitForm.tsx`
- `src/features/market/components/forms/MatchForm.tsx`

모든 폼에서 성공 후 이동 경로를 확인하고 수정하세요.

---

## 6️⃣ MarketPage Firestore 조회 수정

### 경로
```
/sports/:sport/market
```

### 조회 쿼리
```tsx
// src/pages/sports/[sport]/market/SportMarketPage.tsx
const { sport } = useParams<{ sport: Sport }>()

// market 컬렉션 조회
const q = query(
  collection(db, "market"),
  where("sport", "==", sport),
  where("status", "in", ["open", "active"]), // 활성 상태만
  orderBy("createdAt", "desc")
)

// 또는 marketPosts 컬렉션 조회 (랭킹 시스템 사용 시)
const q = query(
  collection(db, "marketPosts"),
  where("sport", "==", sport),
  where("status", "in", ["open", "active"]),
  orderBy("rankScore", "desc"), // 랭킹 점수 기준
  orderBy("createdAt", "desc")
)
```

---

## 7️⃣ ActivityPage 수정

### 경로
```
/sports/:sport/activity
```

### Firestore 조회
```tsx
// src/pages/activity/ActivityPage.tsx 또는 ActivityRouter.tsx
const { sport } = useParams<{ sport: Sport }>()

// activities 컬렉션 조회 (⚠️ activity가 아님)
const q = query(
  collection(db, "activities"),
  where("sport", "==", sport),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc")
)
```

### 중요: 컬렉션 이름
- ❌ `activity` (단수) - 사용하지 않음
- ✅ `activities` (복수) - 실제 사용 중인 컬렉션

---

## 8️⃣ Activity 작성 수정

### 활동 작성 시 sport 자동 저장
```tsx
// Activity 작성 컴포넌트
const { sport } = useParams<{ sport: Sport }>()

await addDoc(collection(db, "activities"), {
  title,
  content,
  sport: sport, // ✅ 반드시 포함
  authorId: user.uid,
  visibility: "public",
  type: "activity_created", // 또는 적절한 type
  createdAt: serverTimestamp()
})
```

---

## 9️⃣ Firestore 데이터 구조

### market 컬렉션
```
market/{postId}
 ├ title: string
 ├ description: string
 ├ price: number
 ├ sport: string (✅ 필수)
 ├ authorId: string
 ├ images: string[]
 ├ status: "open" | "active" | "reserved" | "completed" | "done" | "hidden"
 ├ category: "equipment" | "recruit" | "match"
 ├ createdAt: Timestamp
 └ ...
```

### marketPosts 컬렉션 (랭킹 시스템용)
```
marketPosts/{postId}
 ├ title: string
 ├ description: string
 ├ price: number
 ├ sport: string (✅ 필수)
 ├ authorId: string
 ├ images: string[]
 ├ status: "open" | "active" | ...
 ├ category: "equipment" | "recruit" | "match"
 ├ rankScore: number
 ├ views: number
 ├ likesCount: number
 ├ chatCount: number
 ├ createdAt: Timestamp
 └ ...
```

### activities 컬렉션 (ActivityFeed용)
```
activities/{activityId}
 ├ type: "equipment_created" | "recruit_created" | "match_created" | "team_created" | ...
 ├ refType: "market" | "recruit" | "team" | ...
 ├ refId: string
 ├ authorId: string
 ├ teamId?: string
 ├ title: string
 ├ summary?: string
 ├ thumbnailUrl?: string
 ├ visibility: "public" | "team" | "private"
 ├ sport: string (✅ 필수)
 ├ category?: string
 ├ likeCount: number
 ├ commentCount: number
 ├ createdAt: Timestamp
 └ ...
```

---

## 🔟 Firestore Index 추가

### 필수 인덱스

#### market 컬렉션
```
Collection: market
Fields:
  - sport (Ascending)
  - status (Ascending)
  - createdAt (Descending)
```

#### marketPosts 컬렉션
```
Collection: marketPosts
Fields:
  - sport (Ascending)
  - status (Ascending)
  - rankScore (Descending)
  - createdAt (Descending)
```

#### activities 컬렉션
```
Collection: activities
Fields:
  - visibility (Ascending)
  - sport (Ascending)
  - createdAt (Descending)
```

또는 복합 인덱스:
```
Collection: activities
Fields:
  - visibility (Ascending)
  - type (Ascending)
  - sport (Ascending)
  - createdAt (Descending)
```

### 인덱스 생성 방법
1. Firebase Console → Firestore → Indexes
2. 위 인덱스들을 수동으로 추가
3. 또는 `firestore.indexes.json`에 추가 후 배포

---

## 1️⃣1️⃣ Cloud Function 수정

### onMarketPostCreated 확인
`functions/src/market/integratedPostProcessor.ts`에서 `market` 컬렉션을 감시하고 있습니다.

### 확인 사항
```typescript
// ✅ 이미 구현되어 있음
export const onMarketPostCreated = onDocumentCreated(
  {
    document: "market/{postId}", // market 컬렉션 감시
    region: "asia-northeast3",
  },
  async (event) => {
    // ... 부스트 계산, 가격 규율 체크 등
    
    // ✅ activities 컬렉션에 Activity 생성 (이미 추가됨)
    await db.collection("activities").add({
      type: activityType,
      refType: refType,
      refId: postId,
      authorId: authorId,
      title: post.title,
      sport: post.sport, // ✅ sport 필드 포함 확인
      visibility: "public",
      // ...
    });
  }
);
```

### marketPosts 동기화
`market` 컬렉션에 게시글이 생성되면 `marketPosts` 컬렉션에도 동기화되어야 합니다.

**현재**: Form에서 직접 `marketPosts`에 저장하고 있습니다.
**추천**: Cloud Function에서 자동 동기화하도록 수정.

---

## 1️⃣2️⃣ UX 동작 흐름

### 사용자 흐름
```
/sports
 ↓
종목 선택 (soccer, basketball, baseball 등)
 ↓
/sports/soccer
 ↓
거래 탭 클릭
 ↓
/sports/soccer/market
 ↓
상품 등록 클릭
 ↓
/sports/soccer/market/write
 ↓
상품 등록 완료
 ↓
/sports/soccer/market (자동 이동)
```

### 활동 흐름
```
/sports/soccer/activity
 ↓
활동 작성
 ↓
sport 자동 저장 (URL에서 추출)
 ↓
activities 컬렉션에 저장
 ↓
ActivityFeed에 표시
```

---

## 1️⃣3️⃣ 기대 결과

다음 문제가 해결됩니다:

- ✅ 상품 업로드 후 목록 미노출 → sport 필터링으로 해결
- ✅ 종목별 거래 분리 → `/sports/:sport/market` 라우팅으로 해결
- ✅ 활동 피드 충돌 → `activities` 컬렉션의 `sport` 필드로 해결
- ✅ 채팅 구조 충돌 → sport 기반 채팅방 분리
- ✅ 팀 / 이벤트 혼선 → sport 기반 라우팅으로 해결

---

## 1️⃣4️⃣ 개발 완료 후 확인 항목

### 확인 체크리스트

#### 1. 라우팅 확인
- [ ] `/sports/soccer` → 축구 허브 페이지 표시
- [ ] `/sports/soccer/market` → 축구 상품만 표시
- [ ] `/sports/basketball/market` → 농구 상품만 표시
- [ ] `/sports/soccer/activity` → 축구 활동만 표시

#### 2. 데이터 저장 확인
- [ ] 상품 등록 시 `sport` 필드 자동 저장
- [ ] `market` 컬렉션에 `sport` 필드 포함
- [ ] `marketPosts` 컬렉션에 `sport` 필드 포함
- [ ] `activities` 컬렉션에 `sport` 필드 포함

#### 3. Firestore 쿼리 확인
- [ ] `market` 컬렉션 조회 시 `where("sport", "==", sport)` 필터 적용
- [ ] `activities` 컬렉션 조회 시 `where("sport", "==", sport)` 필터 적용
- [ ] 인덱스 에러 없이 쿼리 실행

#### 4. Cloud Function 확인
- [ ] `onMarketPostCreated`가 `activities` 컬렉션에 데이터 생성
- [ ] 생성된 Activity에 `sport` 필드 포함

---

## 1️⃣5️⃣ 작업 완료 기준

다음 URL이 정상 작동하면 완료:

```
✅ /sports/soccer
✅ /sports/soccer/market
✅ /sports/soccer/activity
✅ /sports/soccer/team
✅ /sports/soccer/chat
✅ /sports/soccer/event
```

각 페이지에서 해당 종목의 데이터만 표시되어야 합니다.

---

## ⭐ 개발 시 절대 규칙

### 모든 기능은 반드시 `sport` 필드를 기준으로 동작해야 합니다.

1. **데이터 저장 시**: 항상 `sport` 필드 포함
2. **데이터 조회 시**: 항상 `where("sport", "==", sport)` 필터 적용
3. **라우팅 시**: 항상 `/sports/:sport/...` 경로 사용
4. **네비게이션 시**: 항상 `navigate(\`/sports/${sport}/...\`)` 사용

---

## 🔥 추가 작업: 기존 데이터 마이그레이션

### 기존 게시글에 sport 필드 추가

기존 `market` 컬렉션의 게시글에 `sport` 필드가 없는 경우, 마이그레이션 스크립트가 필요합니다.

```typescript
// 마이그레이션 스크립트 (한 번만 실행)
const migrateMarketPosts = async () => {
  const marketRef = collection(db, "market");
  const snapshot = await getDocs(marketRef);
  
  const batch = writeBatch(db);
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.sport) {
      // 기본값 설정 (또는 다른 로직으로 sport 추론)
      batch.update(doc.ref, {
        sport: "soccer" // 또는 적절한 기본값
      });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ ${count}개 게시글에 sport 필드 추가 완료`);
};
```

---

## 💡 마지막으로 하나만 말하겠다

지금 네 프로젝트는 이미

**스포츠 커뮤니티 + 중고거래 + 채팅 플랫폼**

수준이다.

지금 **sport 중심 구조만 완성하면**
이거는 그냥 **동네 스포츠 커뮤니티 플랫폼 MVP 완성 단계**다.

---

## 🚀 다음 단계 (선택사항)

원하면 내가 다음 단계로
**🔥 YAGO VIBE 전체 아키텍처 (진짜 서비스용)**

* Firestore 구조
* 채팅 구조
* 팀 구조
* 지도 거래
* AI 추천

까지 **완전히 정리해 줄게.**

---

## 📝 작업 순서 (권장)

1. **라우팅 확인 및 추가** (1시간)
   - `App.tsx`에서 누락된 라우트 추가
   - 각 페이지에서 `useParams`로 `sport` 추출 확인

2. **데이터 저장 로직 수정** (2시간)
   - 모든 Form에서 `sport` 필드 저장 확인
   - `market`, `marketPosts`, `activities` 모두 확인

3. **데이터 조회 로직 수정** (2시간)
   - 모든 쿼리에 `where("sport", "==", sport)` 추가
   - 인덱스 에러 확인 및 해결

4. **Cloud Function 확인** (1시간)
   - `onMarketPostCreated`에서 `activities` 생성 확인
   - `sport` 필드 포함 확인

5. **테스트 및 검증** (1시간)
   - 각 종목별 페이지 테스트
   - 데이터 분리 확인

**총 예상 시간: 7시간**

---

## ✅ 완료 체크리스트

- [ ] 모든 라우트가 `/sports/:sport/...` 구조로 변경됨
- [ ] 모든 Form에서 `sport` 필드 저장됨
- [ ] 모든 쿼리에 `sport` 필터 적용됨
- [ ] Firestore 인덱스 생성됨
- [ ] Cloud Function에서 `activities` 생성됨
- [ ] 각 종목별 페이지에서 해당 종목 데이터만 표시됨
- [ ] 기존 데이터 마이그레이션 완료 (필요 시)

---

**이 지시문을 따라 작업하면 sport 중심 아키텍처가 완성됩니다.**
