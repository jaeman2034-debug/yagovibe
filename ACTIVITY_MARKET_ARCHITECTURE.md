# ✅ Activity / Market 구조 통합 설계 문서

## 🎯 0. 목표 (절대 기준)

앱의 하단 네비게이션은 역할이 명확히 분리되어야 한다.

* **거래 탭 = 기능 영역 (Marketplace)**
* **활동 탭 = 피드 영역 (Timeline)**

이 둘은 서로 다른 데이터 소스를 사용해야 하며
같은 데이터를 중복 조회하면 안 된다.

---

## 1️⃣ 데이터 구조 원칙

### 1-1. 모든 글은 "기능 컬렉션"에 원본 저장

원본 컬렉션:

* `marketPosts` → 거래 글
* `teams` → 팀 글
* `events` → 이벤트 글
* `matches` → 매칭 글

👉 이 컬렉션들이 **실제 데이터 저장소**

---

### 1-2. activityLogs는 표시용 로그 컬렉션

`activityLogs`는 원본이 아니다.

역할:

* 앱 타임라인 피드
* 최근 활동 표시
* 알림 기반 데이터
* 추천/인기 계산 기반

즉:

👉 activityLogs = **요약 로그 캐시**

---

## 2️⃣ 글 생성 플로우 (필수)

모든 글 생성 시 아래 순서 유지

### 2-1. 원본 먼저 생성

예:

```typescript
const postRef = await addDoc(collection(db, "marketPosts"), {
  sport: "soccer",
  category: "equipment",
  title: "축구화 판매",
  price: 50000,
  // ... 기타 필드
});
```

### 2-2. 성공 후 activityLogs 생성

```typescript
try {
  await createActivityLog({
    type: "market",
    sport: "soccer",
    authorId: user.uid,
    title: "축구화 판매",
    summary: "50000원",
    sourceId: postRef.id,
    sourceType: "marketPosts",
    category: "equipment",
  });
} catch (err) {
  // 🔥 로그 생성 실패해도 원본 생성은 성공 (에러 무시)
  console.warn("Activity 로그 생성 실패 (무시):", err);
}
```

🚫 원본 생성 실패 시 로그 생성 금지

---

## 3️⃣ 화면별 데이터 조회 규칙

### 3-1. 거래 탭 (`/market`, `/sports/:sport?tab=market`)

조회 컬렉션:

```
marketPosts
```

🚫 activityLogs 조회 금지

목적:

* 상품 탐색
* 가격 필터
* 상태 필터
* 검색 기능

👉 쇼핑 UX

**쿼리 예시:**

```typescript
const q = query(
  collection(db, "marketPosts"),
  where("sport", "==", sport),
  where("category", "==", category),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
);
```

---

### 3-2. 활동 탭 (`/activity`, `/sports/:sport?tab=activity`)

조회 컬렉션:

```
activityLogs
```

🚫 marketPosts 직접 조회 금지

목적:

* 앱 타임라인
* 소셜 피드
* 최근 활동

👉 SNS UX

**쿼리 예시:**

```typescript
const conditions: any[] = [];

// sport 필터
if (sport) {
  conditions.push(where("sport", "==", sport));
}

// type 필터
if (filter !== "all") {
  conditions.push(where("type", "==", filter));
}

conditions.push(orderBy("createdAt", "desc"));
conditions.push(limit(10));

const q = query(collection(db, "activityLogs"), ...conditions);
```

---

## 4️⃣ 종목 필터 구조 (공통 규칙)

모든 컬렉션에 `sport` 필드 유지

예:

```typescript
{
  sport: "soccer",
  // ... 기타 필드
}
```

### 적용 방식

```typescript
// marketPosts
where("sport", "==", "soccer")

// activityLogs
where("sport", "==", "soccer")
```

👉 동일한 필터 로직 사용

---

## 5️⃣ 홈 화면 데이터 규칙

홈은 기능 페이지가 아니다.

홈에서 조회:

* 최근 활동 → `activityLogs` (최신 3개)
* 빠른 시작 → 라우팅만
* 카테고리 → 필터 이동만

🚫 홈에서 marketPosts 직접 조회 금지

**홈 쿼리 예시:**

```typescript
// ✅ 허용
const q = query(
  collection(db, "activityLogs"),
  orderBy("createdAt", "desc"),
  limit(3)
);

// ❌ 금지
const q = query(
  collection(db, "marketPosts"),
  // ...
);
```

