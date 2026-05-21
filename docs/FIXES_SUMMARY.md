# 🔥 핵심 문제 4개 해결 가이드

**생성일**: 2025-01-27  
**목적**: 거래 상품 안 뜨는 문제, 팀 생성 실패, Service Worker 충돌, FAB 흐름 문제 해결

---

## ✅ 1. Firestore 인덱스 생성 (30초)

### 문제
- ActivityFeed 쿼리가 인덱스 없어서 결과 반환 안 함
- 콘솔: `FirestoreError: The query requires an index`

### 해결 방법

1. **콘솔에서 인덱스 에러 확인**
   - 브라우저 콘솔에서 인덱스 생성 링크 확인
   - 또는 Firebase Console 직접 접속

2. **인덱스 생성**
   - Firebase Console → Firestore → Indexes 탭
   - "Create Index" 버튼 클릭
   - 또는 콘솔에 나온 링크 클릭

3. **대기**
   - 인덱스 생성 완료까지 30초~3분 대기
   - 상태가 "Enabled"가 되면 완료

4. **새로고침**
   - 페이지 새로고침 후 ActivityFeed 확인

### 필요한 인덱스

```
Collection: activityLogs
Fields:
  - authorId (ASCENDING)
  - sport (ASCENDING) [선택사항]
  - type (ASCENDING) [선택사항]
  - createdAt (DESCENDING)
```

---

## ✅ 2. createTeam 함수 배포 (필수)

### 문제
- Firebase Console에 `createTeam` 함수가 없음
- 호출 시 `FirebaseError: internal` 발생

### 해결 방법

#### 1단계: 함수 코드 확인

`functions/src/index.ts`에 다음이 있어야 함:

```typescript
export { createTeam } from "./createTeam";
```

`functions/src/createTeam.ts`에 다음이 있어야 함:

```typescript
export const createTeam = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (request): Promise<CreateTeamResponse> => {
    // ...
  }
);
```

#### 2단계: 함수 배포

```bash
# functions 폴더로 이동
cd functions

# 배포
firebase deploy --only functions:createTeam

# 또는 모든 함수 배포
firebase deploy --only functions
```

#### 3단계: 배포 확인

1. Firebase Console → Functions 탭
2. `createTeam` 함수가 "Active" 상태인지 확인
3. Region이 `asia-northeast3`인지 확인

#### 4단계: 테스트

- 팀 생성 버튼 클릭
- 콘솔에서 성공 로그 확인

---

## ✅ 3. Service Worker 충돌 해결

### 문제
- Service Worker가 Cloud Functions 요청을 차단
- 콘솔: `Only the active worker can claim clients`

### 해결 방법

#### 방법 1: Chrome DevTools에서 제거 (권장)

1. Chrome DevTools 열기 (F12)
2. **Application** 탭 클릭
3. 왼쪽 메뉴에서 **Service Workers** 선택
4. `firebase-messaging-sw.js` 찾기
5. **Unregister** 클릭
6. 페이지 새로고침 (Ctrl+Shift+R)

#### 방법 2: 콘솔에서 제거

브라우저 콘솔에 다음 입력:

```javascript
navigator.serviceWorker.getRegistrations().then(r => 
  r.forEach(x => x.unregister())
).then(() => {
  console.log("✅ Service Worker 제거 완료");
  location.reload();
});
```

#### 방법 3: 코드 수정 (이미 완료)

`public/firebase-messaging-sw.js`에서 Cloud Functions 요청을 우회하도록 수정 완료:

```javascript
self.addEventListener("fetch", (event) => {
    // Cloud Functions 요청은 Service Worker를 우회
    if (event.request.url.includes("cloudfunctions.net") || 
        event.request.url.includes(".run.app")) {
        return;
    }
    
    // POST 요청도 우회
    if (event.request.method !== "GET") {
        return;
    }
    
    // GET 요청만 처리
    event.respondWith(fetch(event.request));
});
```

---

## ✅ 4. FAB 구조 통일 (이미 완료)

### 문제
- FAB가 페이지마다 다른 경로로 이동
- UX 혼란 발생

### 해결 방법 (이미 완료)

#### 현재 구조

```
모든 FAB 클릭 → /create (CreateHubPage)
  ├─ 일정 만들기 → /activity/schedule/create
  ├─ 팀 만들기 → /team/create
  └─ 거래 글쓰기 → /trade/create
```

#### 확인 사항

- ✅ `FloatingWriteButton.tsx`: 모든 FAB가 `/create`로 이동
- ✅ `CreateHubPage.tsx`: 작성 타입 선택 페이지 존재
- ✅ `App.tsx`: `/create` 라우트 추가됨

---

## 🎯 해결 순서 (권장)

1. **Service Worker 제거** (1분)
   - Chrome DevTools → Application → Service Workers → Unregister

2. **Firestore 인덱스 생성** (30초)
   - 콘솔 링크 클릭 또는 Firebase Console에서 생성

3. **createTeam 함수 배포** (2분)
   - `firebase deploy --only functions:createTeam`

4. **테스트** (1분)
   - 팀 생성 버튼 클릭
   - ActivityFeed 새로고침

---

## 📋 체크리스트

- [ ] Service Worker Unregister 완료
- [ ] Firestore 인덱스 생성 완료 (상태: Enabled)
- [ ] createTeam 함수 배포 완료 (상태: Active)
- [ ] 팀 생성 테스트 성공
- [ ] ActivityFeed에 거래 상품 표시 확인

---

## 🔗 유용한 링크

- **Firebase Console**: https://console.firebase.google.com/project/yago-vibe-spt
- **Firestore Indexes**: https://console.firebase.google.com/project/yago-vibe-spt/firestore/indexes
- **Functions**: https://console.firebase.google.com/project/yago-vibe-spt/functions

---

**모든 문제 해결 후 정상 작동합니다!** 🎉
