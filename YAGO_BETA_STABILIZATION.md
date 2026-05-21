# 🚀 YAGO VIBE – 베타 테스트 전 서비스 안정화 작업 지시문

## 📋 현재 서비스 상태

✅ **완료된 작업**:
- Vite build 완료
- Firebase Hosting 배포 완료
- Firebase Authentication 정상
- Authorized Domains 설정 완료
- Google OAuth 로그인 동작 가능 (모바일/PC 분기 처리)
- console.log 정리 완료 (devLog/devWarn/devError 적용)
- ProductDetail 컴포넌트 분리 완료
- Firestore Index 추가 완료 (activities 컬렉션)
- 쿼리 최적화 완료 (limit 적용)

---

## 1️⃣ Firestore Security Rules 강화

### 현재 상태 확인
`firestore.rules` 파일을 확인한 결과, 대부분의 컬렉션에 대한 Rules가 설정되어 있습니다.

### 추가 필요 사항

#### 1-1. marketPosts 컬렉션 Rules 추가

**파일**: `firestore.rules`

다음 Rules를 추가합니다:

```javascript
// ======================
// MARKET POSTS (거래 글)
// ======================

match /marketPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();

  // 생성: 인증된 사용자만
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.authorId is string &&
    request.resource.data.sport is string &&
    request.resource.data.status in ["active", "reserved", "done"];

  // 수정: 작성자만
  allow update: if isAuthor(resource.data.authorId) &&
    // authorId 변경 방지
    request.resource.data.authorId == resource.data.authorId &&
    // status만 변경 가능 (다른 필드 변경 제한 가능)
    request.resource.data.sport == resource.data.sport;

  // 삭제: 작성자만
  allow delete: if isAuthor(resource.data.authorId);
}
```

#### 1-2. recruitPosts 컬렉션 Rules 추가

```javascript
// ======================
// RECRUIT POSTS (모집 글)
// ======================

match /recruitPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();

  // 생성: 인증된 사용자만 (팀 소속은 앱에서 체크)
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.authorId is string &&
    request.resource.data.teamId is string &&
    request.resource.data.status == "open";

  // 수정: 작성자만
  allow update: if isAuthor(resource.data.authorId) &&
    request.resource.data.authorId == resource.data.authorId;

  // 삭제: 작성자만
  allow delete: if isAuthor(resource.data.authorId);
}
```

#### 1-3. matchPosts 컬렉션 Rules 추가

```javascript
// ======================
// MATCH POSTS (경기 매칭 글)
// ======================

match /matchPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();

  // 생성: 인증된 사용자만 (팀 소속은 앱에서 체크)
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.authorId is string &&
    request.resource.data.teamId is string &&
    request.resource.data.status == "open";

  // 수정: 작성자만
  allow update: if isAuthor(resource.data.authorId) &&
    request.resource.data.authorId == resource.data.authorId;

  // 삭제: 작성자만
  allow delete: if isAuthor(resource.data.authorId);
}
```

### Rules 배포

```bash
firebase deploy --only firestore:rules
```

---

## 2️⃣ Firebase Storage Rules 확인

### 현재 상태
`storage.rules` 파일을 확인한 결과, 적절한 규칙이 설정되어 있습니다.

### 추가 권장 사항 (선택사항)

파일 크기 제한 추가:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 🔥 팀 프로필 이미지 업로드
    match /teams/{teamId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024; // 5MB 제한
    }
    
    // 🔥 채팅 이미지 업로드
    match /chat/{roomId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 10 * 1024 * 1024; // 10MB 제한
    }
    
    // 🔥 사용자 프로필 이미지
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 2 * 1024 * 1024; // 2MB 제한
    }
    
    // 🔥 마켓 상품 이미지
    match /market/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024; // 5MB 제한
    }
    
    // 🔥 활동 이미지
    match /activities/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024; // 5MB 제한
    }
  }
}
```

### Storage Rules 배포

```bash
firebase deploy --only storage
```

---

## 3️⃣ Firestore Query 비용 보호

### 현재 상태
대부분의 쿼리에서 `limit()`을 사용하고 있습니다.

### 추가 확인 필요 사항

#### 3-1. ActivityFeed.tsx 확인

**파일**: `src/features/activity/ActivityFeed.tsx`

현재 `limit(30)` 사용 중 → 적절함 ✅

추가 확인:
- 무한 스크롤 시 `startAfter()` 사용 여부 확인
- 클라이언트 필터링 전 데이터 양 확인

#### 3-2. 모든 리스트 조회 쿼리 점검

다음 패턴을 사용하는지 확인:

```typescript
// ✅ 올바른 패턴
query(
  collection(db, "activities"),
  where("sport", "==", sport),
  orderBy("createdAt", "desc"),
  limit(20)
)

