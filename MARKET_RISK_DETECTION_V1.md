# 🔥 사기 의심 패턴 탐지/차단 레이어 v1 구현 완료

## ✅ 완료된 작업

### 1. 데이터 필드 추가
- **users 컬렉션**:
  - `riskScore` (number, default 0)
  - `riskFlags` (string[], default [])
  - `riskTier` ("low" | "medium" | "high", default "low")
  - `lastRiskUpdatedAt` (timestamp)

- **marketPosts 컬렉션**:
  - `riskScore` (number, default 0)
  - `riskFlags` (string[], default [])
  - `isShadowBanned` (boolean, default false)

### 2. v1 탐지 룰 구현
- **파일**: `src/config/riskRules.ts`
- **룰**:
  - 신규 계정(7일 이내) + 고가(50만원 이상) + 외부연락처 포함 → risk +30
  - 동일 이미지/유사 제목을 24시간 내 3건 이상 업로드 → risk +20
  - 거래완료 없이 7일 내 10건 이상 게시글 생성 → risk +15
  - 리뷰/거래 이력 0인데 고가 + 외부연락처 포함 → risk +25

### 3. riskScore 계산 유틸
- **파일**: `src/utils/riskScoring.ts`
- **함수**:
  - `detectExternalContact()` - 외부 연락처 탐지
  - `detectPostFlags()` - 게시글 플래그 탐지
  - `calcPostRiskScore()` - 게시글 위험 점수 계산
  - `calcUserRiskScore()` - 사용자 위험 점수 계산
  - `getRiskTier()` - 위험 등급 결정

### 4. 트리거/갱신 위치
- **게시글 생성 시**: `EquipmentForm.tsx`에서 `updatePostRiskScore`, `updateUserRiskScore` 호출
- **리뷰 작성 시**: `marketReviewService.ts`에서 `decreaseUserRiskOnReview` 호출
- **거래 완료 시**: `CompleteTransactionButton.tsx`에서 `decreaseUserRiskOnTransactionComplete` 호출

### 5. 노출 억제 (Shadow Ban)
- **임계값**: `riskScore >= 50`일 때 `isShadowBanned = true`
- **적용 위치**:
  - `useMarketPosts.ts` - 기본 게시글 목록
  - `useMarketPostsPopular.ts` - 인기 게시글
  - `useMarketFeedRecommended.ts` - 추천 피드
  - `topSellerService.ts` - 상위 판매자 게시글
- **예외**: 작성자 본인은 자신의 글에서 볼 수 있음 (쿼리에서 제외하지 않음)

### 6. UI 경고 배너
- **컴포넌트**: `RiskWarningBanner.tsx`
- **조건**: `riskTier === "high"` 또는 `post.riskScore >= 70`
- **위치**: 게시글 상세 페이지 (`EquipmentDetail.tsx`)
- **내용**: 외부 연락 유도/선입금 요구 주의 안내

## 📐 구조 설계

### 위험 점수 계산 플로우

```
게시글 생성/수정
  ↓
calcPostRiskScore() 호출
  ↓
외부 연락처 탐지
  ↓
작성자 정보 조회 (계정 나이, 거래 이력)
  ↓
중복 게시글 확인
  ↓
위험 점수 계산
  ↓
isShadowBanned 결정 (riskScore >= 50)
  ↓
Firestore 업데이트
```

### 사용자 위험 점수 계산 플로우

```
게시글 생성/수정 시
  ↓
calcUserRiskScore() 호출
  ↓
최근 게시글 조회
  ↓
과다 게시글 확인
  ↓
게시글 평균 위험 점수 반영
  ↓
위험 등급 결정 (low/medium/high)
  ↓
Firestore 업데이트
```

### Shadow Ban 적용

**쿼리 예시**:
```typescript
// 기본 쿼리 (여유있게 가져옴)
const q = query(
  collection(db, "marketPosts"),
  where("status", "in", ["active", "open"]),
  orderBy("createdAt", "desc"),
  limit(40) // 2배로 가져옴
);

// 클라이언트 사이드 필터링
const posts = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(post => !post.isShadowBanned) // Shadow Ban 제외
  .slice(0, 20); // limit만큼만 반환
```

## 🔗 통합 지점

### 게시글 생성
- `EquipmentForm.tsx`: 게시글 생성 후 위험 점수 계산

### 리뷰 작성
- `marketReviewService.ts`: 리뷰 작성 시 위험 점수 감소

### 거래 완료
- `CompleteTransactionButton.tsx`: 거래 완료 시 위험 점수 감소

### 노출 억제
- 모든 게시글 조회 훅에서 `isShadowBanned` 필터링

### UI 경고
- `EquipmentDetail.tsx`: 고위험 판매자/게시글 경고 배너

## 🚀 다음 단계

### 1️⃣ Cloud Functions로 마이그레이션
- `onMarketPostCreated` - 게시글 생성 시 위험 점수 계산
- `onMarketPostUpdated` - 게시글 수정 시 위험 점수 재계산
- `onMarketReviewCreated` - 리뷰 작성 시 위험 점수 감소
- `onTransactionComplete` - 거래 완료 시 위험 점수 감소

### 2️⃣ 탐지 룰 강화
- ML 기반 이상 패턴 탐지
- 이미지 중복 탐지 강화
- 텍스트 유사도 분석 개선

### 3️⃣ 관리자 대시보드
- 고위험 계정/게시글 모니터링
- 수동 차단/해제 기능
- 위험 점수 히스토리 추적

## ✅ 검증 체크리스트

- [x] 데이터 필드 타입 정의
- [x] v1 탐지 룰 상수 정의
- [x] riskScore 계산 유틸 구현
- [x] 게시글 생성 시 위험 점수 계산
- [x] 리뷰/거래 완료 시 위험 점수 감소
- [x] Shadow Ban 로직 (쿼리에서 제외)
- [x] UI 경고 배너 표시

---

**사기 의심 패턴 탐지/차단 레이어 v1 구현 완료! 이제 위험 점수가 자동으로 쌓이고, 고위험 글은 기본 노출이 제한됩니다.** 🎉
