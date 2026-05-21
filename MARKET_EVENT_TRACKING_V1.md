# 🔥 마켓 이벤트 트래킹 시스템 v1 구현 완료

## ✅ 완료된 작업

### 1. analytics 서비스 확장
- **파일**: `src/lib/analytics.ts`
- **추가된 함수**: `trackMarket` 객체
  - `viewPost` - 게시글 상세 진입
  - `clickChat` - 채팅 시작
  - `toggleLike` - 좋아요 클릭
  - `search` - 검색 실행
  - `completeTransaction` - 거래 완료
  - `writeReview` - 리뷰 작성

### 2. 이벤트 연결

#### 게시글 상세 진입
- **위치**: 
  - `src/features/market/pages/MarketPostDetailPage.tsx`
  - `src/features/market/components/details/EquipmentDetail.tsx`
  - `src/pages/market/ProductDetail.tsx`
- **이벤트**: `trackMarket.viewPost({ postId, sport, category, price })`

#### 채팅 시작
- **위치**: 
  - `src/features/market/components/VisitorActions.tsx`
- **이벤트**: `trackMarket.clickChat({ postId, sellerId, price })`

#### 좋아요 클릭
- **위치**: 
  - `src/features/market/components/VisitorActions.tsx`
- **이벤트**: `trackMarket.toggleLike({ postId, isLiked })`

#### 검색 실행
- **위치**: 
  - `src/hooks/useSemanticSearch.ts` (시맨틱 검색)
  - `src/pages/market/MarketPage.tsx` (AI 검색)
- **이벤트**: `trackMarket.search({ keyword, resultCount, source })`

#### 거래 완료
- **위치**: 
  - `src/features/market/components/CompleteTransactionButton.tsx`
- **이벤트**: `trackMarket.completeTransaction({ postId, price, sellerId })`

#### 리뷰 작성
- **위치**: 
  - `src/components/market/ReviewModal.tsx`
- **이벤트**: `trackMarket.writeReview({ postId, rating, sellerId, hasComment })`

## 📐 구조 설계

### 이벤트 트래킹 플로우

```
사용자 행동 발생
  ↓
트래킹 함수 호출 (trackMarket.*)
  ↓
track() 함수 호출 (기존 analytics.ts)
  ↓
개발 환경: console.log
프로덕션: Firebase Analytics
  ↓
(추후) Firestore 저장 / GA4 / Amplitude 연동 가능
```

### 이벤트 타입 정의

```typescript
// 게시글 상세 진입
viewPost: {
  postId: string;
  sport?: string;
  category?: string;
  price?: number;
}

// 채팅 시작
clickChat: {
  postId: string;
  sellerId: string;
  price?: number;
}

// 좋아요 클릭
toggleLike: {
  postId: string;
  isLiked: boolean; // 클릭 후 상태
}

// 검색 실행
search: {
  keyword: string;
  resultCount: number;
  source?: 'search_bar' | 'ai_search' | 'semantic_search';
}

// 거래 완료
completeTransaction: {
  postId: string;
  price?: number;
  sellerId: string;
}

// 리뷰 작성
writeReview: {
  postId: string;
  rating: number; // 1~5
  sellerId: string;
  hasComment: boolean;
}
```

## 🔗 통합 지점

### 기존 analytics.ts 활용
- 기존 `track()` 함수 재사용
- Firebase Analytics 연동 유지
- 개발 환경에서는 console.log

### 비동기 로딩
- 모든 트래킹 호출은 `import()` 동적 로딩 사용
- 에러 발생 시에도 UX 영향 없음 (catch로 무시)

## 🎯 효과

### 데이터 수집 가능 항목

1. **게시글 상세 진입률**
   - 어떤 게시글이 많이 조회되는지
   - 종목/카테고리별 조회 패턴

2. **채팅 전환율**
   - 조회 → 채팅 전환율
   - 가격대별 채팅 시작률

3. **좋아요 패턴**
   - 좋아요 클릭률
   - 좋아요 후 채팅 전환율

4. **검색 효과**
   - 검색어별 결과 수
   - 검색 → 상세 진입 전환율

5. **거래 완료율**
   - 채팅 → 거래 완료 전환율
   - 가격대별 거래 완료율

6. **리뷰 작성률**
   - 거래 완료 → 리뷰 작성 전환율
   - 평점 분포

## ✅ 검증 체크리스트

- [x] analytics 서비스에 trackMarket 함수 추가
- [x] 게시글 상세 진입 트래킹 연결
- [x] 채팅 시작 트래킹 연결
- [x] 좋아요 클릭 트래킹 연결
- [x] 검색 실행 트래킹 연결
- [x] 거래 완료 트래킹 연결
- [x] 리뷰 작성 트래킹 연결
- [x] 비동기 로딩으로 UX 영향 없음

## 🚀 다음 단계

### 1️⃣ Firestore 저장
- 이벤트를 Firestore에 저장하여 분석
- 대시보드 구축

### 2️⃣ 데이터 기반 추천 튜닝
- 검색/조회 이력 기반 개인화
- 클릭률 높은 게시글 우선 노출

### 3️⃣ 전환율 분석 대시보드
- 조회 → 채팅 → 거래 완료 퍼널 분석
- 병목 지점 파악

### 4️⃣ 수익화 실험 설계
- A/B 테스트 기반 수익화 전략
- 프리미엄 기능 전환율 분석

---

**마켓 이벤트 트래킹 시스템 v1 구현 완료! 이제 핵심 사용자 행동 데이터를 수집할 수 있습니다.** 🎉
