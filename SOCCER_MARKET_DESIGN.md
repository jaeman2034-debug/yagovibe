# 🔥 축구 마켓 전용 구조 설계

## 🎯 목표 컨셉

> **"당근마켓 + 풋살매칭 + 팀 모집이 합쳐진 축구 커뮤니티 허브"**

- 중고 거래 (당근마켓 스타일)
- 팀 모집 (사람 모으기)
- 경기 매칭 (경기 잡기)

---

## 📊 데이터 구조 확정

### 기본 필드 (모든 카테고리 공통)

```typescript
{
  id: string;
  sport: "soccer"; // 항상 축구
  category: "equipment" | "recruit" | "match";
  title: string;
  description?: string;
  location?: string;
  images: string[];
  status: "open" | "reserved" | "done";
  createdAt: Timestamp;
  authorId: string;
  authorName?: string;
  viewCount?: number;
  likeCount?: number;
}
```

### 카테고리별 특화 필드

#### 1. 중고 (equipment)
```typescript
{
  price: number;        // 가격 (필수)
  condition?: "new" | "like_new" | "used" | "poor"; // 상태
  brand?: string;       // 브랜드
}
```

#### 2. 모집 (recruit)
```typescript
{
  people: number;        // 모집 인원수
  currentPeople?: number; // 현재 인원수
  position?: string[];   // 모집 포지션 ["FW", "MF", "DF", "GK"]
  level?: "입문" | "아마" | "프로지향"; // 실력 레벨
  ageRange?: string;    // 연령대 "20-30"
  practiceDay?: string[]; // 연습 요일
  practiceLocation?: string; // 연습 장소
}
```

#### 3. 매칭 (match)
```typescript
{
  matchDate: Timestamp; // 경기 날짜/시간
  matchType: "5v5" | "7v7" | "11v11"; // 경기 형식
  people: number;       // 필요 인원수
  currentPeople?: number; // 현재 인원수
  position?: string[];  // 필요 포지션
  level?: "입문" | "아마" | "프로지향";
  location?: string;    // 경기 장소
  fee?: number;         // 참가비
}
```

---

## 🎨 UI 구조 설계

### 카테고리별 카드 컴포넌트 분리

```
src/features/market/components/
├── cards/
│   ├── EquipmentCard.tsx    # 중고 거래 카드
│   ├── RecruitCard.tsx       # 모집 카드
│   └── MatchCard.tsx         # 매칭 카드
└── MarketPostCard.tsx        # 라우터 (카테고리별 분기)
```

### 카드별 UI 특징

#### EquipmentCard (중고)
- 가격 강조
- 상태 배지 (새상품/중고/하자있음)
- 브랜드 태그
- 당근마켓 스타일

#### RecruitCard (모집)
- 인원수 표시 (현재/모집)
- 포지션 태그 (FW/MF/DF/GK)
- 실력 레벨 배지
- 연습 정보 (요일/장소)

#### MatchCard (매칭)
- 경기 날짜/시간 강조
- 경기 형식 (5:5, 7:7, 11:11)
- 인원수 표시
- 참가비 표시
- 위치 정보

---

## 📝 글쓰기 폼 구조

### 라우팅
```
/soccer/market/write
/soccer/market/write?category=equipment
/soccer/market/write?category=recruit
/soccer/market/write?category=match
```

### 컴포넌트 구조
```
src/features/market/pages/
└── MarketWritePage.tsx
    ├── CategorySelector (카테고리 선택)
    ├── EquipmentForm (중고 폼)
    ├── RecruitForm (모집 폼)
    └── MatchForm (매칭 폼)
```

### 폼별 필드

#### EquipmentForm
- 제목
- 가격 (필수)
- 상태 선택
- 브랜드
- 설명
- 이미지 (다중)
- 위치

#### RecruitForm
- 제목
- 모집 인원수
- 포지션 선택 (다중)
- 실력 레벨
- 연령대
- 연습 요일
- 연습 장소
- 설명
- 이미지

#### MatchForm
- 제목
- 경기 날짜/시간
- 경기 형식 (5:5/7:7/11:11)
- 필요 인원수
- 포지션 선택
- 실력 레벨
- 경기 장소
- 참가비
- 설명
- 이미지

---

## 🔍 필터 구조

### 현재 필터
- 카테고리 (전체/중고/모집/매칭)

### 추가 필터 (향후)
- 포지션 필터 (모집/매칭)
- 날짜 필터 (매칭)
- 실력 레벨 필터
- 지역 필터

---

## 🚀 구현 단계

### Phase 1: 데이터 구조 확정 ✅
- [x] 타입 정의
- [x] Firestore 스키마 설계

### Phase 2: 카드 컴포넌트 분리
- [ ] EquipmentCard 구현
- [ ] RecruitCard 구현
- [ ] MatchCard 구현
- [ ] MarketPostCard 라우터 수정

### Phase 3: 글쓰기 폼
- [ ] MarketWritePage 기본 구조
- [ ] EquipmentForm 구현
- [ ] RecruitForm 구현
- [ ] MatchForm 구현

### Phase 4: 필터 개선
- [ ] 포지션 필터
- [ ] 날짜 필터
- [ ] 실력 레벨 필터

---

## 📌 다음 액션

1. **타입 정의 확장** (`src/features/market/types.ts`)
   - 카테고리별 필드 타입 추가

2. **카드 컴포넌트 분리**
   - `MarketPostCard.tsx`를 라우터로 변경
   - 카테고리별 카드 컴포넌트 생성

3. **글쓰기 폼 구조 설계**
   - `MarketWritePage.tsx` 생성
   - 카테고리별 폼 컴포넌트 생성
