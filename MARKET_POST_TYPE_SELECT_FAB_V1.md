# 🔥 종목 페이지 글쓰기 FAB + 타입 선택 모달 v1

## ✅ 완료된 작업

### 1. 글쓰기 타입 선택 모달 컴포넌트
- **파일**: `src/components/market/PostTypeSelectModal.tsx`
- **기능**:
  - 하단에서 슬라이드업 애니메이션으로 표시
  - 글쓰기 타입 선택 옵션:
    - 상품 올리기 (equipment)
    - 팀 모집 (recruit)
    - 매칭 찾기 (match)
  - 선택 시 해당 카테고리로 글쓰기 페이지 이동
  - sport 자동 전달

### 2. MarketFAB 수정
- **파일**: `src/components/market/MarketFAB.tsx`
- **변경사항**:
  - FAB 클릭 시 바로 글쓰기 페이지로 이동하던 것을 모달 표시로 변경
  - `PostTypeSelectModal` 통합
  - 모달 상태 관리 (`useState`)

## 📐 구조 설계

### 사용자 플로우

```
종목 페이지 진입
  ↓
우측 하단 FAB (+) 버튼 표시
  ↓
FAB 클릭
  ↓
글쓰기 타입 선택 모달 표시 (하단 슬라이드업)
  ↓
사용자가 타입 선택
  - 상품 올리기
  - 팀 모집
  - 매칭 찾기
  ↓
해당 카테고리로 글쓰기 페이지 이동
  예: /soccer/market/write?category=equipment
  ↓
sport 자동 전달 (URL에서 추출)
```

### 컴포넌트 구조

```
SportMarketPage
  └── MarketFAB
        ├── FAB Button (+)
        └── PostTypeSelectModal
              ├── 상품 올리기 (equipment)
              ├── 팀 모집 (recruit)
              └── 매칭 찾기 (match)
```

## 🎨 UI/UX 특징

### FAB (Floating Action Button)
- **위치**: 우측 하단
- **아이콘**: + (Plus)
- **스타일**: 
  - 파란색 배경 (`bg-blue-600`)
  - 원형 버튼 (56px × 56px)
  - 하단 네비게이션 고려한 위치
  - Portal로 렌더링 (fixed position 보장)

### 모달
- **위치**: 하단에서 슬라이드업
- **애니메이션**: `slide-up` (0.3s ease-out)
- **배경**: 반투명 검은색 + blur 효과
- **옵션 카드**:
  - 아이콘 + 제목 + 설명
  - 호버 시 파란색 테두리
  - 클릭 시 해당 폼으로 이동

## 🔗 통합 지점

### PostTypeSelectModal
- `sport` prop으로 현재 종목 받기
- 각 옵션의 `route` 함수로 URL 생성
- `navigate`로 해당 페이지 이동

### MarketFAB
- `contextSport` prop으로 현재 종목 받기
- 모달 열기/닫기 상태 관리
- 이벤트 트래킹 (FAB 클릭)

### MarketWritePage
- URL 쿼리 파라미터에서 `category` 읽기
- URL 경로에서 `sport` 추출
- 카테고리별 폼 렌더링

## 🎯 효과

### 사용자 관점

1. **직관적인 글쓰기 진입**
   - 언제든 FAB 클릭으로 글쓰기 시작
   - 타입 선택으로 원하는 폼으로 바로 이동

2. **종목 Context 자동 유지**
   - 종목 페이지에서 글쓰기 시 sport 자동 전달
   - 사용자가 다시 선택할 필요 없음

3. **명확한 타입 구분**
   - 상품 올리기 / 팀 모집 / 매칭 찾기 명확히 구분
   - 각 타입에 맞는 폼으로 바로 이동

### 개발자 관점

1. **재사용 가능한 컴포넌트**
   - `PostTypeSelectModal`: 독립적인 모달 컴포넌트
   - 다른 페이지에서도 재사용 가능

2. **확장 가능한 구조**
   - 새로운 글쓰기 타입 추가 용이
   - `POST_TYPES` 배열에 옵션 추가만 하면 됨

3. **일관된 라우팅**
   - 모든 글쓰기 타입이 동일한 라우팅 패턴 사용
   - `/sport/market/write?category=type`

## 🚀 사용 예시

### 축구 페이지에서 상품 올리기
```
1. 사용자가 /soccer/market 페이지 진입
2. 우측 하단 FAB (+) 버튼 클릭
3. 모달 표시: "상품 올리기" 선택
4. /soccer/market/write?category=equipment로 이동
5. EquipmentForm 렌더링 (sport="soccer" 자동 전달)
```

### 농구 페이지에서 팀 모집
```
1. 사용자가 /basketball/market 페이지 진입
2. 우측 하단 FAB (+) 버튼 클릭
3. 모달 표시: "팀 모집" 선택
4. /basketball/market/write?category=recruit로 이동
5. RecruitForm 렌더링 (sport="basketball" 자동 전달)
```

## 📝 향후 개선 사항

### 추가 가능한 기능

1. **이벤트 등록 타입 추가**
   ```typescript
   {
     id: "event",
     label: "이벤트 등록",
     description: "이벤트 등록하기",
     icon: "🎉",
     route: (sport) => `/${sport}/market/write?category=event`,
   }
   ```

2. **첫 방문 가이드 툴팁**
   - 첫 방문 시 FAB에 툴팁 표시
   - "글 올리기 가이드" 안내

3. **거래 없는 종목 CTA**
   - 게시글이 없을 때 "첫 글 작성 CTA" 표시
   - FAB에 pulse 애니메이션 추가

4. **최근 선택 타입 기억**
   - localStorage에 최근 선택한 타입 저장
   - 다음 글쓰기 시 해당 타입으로 바로 이동

## ✅ 검증 체크리스트

- [x] FAB 버튼 우측 하단 고정 표시
- [x] FAB 클릭 시 모달 표시
- [x] 모달에서 글쓰기 타입 선택 가능
- [x] 선택 시 해당 카테고리로 글쓰기 페이지 이동
- [x] sport 자동 전달
- [x] 하단 슬라이드업 애니메이션
- [x] 모달 배경 클릭 시 닫기
- [x] 이벤트 트래킹

---

**종목 페이지 글쓰기 FAB + 타입 선택 모달 완료! 이제 사용자가 언제든 쉽게 글을 작성할 수 있습니다.** 🎉
