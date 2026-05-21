# 🔥 마켓 스포츠 카테고리 라우팅 연결 v1

## ✅ 완료된 작업

### 1. 홈 화면 스포츠 카테고리 버튼 라우팅
- **파일**: `src/pages/home/HomeHub.tsx`
- **변경사항**:
  - `handleSportClick` 함수 수정
  - 스포츠 이름 → sport 타입 매핑 추가
  - 카테고리 클릭 시 `/market?sport={sportType}`로 라우팅

### 2. 마켓 페이지 sport 파라미터 처리
- **파일**: `src/pages/market/MarketPage.tsx`
- **변경사항**:
  - `useSearchParams` 추가
  - URL 쿼리 파라미터에서 `sport` 읽기
  - 모든 Firestore 쿼리에 `sport` 필터 적용:
    - 기본 상품 로드 쿼리
    - AI 추천 피드 쿼리
    - AI 검색 쿼리
    - Fallback 쿼리

## 📐 구조 설계

### 라우팅 플로우

```
홈 화면 스포츠 카테고리 버튼 클릭
  ↓
handleSportClick(sportName) 호출
  ↓
sportNameToType 매핑
  ↓
navigate(`/market?sport=${sportType}`)
  ↓
MarketPage 마운트
  ↓
useSearchParams()로 sport 파라미터 읽기
  ↓
Firestore 쿼리에 where("sport", "==", sportParam) 추가
  ↓
해당 종목 게시글만 표시
```

### 스포츠 이름 → 타입 매핑

```typescript
const sportNameToType: Record<string, string> = {
  "축구": "soccer",
  "농구": "basketball",
  "러닝": "running",
  "배드민턴": "badminton",
  "야구": "baseball",
  "배구": "volleyball",
  "테니스": "tennis",
  "골프": "golf",
  "헬스/피트니스": "fitness",
  "요가/필라테스": "yoga",
  "클라이밍": "climbing",
};
```

## 🔗 통합 지점

### HomeHub.tsx
- 스포츠 카테고리 버튼 클릭 시 마켓 페이지로 라우팅
- 같은 스포츠를 다시 클릭하면 선택 해제 및 전체 마켓으로 이동

### MarketPage.tsx
- URL 쿼리 파라미터 `sport` 읽기
- 모든 Firestore 쿼리에 `sport` 필터 적용
- `sportParam` 변경 시 자동 재로드

## 🎯 효과

### 사용자 관점

1. **직관적인 네비게이션**
   - 홈 화면에서 스포츠 카테고리 클릭 → 해당 종목 마켓 페이지로 이동
   - URL에 `sport` 파라미터 포함 → 북마크/공유 가능

2. **필터링된 결과**
   - 선택한 종목의 게시글만 표시
   - 불필요한 스크롤 감소

3. **일관된 UX**
   - 기존 `useMarketPosts` 훅과 동일한 필터링 로직
   - 종목별 페이지와 동일한 동작

## ✅ 검증 체크리스트

- [x] 홈 화면 스포츠 카테고리 버튼 클릭 시 라우팅 연결
- [x] URL에 `sport` 파라미터 전달
- [x] MarketPage에서 `sport` 파라미터 읽기
- [x] 기본 상품 로드 쿼리에 `sport` 필터 적용
- [x] AI 추천 피드 쿼리에 `sport` 필터 적용
- [x] AI 검색 쿼리에 `sport` 필터 적용
- [x] Fallback 쿼리에 `sport` 필터 적용
- [x] `sportParam` 변경 시 자동 재로드

## 🚀 사용 예시

### 홈 화면에서 축구 카테고리 클릭
```
1. 사용자가 "축구" 버튼 클릭
2. navigate("/market?sport=soccer") 실행
3. MarketPage에서 sportParam = "soccer" 읽기
4. Firestore 쿼리: where("sport", "==", "soccer")
5. 축구 관련 게시글만 표시
```

### 같은 스포츠 다시 클릭
```
1. 사용자가 이미 선택된 "축구" 버튼 다시 클릭
2. 선택 해제
3. navigate("/market") 실행 (sport 파라미터 없음)
4. 전체 게시글 표시
```

---

**마켓 스포츠 카테고리 라우팅 연결 완료! 이제 홈 화면에서 스포츠 카테고리를 클릭하면 해당 종목 마켓 페이지로 이동합니다.** 🎉