---

## 6️⃣ Firestore 스키마 표준

### activityLogs 문서 필수 필드

```typescript
{
  type: "market" | "team" | "event" | "match",
  sport: string, // 원본 종목 (기본값 없음, 항상 명시)
  authorId: string,
  title: string,
  summary?: string, // 요약 정보 (가격, 상태 등)
  sourceId: string, // 원본 문서 ID
  sourceType: string, // 원본 컬렉션 타입 (marketPosts, teams, events)
  refId?: string, // 호환성 유지 (sourceId와 동일)
  category?: string, // market의 경우 category (equipment/recruit/match)
  thumbnail?: string,
  createdAt: serverTimestamp(),
}
```

### marketPosts 문서 필수 필드

```typescript
{
  sport: string,
  category: "equipment" | "recruit" | "match",
  title: string,
  description: string,
  price?: number,
  status: "active" | "sold" | "closed",
  authorId: string,
  createdAt: serverTimestamp(),
  // ... 기타 필드
}
```

---

## 7️⃣ UI 구조 규칙

### 7-1. FAB 글쓰기 버튼

* 위치: Layout 루트 (`AppShellLayout`)
* 고정: viewport 기준 `fixed`
* 위치: `bottom-[88px] right-6`
* z-index: `z-50`

🚫 페이지 내부에 배치 금지 (스크롤 컨테이너 기준 fixed 방지)

---

### 7-2. 카드 UI 분리

* 활동 탭 = 피드 카드 디자인 (`ActivityCard`)
* 거래 탭 = 상품 카드 디자인 (`ProductCard`)

👉 같은 카드 UI 재사용 금지

---

## 8️⃣ 금지 사항

### 8-1. 데이터 조회 금지

🚫 거래 페이지에서 activityLogs 조회 금지
🚫 활동 페이지에서 marketPosts 조회 금지
🚫 홈에서 기능 데이터 직접 조회 금지

### 8-2. UI 구조 금지

🚫 FAB를 페이지 내부에 배치 금지
🚫 같은 카드 컴포넌트를 활동/거래에서 재사용 금지

### 8-3. 데이터 생성 금지

🚫 activityLogs만 생성하고 원본 미생성 금지
🚫 원본 생성 실패 시 activityLogs 생성 금지

---

## 9️⃣ 기대 결과

이 구조 적용 시:

* 거래 = 기능 중심 UX
* 활동 = 피드 중심 UX
* 종목별 분배 정상
* 추천/알림 확장 가능
* 인기글 계산 가능

👉 즉 플랫폼 구조 완성

---

## 🔟 Firestore 인덱스 필수 목록

### marketPosts 컬렉션

1. `sport` (ASC) + `category` (ASC) + `status` (ASC) + `createdAt` (DESC)
2. `sport` (ASC) + `status` (ASC) + `createdAt` (DESC)
3. `sport` (ASC) + `category` (ASC) + `createdAt` (DESC)

### activityLogs 컬렉션

1. `sport` (ASC) + `type` (ASC) + `createdAt` (DESC)
2. `sport` (ASC) + `createdAt` (DESC)
3. `type` (ASC) + `createdAt` (DESC)

---

## 📝 구현 체크리스트

### 글 생성 플로우

- [ ] EquipmentForm: 원본 생성 → activityLogs 생성
- [ ] RecruitForm: 원본 생성 → activityLogs 생성
- [ ] MatchForm: 원본 생성 → activityLogs 생성
- [ ] TeamOnboarding: 원본 생성 → activityLogs 생성
- [ ] createTeamSimple: 원본 생성 → activityLogs 생성

### 화면별 조회

- [ ] 거래 탭: marketPosts만 조회
- [ ] 활동 탭: activityLogs만 조회
- [ ] 홈 화면: activityLogs만 조회 (최신 3개)

### UI 구조

- [ ] FAB: AppShellLayout에 배치
- [ ] ActivityCard: 활동 탭 전용
- [ ] ProductCard: 거래 탭 전용

### 종목 필터

- [ ] 거래 탭: sport 필터 적용
- [ ] 활동 탭: sport 필터 적용
- [ ] URL 파라미터에서 sport 읽기

---

## 🚀 다음 단계

이 구조 완성 후:

1. Firestore 인덱스 생성
2. ActivityFeed 쿼리 최적화
3. Market 쿼리 최적화
4. create 페이지 플로우 정리
5. 추천/인기글 알고리즘 구현
