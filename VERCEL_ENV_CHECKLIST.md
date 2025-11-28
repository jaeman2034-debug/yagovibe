# ✅ Vercel 환경변수 확인 체크리스트

## 🎯 핵심 문제

**로컬에서는 잘 되는데, 배포하면 로그인 안 됨 + `/auth/handler` 404**
→ 항상 Vercel 환경변수가 Firebase 최신 설정과 불일치할 때 발생

## 📋 단계별 확인 및 수정

### ① Firebase Console에서 최신 설정 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택: `yago-vibe-spt`

2. **웹 앱 구성 코드 확인**
   - ⚙️ **Project Settings** (왼쪽 상단) 클릭
   - **General** 탭
   - **Your apps** 섹션에서 웹 앱 선택 (또는 새로 추가)
   - **SDK setup and configuration** 섹션에서 **Config** 선택
   - 다음 값들을 복사:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← 이 값 복사
  authDomain: "yago-vibe-spt.firebaseapp.com",  // ← 이 값 복사
  projectId: "yago-vibe-spt",    // ← 이 값 복사
  storageBucket: "yago-vibe-spt.firebasestorage.app",  // ← 이 값 복사
  messagingSenderId: "123456789012",  // ← 이 값 복사
  appId: "1:123456789012:web:abcdefghijklmnop",  // ← 이 값 복사
  measurementId: "G-XXXXXXXXXX"  // ← 이 값 복사 (선택사항)
};
```

### ② Vercel 환경변수 확인 및 수정

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택: `yago-vibe-spt` (또는 해당 프로젝트)

2. **환경변수 페이지 이동**
   - **Settings** 탭 클릭
   - **Environment Variables** 섹션 클릭

3. **다음 환경변수들이 정확히 Firebase Console의 값과 일치하는지 확인**:

| 환경변수 | Firebase Console 필드 | 확인 사항 |
|---------|---------------------|---------|
| `VITE_FIREBASE_API_KEY` | `apiKey` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_APP_ID` | `appId` | ✅ 일치하는지 확인 |
| `VITE_FIREBASE_MEASUREMENT_ID` | `measurementId` | ✅ 일치하는지 확인 (선택사항) |

4. **각 환경변수 확인 사항**:
   - ✅ 오타 없음
   - ✅ 공백 없음 (앞뒤 공백 제거)
   - ✅ 옛날 값 아님 (최신 Firebase Console 값과 일치)
   - ✅ 따옴표 없음 (값만 입력, 따옴표 제거)

5. **수정이 필요한 경우**:
   - 각 환경변수를 클릭하여 편집
   - Firebase Console의 최신 값으로 수정
   - **저장** 클릭

### ③ Vercel 재배포 (필수!)

⚠️ **중요**: 환경변수만 수정하고 재배포 안 하면 절대 반영 안 됨!

1. **Vercel Dashboard → Deployments 탭**
2. **가장 최근 배포** 클릭
3. **"Redeploy"** 버튼 클릭
4. 또는 **"..." 메뉴 → Redeploy** 클릭
5. **"Use existing Build Cache"** 체크 해제 (권장)
6. **"Redeploy"** 확인
7. **배포 완료 대기** (보통 1-2분)

### ④ .env.production 파일 확인 (Firebase Hosting 배포용)

**로컬 `.env.production` 파일도 Firebase Console의 최신 값과 일치해야 함**

1. **프로젝트 루트에서 `.env.production` 파일 확인**
   ```bash
   # 파일이 없으면 생성
   # 파일이 있으면 내용 확인
   ```

2. **다음 값들이 Firebase Console과 일치하는지 확인**:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy... (Firebase Console의 apiKey와 일치)
   VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com (Firebase Console의 authDomain과 일치)
   VITE_FIREBASE_PROJECT_ID=yago-vibe-spt (Firebase Console의 projectId와 일치)
   VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app (Firebase Console의 storageBucket과 일치)
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012 (Firebase Console의 messagingSenderId와 일치)
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop (Firebase Console의 appId와 일치)
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (Firebase Console의 measurementId와 일치, 선택사항)
   ```

3. **불일치하는 경우 수정**:
   - `.env.production` 파일을 편집
   - Firebase Console의 최신 값으로 수정
   - 저장

### ⑤ 브라우저 캐시 및 Service Worker 삭제

1. **Chrome 완전 종료**
2. **캐시 및 쿠키 삭제**
   - `Ctrl + Shift + Delete`
   - "쿠키 및 기타 사이트 데이터" 체크
   - "캐시된 이미지 및 파일" 체크
   - "지난 4주" 선택
   - "데이터 삭제" 클릭

3. **Service Worker 제거**
   - 주소창에 `chrome://serviceworker-internals` 입력
   - `yagovibe.com`, `yago-vibe-spt.firebaseapp.com` 관련 Service Worker 찾기
   - 각각 "Unregister" 클릭

