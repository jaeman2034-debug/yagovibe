# 🔍 Firebase "The requested action is invalid." 오류 원인 분석

## 📊 현재 오류 상황

### **오류 메시지:**
```
The requested action is invalid.
```

### **발생 위치:**
- Firebase 인증 핸들러: `yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...`
- Google 로그인 버튼 클릭 시
- 상태: "G 로그인 중..." (진행 중)

---

## 🔍 원인 분석

### **1. Firebase Console 설정 문제 (가장 유력)**

**가능한 원인:**
1. ❌ **Google OAuth 클라이언트 ID 미설정**
   - Firebase Console → Authentication → Sign-in method → Google
   - Web client ID가 설정되지 않았거나 잘못됨

2. ❌ **Identity Toolkit API 미활성화**
   - Google Cloud Console에서 Identity Toolkit API가 활성화되지 않음
   - 이전 분석에서도 확인됨

3. ❌ **API 키 제한 설정 문제**
   - Browser Key의 HTTP 리퍼러 제한이 잘못 설정됨
   - Identity Toolkit API가 API 제한에 포함되지 않음

4. ❌ **Authorized domains 미설정**
   - Firebase Console → Authentication → Settings → Authorized domains
   - `localhost`, `yago-vibe-spt.firebaseapp.com` 등이 추가되지 않음

---

### **2. 코드에서 오류 처리 확인**

**LoginPage.tsx (1400번, 1550번 라인):**
```typescript
if (popupError.code === "auth/invalid-action" || 
    popupError.message?.includes("invalid") || 
    popupError.message?.includes("invalid action") || 
    popupError.code === "auth/invalid-action") {
    // 오류 처리 로직
}
```

**결론:**
- ✅ 코드에서 `auth/invalid-action` 오류를 처리하고 있음
- ❌ 하지만 근본 원인은 Firebase Console 설정 문제

---

## 🛠️ 해결 방법

### **1단계: Firebase Console 설정 확인 (최우선)**

#### **A. Google OAuth 클라이언트 ID 확인**

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Sign-in method**
   - Google 제공업체 클릭
   - **Web client ID** 확인
   - **Web client secret** 확인
   - 둘 다 설정되어 있어야 함

3. **저장 버튼 클릭**
   - 설정이 변경되었다면 반드시 저장

---

#### **B. Authorized domains 확인**

1. **Authentication → Settings → Authorized domains**
   - 다음 도메인이 모두 추가되어 있는지 확인:
     ```
     localhost
     yago-vibe-spt.firebaseapp.com
     yago-vibe-spt.web.app
     yagovibe.com
     www.yagovibe.com
     ```

2. **없으면 추가**
   - "Add domain" 버튼 클릭
   - 도메인 입력 후 저장

---

### **2단계: Google Cloud Console 설정 확인**

#### **A. Identity Toolkit API 활성화**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **API 및 서비스 → 사용 설정된 API**
   - "Identity Toolkit API" 검색
   - **활성화** 상태인지 확인
   - 비활성화되어 있으면 **사용 설정** 클릭

---

#### **B. API 키 제한 설정 확인**

1. **API 및 서비스 → 사용자 인증 정보**
   - Browser Key 선택 (Firebase API Key)

2. **애플리케이션 제한 사항**
   - ✅ **웹사이트** 선택
   - ✅ 웹사이트 리퍼러 등록 (와일드카드 포함):
     ```
     http://localhost:5173/*
     http://127.0.0.1:5173/*
     https://yago-vibe-spt.web.app/*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     ```

3. **API 제한 사항**
   - ✅ **키 제한** 선택
   - ✅ 필수 API 포함:
     - **Identity Toolkit API** (최우선!)
     - Maps JavaScript API
     - Geocoding API
     - Places API

4. **저장**
   - 변경 사항 저장
   - 몇 분 후 적용 확인

---

### **3단계: 환경 변수 확인**

#### **A. .env.local 파일 확인**

```bash
VITE_FIREBASE_API_KEY=AIzaSy... (올바른 형식)
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
```

#### **B. API 키 형식 확인**