// ❌ 잘못된 패턴 (제거 필요)
query(
  collection(db, "activities"),
  where("sport", "==", sport),
  orderBy("createdAt", "desc")
  // limit 없음 - 전체 데이터 조회
)
```

### 쿼리 최적화 체크리스트

- [ ] 모든 `getDocs()` 호출에 `limit()` 적용 확인
- [ ] 모든 `onSnapshot()` 호출에 `limit()` 적용 확인
- [ ] 무한 스크롤 구현 시 `startAfter()` 사용 확인
- [ ] 클라이언트 필터링 전 데이터 양이 적절한지 확인 (권장: 20-30개)

---

## 4️⃣ Firestore Index 확인

### 현재 상태
✅ `firestore.indexes.json`에 `activities` 컬렉션 인덱스 추가 완료

### 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

### 인덱스 생성 확인

1. Firebase Console → Firestore Database → Indexes 접속
2. 다음 인덱스가 생성 중/완료 상태인지 확인:
   - `activities` - `sport` ASC + `createdAt` DESC
   - `activities` - `visibility` ASC + `createdAt` DESC
   - `activities` - `sport` ASC + `visibility` ASC + `createdAt` DESC
   - `activities` - `refType` ASC + `createdAt` DESC

**주의**: 인덱스 생성은 몇 분에서 몇 시간이 걸릴 수 있습니다.

---

## 5️⃣ ProductDetail 컴포넌트 분리 확인

### 현재 상태
✅ 이미 분리 완료:
- `src/components/market/ProductGallery.tsx`
- `src/components/market/ProductActions.tsx`
- `src/components/market/ProductComments.tsx`

### 추가 확인 사항

**파일**: `src/pages/market/ProductDetail.tsx`

- [ ] 파일 크기가 800줄 이하인지 확인
- [ ] 분리된 컴포넌트가 올바르게 import되어 있는지 확인
- [ ] 모든 기능이 정상 작동하는지 확인

---

## 6️⃣ Google 로그인 안정성 유지

### 현재 상태
✅ 모바일/PC 환경 분기 처리 완료

**파일**:
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`
- `src/utils/authHelpers.ts`

### 동작 확인

- [ ] PC 환경에서 `signInWithPopup()` 정상 작동
- [ ] 모바일 환경에서 `signInWithRedirect()` 정상 작동
- [ ] In-App Browser에서 `signInWithRedirect()` 정상 작동
- [ ] `getRedirectResult()` 정상 처리

---

## 7️⃣ Production 로그 최소화 확인

### 현재 상태
✅ `src/lib/firebase.ts`에서 `devLog`, `devWarn`, `devError` 적용 완료

### 추가 확인 필요 파일

다음 파일들도 확인하여 `console.log`를 `devLog`로 교체:

- [ ] `src/features/activity/ActivityFeed.tsx`
- [ ] `src/pages/market/MarketPage.tsx`
- [ ] `src/pages/home/HomeHub.tsx`
- [ ] 기타 주요 컴포넌트

### 로그 정리 원칙

```typescript
// ✅ 개발 환경에서만 로그 출력
import { devLog, devWarn, devError } from "@/lib/utils/dev";

devLog("디버깅 정보");
devWarn("경고 메시지");
devError("에러 메시지");

// ❌ 프로덕션에서도 출력되는 로그
console.log("디버깅 정보");
```

---

## 8️⃣ Activity 시스템 구조 유지

### 현재 구조 확인

**refType** (컬렉션 타입):
- `market` - 거래 관련
- `teams` - 팀 관련
- `events` - 이벤트 관련
- `recruit` - 모집 관련 (선택사항: `teams`로 통일 가능)
- `match` - 경기 매칭 관련 (선택사항: `teams`로 통일 가능)

**type** (활동 타입):
- `team_created` - 팀 생성
- `team_notice` - 팀 공지
- `team_event` - 팀 이벤트
- `market_created` - 거래 글 생성
- `equipment_created` - 장비 거래 생성
- `recruit_created` - 모집 생성
- `match_created` - 경기 매칭 생성

### ActivityFactory 확인

**파일**: `src/services/activity/activityFactory.ts`

다음 함수들이 올바른 `refType`을 사용하는지 확인:

```typescript
// ✅ 올바른 refType 매핑
export async function createTeamRecruitActivity(...) {
  return createActivity(data.type, { ...data, refType: "teams" });
}

export async function createMatchActivity(...) {
  return createActivity(data.type, { ...data, refType: "match" });
}

export async function createMarketActivity(...) {
  return createActivity(data.type, { ...data, refType: "market" });
}
```

