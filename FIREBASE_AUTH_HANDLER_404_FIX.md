# 🔧 Firebase Auth Handler 404 오류 해결

## ❌ 현재 문제

### "페이지를 찾을 수 없습니다" 오류
- **URL**: `https://yago-vibe-spt.firebaseapp.com//auth/handler?apiKey=...`
- **문제**: URL에 **이중 슬래시 `//auth/handler`**가 있음
- **올바른 경로**: `/__/auth/handler` (언더스코어 2개)

### 원인 분석
1. Firebase SDK가 `authDomain`을 기반으로 핸들러 URL 생성 시 이중 슬래시 발생
2. Firebase Hosting의 rewrites 설정이 제대로 작동하지 않을 수 있음
3. 배포된 버전이 최신이 아닐 수 있음

---

## ✅ 해결 방법

### 방법 1: firebase.json rewrites 설정 확인 및 재배포

#### Step 1: firebase.json 확인
현재 설정은 정상입니다:
```json
{
  "rewrites": [
    {
      "source": "/__/auth/**",
      "destination": "/index.html"
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

#### Step 2: 재빌드 및 재배포
```bash
npm run build
firebase deploy --only hosting
```

#### Step 3: 배포 확인
- Firebase Console → Hosting → 배포 기록 확인
- 최신 배포가 완료되었는지 확인

---

### 방법 2: authDomain 설정 확인

#### Step 1: firebase.ts 확인
`src/lib/firebase.ts`에서 `authDomain` 설정 확인:
```typescript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com"
```

#### Step 2: .env.local 확인
`.env.local` 파일에 `authDomain`이 올바르게 설정되어 있는지 확인:
```env
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
```

**⚠️ 중요**: 
- `authDomain`은 반드시 `.firebaseapp.com`으로 끝나야 함
- 슬래시(`/`)가 포함되면 안 됨

---

### 방법 3: Firebase Hosting rewrites 우선순위 확인

Firebase Hosting은 rewrites를 위에서부터 순서대로 처리합니다. 현재 설정이 올바른 순서입니다:

1. `/__/auth/**` → `/index.html` (먼저 처리)
2. `**` → `/index.html` (나머지 모든 경로)

---

### 방법 4: Firebase Console에서 커스텀 도메인 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/hosting
   ```

2. **커스텀 도메인 확인**
   - `yagovibe.com`이 기본 사이트(`yago-vibe-spt`)에 연결되어 있는지 확인
   - 연결되어 있지 않다면 "도메인 추가"로 연결

3. **배포 기록 확인**
   - 최신 배포가 완료되었는지 확인
   - 배포 시간이 최근인지 확인

---

## 🔍 디버깅

### 콘솔에서 확인할 사항

1. **Firebase 초기화 로그 확인**:
   ```
   🔍 [firebase.ts] Firebase 설정 확인:
   authDomain: ✅ yago-vibe-spt.firebaseapp.com
   ```

2. **Google 로그인 시도 시 로그 확인**:
   ```
   🔍 [Google Login] signInWithPopup 호출 직전:
   expectedAuthDomain: yago-vibe-spt.firebaseapp.com
   ```

3. **에러 메시지 확인**:
   - `auth/api-key-not-valid`: API 키 문제
   - `404`: 핸들러 경로 문제
   - `페이지를 찾을 수 없습니다`: rewrites 문제

---

## 📋 체크리스트

### 빌드 및 배포
- [ ] `npm run build` 실행
- [ ] 빌드 성공 확인
- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포 성공 확인

### 설정 확인
- [ ] `firebase.json`의 rewrites 설정 확인
- [ ] `.env.local`의 `VITE_FIREBASE_AUTH_DOMAIN` 확인
- [ ] `authDomain`에 슬래시가 없는지 확인

### Firebase Console 확인
- [ ] Firebase Console → Hosting → 배포 기록 확인
- [ ] 커스텀 도메인 연결 확인
- [ ] 최신 배포가 완료되었는지 확인

### 테스트
- [ ] `https://yagovibe.com/login` 접속
- [ ] Google 로그인 버튼 클릭
- [ ] 팝업이 정상적으로 열리는지 확인
- [ ] "페이지를 찾을 수 없습니다" 오류 해결 확인

---

## ✅ 완료

재빌드 및 재배포를 실행하면 Firebase Auth 핸들러 경로 문제가 해결됩니다:

```bash
npm run build
firebase deploy --only hosting
```

배포 후 `https://yagovibe.com/login`에서 Google 로그인을 다시 시도하세요.