4. **Chrome 재시작**

### ⑥ 테스트

1. **Vercel 배포 완료 대기** (보통 1-2분)
2. **배포된 사이트 접속**
   - `https://yagovibe.com/login` 또는
   - `https://yagovibe.vercel.app/login`
3. **"G 구글로 로그인" 버튼 클릭**
4. **정상 작동하는지 확인**

## ⚠️ 주의사항

### 환경변수 값 형식

**올바른 형식**:
```
VITE_FIREBASE_API_KEY=AIzaSyCJ0ahD8gJDG1GM3GWoob3tsaVS4D93Wcw
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
```

**잘못된 형식**:
```
VITE_FIREBASE_API_KEY="AIzaSyCJ0ahD8gJDG1GM3GWoob3tsaVS4D93Wcw"  ❌ 따옴표 포함
VITE_FIREBASE_API_KEY= AIzaSyCJ0ahD8gJDG1GM3GWoob3tsaVS4D93Wcw   ❌ 공백 포함
VITE_FIREBASE_AUTH_DOMAIN = yago-vibe-spt.firebaseapp.com        ❌ 공백 포함
```

### 환경변수 적용 시간

- **Vercel 환경변수 수정**: 즉시 반영 (하지만 재배포 필요)
- **Vercel 재배포**: 1-2분 소요
- **브라우저 캐시**: 삭제 후 즉시 반영

## ✅ 최종 체크리스트

### Firebase Console
- [ ] Project Settings → General → Your apps → 웹 앱 선택
- [ ] Config 값 확인 및 복사
- [ ] apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId 확인

### Vercel 환경변수
- [ ] Vercel Dashboard → Settings → Environment Variables 접속
- [ ] `VITE_FIREBASE_API_KEY` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_PROJECT_ID` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_APP_ID` 값 확인 (Firebase Console과 일치)
- [ ] `VITE_FIREBASE_MEASUREMENT_ID` 값 확인 (Firebase Console과 일치, 선택사항)
- [ ] 모든 값에 오타/공백/옛날 값 없음 확인
- [ ] 수정한 경우 저장 완료

### Vercel 재배포
- [ ] Vercel Dashboard → Deployments 탭
- [ ] 가장 최근 배포 클릭
- [ ] "Redeploy" 버튼 클릭
- [ ] "Use existing Build Cache" 체크 해제 (권장)
- [ ] "Redeploy" 확인
- [ ] 배포 완료 대기 (1-2분)

### .env.production 파일
- [ ] 프로젝트 루트에 `.env.production` 파일 존재 확인
- [ ] 모든 Firebase 환경변수 값 확인
- [ ] Firebase Console의 최신 값과 일치하는지 확인
- [ ] 불일치하는 경우 수정 및 저장

### 브라우저 캐시
- [ ] Chrome 완전 종료
- [ ] 캐시 및 쿠키 삭제 완료
- [ ] Service Worker 제거 완료
- [ ] Chrome 재시작 완료

### 테스트
- [ ] Vercel 배포 완료 대기
- [ ] 배포된 사이트 접속
- [ ] "G 구글로 로그인" 버튼 클릭
- [ ] 정상 작동 확인

## 💡 문제 해결 순서 요약

1. **Firebase Console에서 최신 설정 확인** (1분)
2. **Vercel 환경변수 확인 및 수정** (2분)
3. **Vercel 재배포** (1분)
4. **.env.production 파일 확인** (1분)
5. **브라우저 캐시 삭제** (1분)
6. **테스트** (1분)

**총 소요 시간: 약 5-7분**

## ✅ 예상 결과

모든 환경변수가 Firebase Console의 최신 값과 일치하고 재배포가 완료되면:
- ✅ `auth/requests-from-referer-are-blocked` 오류 해결
- ✅ 모든 도메인에서 Google 로그인 정상 작동
- ✅ 팝업 방식 정상 작동
- ✅ `/auth/handler` 404 오류 해결

이제 문제가 완전히 해결됩니다!

