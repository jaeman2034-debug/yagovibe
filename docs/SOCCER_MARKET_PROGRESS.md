# 🔥 축구 마켓 개발 진행 상황

## ✅ 완료된 작업 (오늘)

### 1. 기본 구조
- ✅ `/soccer/market` 전용 페이지 분리
- ✅ Firestore `market` 컬렉션 기반 조회
- ✅ 탭 필터 (전체/중고/모집/매칭) 정상 동작
- ✅ 카테고리별 카드 컴포넌트 분리 (EquipmentCard, RecruitCard, MatchCard)

### 2. 글쓰기
- ✅ 카테고리별 폼 분기 (EquipmentForm, RecruitForm, MatchForm)
- ✅ 검증 로직 및 UX 개선
- ✅ `sport: "soccer"` 자동 주입

### 3. 상세 페이지
- ✅ 카테고리별 상세 컴포넌트 (EquipmentDetail, RecruitDetail, MatchDetail)
- ✅ 상세 페이지 라우팅 (`/soccer/market/post/:id`)

### 4. 참여 기능 기반 구조
- ✅ `marketJoins` 컬렉션 구조 정의
- ✅ `postAuthorId` 필드 추가
- ✅ 참여 서비스 함수 구현 (`joinMarketPost`, `cancelMarketJoin`, `getMarketJoinStatus`)
- ✅ Firestore Rules 배포 완료 (관리자 권한 포함)

### 5. 권한 구조
- ✅ `isGlobalAdmin()` 함수 활용
- ✅ `marketJoins` Rules에 관리자 권한 추가
- ✅ `users/{uid}.role` 필드 기반 관리자 체크

---

## 🚧 다음 단계 (내일)

### 1단계: 참여하기 버튼 동작 최종 확인
- [ ] 클릭 시 `marketJoins` 문서 생성 확인
- [ ] 상태 "참여 대기중" 표시 확인
- [ ] 권한 오류 해결 확인 (`users/{uid}.role = "ADMIN"` 필드 추가 필요)

### 2단계: 작성자 화면
- [ ] 참여자 리스트 표시 (`getMarketJoinList` 함수 활용)
- [ ] 승인 버튼 (status: "pending" → "approved")
- [ ] 거절 버튼 (status: "pending" → "rejected")
- [ ] 승인/거절 시 `currentPeople` 업데이트

### 3단계: 일반 유저
- [ ] 취소하기 버튼 (`cancelMarketJoin` 함수 활용)
- [ ] 상태 실시간 반영 (Firestore 실시간 구독)
- [ ] "참여 대기중" → "참여하기" 상태 전환

---

## 📋 현재 데이터 구조

### Market Post
```typescript
{
  id: string;
  sport: "soccer";
  category: "equipment" | "recruit" | "match";
  title: string;
  description?: string;
  authorId: string;
  // ... 기타 필드
}
```

### Market Join
```typescript
{
  id: string;
  postId: string;
  userId: string;
  postAuthorId: string; // 🔥 게시글 작성자 ID
  category: "recruit" | "match";
  status: "pending" | "approved" | "rejected";
  position?: string;
  message?: string;
  createdAt: Timestamp;
}
```

---

## 🔐 Firestore Rules 구조

### marketJoins 컬렉션
```javascript
match /marketJoins/{joinId} {
  // 읽기: 본인 참여 신청, 게시글 작성자, 또는 플랫폼 관리자
  allow read: if isSignedIn() && (
    resource.data.userId == request.auth.uid ||
    resource.data.postAuthorId == request.auth.uid ||
    isGlobalAdmin()
  );
  
  // 생성: 로그인 사용자만 (본인 참여 신청)
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  
  // 수정: 본인(취소), 게시글 작성자(승인/거절), 또는 플랫폼 관리자
  allow update: if isSignedIn() && (
    resource.data.userId == request.auth.uid ||
    resource.data.postAuthorId == request.auth.uid ||
    isGlobalAdmin()
  );
  
  // 삭제: 본인(취소) 또는 플랫폼 관리자
  allow delete: if isSignedIn() && (
    resource.data.userId == request.auth.uid ||
    isGlobalAdmin()
  );
}
```

---

## 🎯 핵심 파일 위치

### 컴포넌트
- `src/features/market/SoccerMarketPage.tsx` - 메인 페이지
- `src/features/market/components/cards/` - 카드 컴포넌트
- `src/features/market/components/details/` - 상세 컴포넌트
- `src/features/market/components/forms/` - 글쓰기 폼

### 서비스
- `src/features/market/services/marketJoinService.ts` - 참여 로직

### 타입
- `src/features/market/types.ts` - 타입 정의

### Rules
- `firestore.rules` - Firestore 보안 규칙

---

## 💡 참고사항

### 관리자 권한 설정
Firebase Console에서 `users/{uid}` 문서에 `role: "ADMIN"` 필드 추가 필요

### 테스트 체크리스트
1. `/soccer/market` 접속
2. 모집/매칭 탭 필터 확인
3. 상세 페이지 진입
4. 참여하기 버튼 클릭
5. 권한 오류 확인

---

## 🚀 다음 세션 시작 시

1. `users/{uid}.role = "ADMIN"` 필드 추가 확인
2. 참여하기 버튼 테스트
3. 작성자 화면 구현
4. 일반 유저 취소 기능 구현
