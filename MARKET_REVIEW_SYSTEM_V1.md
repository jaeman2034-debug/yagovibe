# 🔥 마켓 리뷰 시스템 v1 구현 완료

## ✅ 완료된 작업

### 1. marketReviews 컬렉션 생성
- **타입 정의**: `MarketReview` 인터페이스
- **필드**:
  - `postId` - 게시글 ID
  - `sellerId` - 판매자 ID
  - `buyerId` - 구매자 ID
  - `rating` - 평점 (1~5)
  - `comment` - 리뷰 내용 (선택)
  - `createdAt` - 작성 시각

### 2. 리뷰 작성 조건 검증
- **서비스**: `marketReviewService.ts`
- **조건**:
  - `post.status == "completed"` 또는 `"done"`
  - `buyerId` 또는 `sellerId` 일치
  - 동일 `postId` + `userId` 조합 중복 방지
  - `rating` 범위 검증 (1~5)

### 3. 리뷰 작성 모달
- **컴포넌트**: `ReviewModal.tsx`
- **기능**:
  - 평점 선택 (1~5 별점)
  - 리뷰 내용 입력 (최대 500자)
  - 작성 중 상태 표시
  - 에러 메시지 표시

### 4. 거래 완료 후 UX
- **컴포넌트**: `WriteReviewButton.tsx`
- **위치**: 상세 페이지 (`EquipmentDetail.tsx`)
- **조건**: 거래 완료된 글에만 표시
- **동작**: 
  - 채팅방에서 `buyerId` 자동 조회
  - 리뷰 작성 가능 여부 확인
  - 모달 열기

### 5. 판매자 카드 개선
- **컴포넌트**: `SellerInfoCard.tsx`
- **추가 기능**:
  - 평균 평점 표시 (소수점 1자리)
  - 리뷰 수 표시
  - 최근 리뷰 3개 표시 (별점 + 내용)

## 📐 구조 설계

### 리뷰 작성 플로우

```
거래 완료 (status = "completed")
  ↓
채팅방에서 buyerId 확인
  ↓
리뷰 작성 가능 여부 확인
  ↓
리뷰 작성 모달 열기
  ↓
리뷰 저장 (marketReviews 컬렉션)
  ↓
판매자 통계 업데이트
```

### Firestore 쿼리

**판매자 리뷰 통계**:
```typescript
query(
  collection(db, "marketReviews"),
  where("sellerId", "==", sellerId),
  orderBy("createdAt", "desc")
)
```

**판매자 최근 리뷰**:
```typescript
query(
  collection(db, "marketReviews"),
  where("sellerId", "==", sellerId),
  orderBy("createdAt", "desc"),
  limit(3)
)
```

**중복 리뷰 방지**:
```typescript
query(
  collection(db, "marketReviews"),
  where("postId", "==", postId),
  where("buyerId", "==", userId) // 또는 sellerId
)
```

## 🔗 통합 지점

### 상세 페이지
- `EquipmentDetail.tsx`: 거래 완료 후 리뷰 작성 버튼 표시

### 판매자 정보
- `SellerInfoCard.tsx`: 리뷰 통계 및 최근 리뷰 표시

### 서비스
- `marketReviewService.ts`: 리뷰 CRUD 및 통계 계산

## 🚀 다음 단계

### 1️⃣ 판매자 점수 공식 설계
- 리뷰 평점 기반 신뢰도 점수
- 거래 완료 횟수 가중치
- 최근 리뷰 가중치

### 2️⃣ 상위 판매자 노출 알고리즘
- 신뢰도 점수 기반 정렬
- 카테고리별 상위 판매자
- 종목별 상위 판매자

### 3️⃣ 사기 방지 신뢰도 레이어
- 낮은 평점 판매자 경고
- 리뷰 패턴 분석
- 자동 신고 시스템

## ✅ 검증 체크리스트

- [x] marketReviews 컬렉션 타입 정의
- [x] 리뷰 작성 조건 검증 로직
- [x] 리뷰 작성 모달 컴포넌트
- [x] 거래 완료 후 리뷰 작성 버튼
- [x] 판매자 카드 리뷰 통계 표시
- [x] Firestore 인덱스 추가
- [x] 중복 리뷰 방지 로직

---

**리뷰 시스템 구현 완료! 이제 마켓이 신뢰 기반 거래 서비스로 완성되었습니다.** 🎉
