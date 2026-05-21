# 🔥 카테고리 자동 분기 구조 설계 완료

## ✅ 완료된 작업

### 1. 카테고리 설정 중앙화
- **파일**: `src/data/marketCategories.ts`
- **목적**: 모든 카테고리 메타데이터를 한 곳에서 관리
- **장점**: 
  - 새 카테고리 추가 시 설정 파일만 수정
  - 타입 안정성 보장
  - 활성화/비활성화 쉽게 관리

### 2. 카테고리 컴포넌트 개선
- `src/components/market/MarketCategoryTabs.tsx`
- `src/features/market/components/MarketTabs.tsx`
- 중앙화된 설정 사용으로 변경
- 활성화된 카테고리만 자동 표시

## 📐 구조 설계

### 카테고리 계층 구조

```
sport (종목)
  └── category (카테고리)
      └── posts (게시글)
```

### Firestore 쿼리 구조

```typescript
// 종목별 + 카테고리별
where("sport", "==", "soccer")
where("category", "==", "equipment")

// 종목별 (전체 카테고리)
where("sport", "==", "soccer")
// category 필터 없음

// 전체 (전종목 + 전체 카테고리)
// sport, category 필터 모두 없음
```

## 🎯 카테고리 설정 구조

### CategoryConfig 인터페이스

```typescript
interface CategoryConfig {
  id: MarketCategory;        // Firestore 필드값
  label: string;            // UI 표시명
  description?: string;     // 설명 (툴팁용)
  icon?: string;            // 향후 아이콘 추가 가능
  color?: string;           // 향후 색상 테마 추가 가능
  enabled: boolean;         // 활성화 여부
  order: number;           // UI 표시 순서
}
```

### 현재 활성 카테고리

1. **전체** (`all`) - order: 0
2. **중고** (`equipment`) - order: 1
3. **모집** (`recruit`) - order: 2
4. **매칭** (`match`) - order: 3

### 향후 확장 가능한 카테고리

- **레슨** (`lesson`) - 현재 비활성화
- **구장양도** (`ground`) - 현재 비활성화
- **티켓** (`ticket`) - 현재 비활성화

## 🚀 사용 방법

### 새 카테고리 추가하기

1. `src/data/marketCategories.ts` 파일 열기
2. `MARKET_CATEGORIES` 배열에 새 카테고리 추가:

```typescript
{
  id: "lesson",
  label: "레슨",
  description: "레슨/코칭",
  enabled: true,  // 활성화
  order: 4,
}
```

3. 자동으로 UI에 반영됨! ✨

### 카테고리 활성화/비활성화

```typescript
// 활성화
enabled: true

// 비활성화
enabled: false
```

### 카테고리 순서 변경

```typescript
order: 1  // 낮을수록 앞에 표시
```

## 📊 쿼리 분기 로직

### useMarketPosts Hook

```typescript
// 카테고리 필터 적용
if (queryParams.category && queryParams.category !== "all") {
  q = query(q, where("category", "==", queryParams.category));
}
```

### URL 파라미터 동기화

```typescript
// 카테고리 변경 시 URL 업데이트
const handleCategoryChange = (newCategory: MarketCategory) => {
  const newParams = new URLSearchParams(searchParams);
  if (newCategory === "all") {
    newParams.delete("category");
  } else {
    newParams.set("category", newCategory);
  }
  setSearchParams(newParams);
};
```

## 🎨 확장 가능성

### 향후 추가 가능한 기능

1. **카테고리별 아이콘**
   ```typescript
   icon: "equipment-icon"
   ```

2. **카테고리별 색상 테마**
   ```typescript
   color: "#3b82f6"
   ```

3. **카테고리별 통계**
   ```typescript
   stats: {
     postCount: 123,
     activeCount: 45
   }
   ```

4. **카테고리별 권한**
   ```typescript
   permissions: {
     canPost: true,
     requiresVerification: false
   }
   ```

## ✅ 검증 체크리스트

- [x] 카테고리 설정 중앙화 완료
- [x] 컴포넌트에서 중앙 설정 사용
- [x] 쿼리 분기 로직 구현 완료
- [x] URL 파라미터 동기화 완료
- [x] 타입 안정성 보장
- [x] 확장성 확보

## 🔥 다음 단계

1. **인기글 랭킹 구조** - views, likes, chatCount 필드 추가
2. **추천 피드 알고리즘** - 개인화 UX 시작
3. **카테고리별 통계** - 실시간 카운트 표시

---

**설계 완료! 이제 카테고리 시스템이 확장 가능하고 유지보수하기 쉬운 구조가 되었습니다.** 🎉