---

## 9️⃣ 베타 테스트 시나리오

### 필수 테스트 항목

#### 9-1. Google 로그인
- [ ] PC 환경 (Chrome)에서 Google 로그인
- [ ] 모바일 환경 (Safari/Chrome)에서 Google 로그인
- [ ] In-App Browser (카카오톡)에서 Google 로그인
- [ ] 로그인 후 온보딩 페이지 이동 확인
- [ ] 로그인 상태 유지 확인 (새로고침 후)

#### 9-2. 팀 생성
- [ ] 팀 생성 성공
- [ ] 팀 정보 수정
- [ ] 팀 멤버 초대
- [ ] 팀 삭제

#### 9-3. 팀 모집 등록
- [ ] 모집 글 작성
- [ ] 모집 글 수정
- [ ] 모집 글 삭제
- [ ] 모집 지원 기능

#### 9-4. 거래 글 작성
- [ ] 거래 글 작성 (장비)
- [ ] 이미지 업로드 (최대 5장)
- [ ] 거래 글 수정
- [ ] 거래 글 삭제
- [ ] 거래 상태 변경 (예약중, 거래완료)

#### 9-5. ActivityFeed 표시
- [ ] 전체 탭 표시
- [ ] 거래 탭 표시 (equipment_created만)
- [ ] 팀 탭 표시 (team_created, recruit_created)
- [ ] 이벤트 탭 표시 (team_event)
- [ ] 종목별 필터링 (sport 파라미터)
- [ ] 무한 스크롤 작동

#### 9-6. 이미지 업로드
- [ ] 프로필 이미지 업로드 (2MB 이하)
- [ ] 거래 글 이미지 업로드 (5MB 이하)
- [ ] 팀 로고 업로드 (5MB 이하)
- [ ] 이미지 삭제

#### 9-7. 채팅 기능
- [ ] 거래 글에서 채팅 시작
- [ ] 채팅 메시지 전송
- [ ] 이미지 전송
- [ ] 채팅 목록 표시

---

## 🔟 배포 및 최종 확인

### 배포 명령어

```bash
# 1. Firestore Rules 및 Indexes 배포
firebase deploy --only firestore

# 2. Storage Rules 배포
firebase deploy --only storage

# 3. 빌드 및 Hosting 배포
npm run build
firebase deploy --only hosting
```

### 배포 후 확인

1. **배포 URL 접속**: https://yago-vibe-spt.web.app
2. **Google 로그인 테스트**
3. **주요 기능 테스트** (위 9번 항목 참고)
4. **Firebase Console 확인**:
   - Firestore Database → Rules 배포 확인
   - Firestore Database → Indexes 생성 완료 확인
   - Storage → Rules 배포 확인
   - Authentication → Sign-in method 확인

---

## ✅ 완료 체크리스트

### 필수 작업
- [ ] Firestore Rules 추가 (marketPosts, recruitPosts, matchPosts)
- [ ] Storage Rules 파일 크기 제한 추가 (선택사항)
- [ ] Firestore Index 배포 및 생성 확인
- [ ] 모든 쿼리에 limit 적용 확인
- [ ] console.log 정리 (주요 컴포넌트)
- [ ] ActivityFactory refType 확인
- [ ] 베타 테스트 시나리오 실행

### 선택 작업
- [ ] Storage Rules 파일 크기 제한 추가
- [ ] 추가 쿼리 최적화
- [ ] 로그 모니터링 설정 (Sentry 등)

---

## 📝 참고 링크

- Firebase Console: https://console.firebase.google.com/project/yago-vibe-spt
- 배포 URL: https://yago-vibe-spt.web.app
- Firestore Indexes: https://console.firebase.google.com/project/yago-vibe-spt/firestore/indexes
- Firestore Rules: https://console.firebase.google.com/project/yago-vibe-spt/firestore/rules

---

## 🎯 다음 단계 (베타 테스트 후)

베타 테스트 완료 후 다음 작업을 진행할 수 있습니다:

1. **Firestore 데이터 구조 안정화**
   - 데이터 마이그레이션 스크립트
   - 데이터 검증 로직

2. **AI 추천 기능 연결**
   - 사용자 행동 분석
   - 개인화 추천

3. **모바일 UX 최적화**
   - PWA 기능 강화
   - 오프라인 지원

4. **PWA 앱 설치 기능**
   - 설치 프롬프트
   - 앱 아이콘 및 스플래시 화면

---

**작성일**: 2024년
**버전**: 1.0
**상태**: 베타 테스트 전 안정화 작업