- ✅ 올바른 형식: `AIzaSy...` (첫 글자는 **AI**)
- ❌ 잘못된 형식: `AlzaSy...` (오타)

**firebase.ts에서 자동 감지 및 수정 시도:**
```typescript
if (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AlzaSy")) {
    // 자동 수정 시도
    const correctedKey = "AI" + firebaseConfig.apiKey.substring(2);
    firebaseConfig.apiKey = correctedKey;
}
```

---

## 🎯 우선순위별 해결 체크리스트

### **🔴 최우선 (즉시 확인):**

1. [ ] Firebase Console → Authentication → Sign-in method → Google
   - [ ] Web client ID 설정 확인
   - [ ] Web client secret 설정 확인
   - [ ] 저장 버튼 클릭

2. [ ] Firebase Console → Authentication → Settings → Authorized domains
   - [ ] `localhost` 추가 확인
   - [ ] `yago-vibe-spt.firebaseapp.com` 추가 확인
   - [ ] `yago-vibe-spt.web.app` 추가 확인

3. [ ] Google Cloud Console → API 및 서비스 → 사용 설정된 API
   - [ ] Identity Toolkit API 활성화 확인

4. [ ] Google Cloud Console → API 및 서비스 → 사용자 인증 정보
   - [ ] Browser Key 선택
   - [ ] 애플리케이션 제한 사항: 웹사이트 선택
   - [ ] 웹사이트 리퍼러 등록 (6개 도메인)
   - [ ] API 제한 사항: 키 제한 선택
   - [ ] **Identity Toolkit API 포함** (최우선!)
   - [ ] 저장

---

### **🟡 중간 우선순위:**

5. [ ] .env.local 파일 확인
   - [ ] VITE_FIREBASE_API_KEY 형식 확인 (`AIzaSy...`)
   - [ ] VITE_FIREBASE_AUTH_DOMAIN 확인

6. [ ] 브라우저 캐시 삭제
   - [ ] 개발자 도구 → Application → Clear storage
   - [ ] 페이지 새로고침 (Ctrl+Shift+R)

---

## 📝 예상 결과

### **설정 완료 후:**
- ✅ Google 로그인 버튼 클릭 시 정상 작동
- ✅ Firebase 인증 핸들러에서 오류 없음
- ✅ Google 계정 선택 화면 표시
- ✅ 로그인 성공 후 `/sports-hub`로 리디렉션

---

## 🔍 디버깅 팁

### **브라우저 콘솔에서 확인:**

```javascript
// Firebase 설정 확인
getFirebaseConfig()

// Firebase Auth 객체 확인
getFirebaseAuth()

// API Key 확인
getFirebaseApiKey()
```

### **Firebase Console에서 확인:**

1. **Authentication → Users**
   - 로그인 시도 기록 확인

2. **Authentication → Sign-in method → Google**
   - 설정 상태 확인
   - 오류 로그 확인

---

## ✅ 최종 결론

**오류 원인:**
1. ❌ **Identity Toolkit API 미활성화** (가장 유력)
2. ❌ **Google OAuth 클라이언트 ID 미설정**
3. ❌ **API 키 제한 설정 문제**
4. ❌ **Authorized domains 미설정**

**해결 방법:**
1. ✅ Firebase Console에서 Google OAuth 설정 확인
2. ✅ Google Cloud Console에서 Identity Toolkit API 활성화
3. ✅ API 키 제한 설정에 Identity Toolkit API 포함
4. ✅ Authorized domains 추가

**우선순위:**
1. 🔴 **Identity Toolkit API 활성화** (최우선)
2. 🔴 **Google OAuth 클라이언트 ID 설정** (최우선)
3. 🟡 **API 키 제한 설정** (중간)
4. 🟡 **Authorized domains 추가** (중간)

---

## 📋 다음 단계

1. **Firebase Console 접속**
   - Google OAuth 설정 확인
   - Authorized domains 확인

2. **Google Cloud Console 접속**
   - Identity Toolkit API 활성화
   - API 키 제한 설정 확인

3. **테스트**
   - Google 로그인 버튼 클릭
   - 오류 해결 확인

