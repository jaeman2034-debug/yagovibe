# 🚨 새로운 오류 분석 및 해결 방법

## 📊 발견된 새로운 오류

### **오류 메시지:**
```
auth/requests-from-referer-http://127.0.0.1:5173-are-blocked.
```

### **오류 상세:**
- **현재 도메인**: `127.0.0.1:5173`
- **사용 중인 API 키**: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- **문제**: `http://127.0.0.1:5173/*` 리퍼러가 Google Cloud Console에 등록되지 않음

---

## 🔍 문제 분석

### **문제 1: `127.0.0.1` 리퍼러 누락**

**현재 상황:**
- 사용자가 `127.0.0.1:5173`으로 접속
- Google Cloud Console에 `http://127.0.0.1:5173/*` 리퍼러가 등록되지 않음
- 따라서 요청이 차단됨

**해결:**
- Google Cloud Console에 `http://127.0.0.1:5173/*` 리퍼러 추가

---

### **문제 2: API 키 오타 (치명적)**

**현재 API 키:**
- `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (오타: `AlzaSy`)

**올바른 형식:**
- `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (첫 글자는 `AI`)

**원인:**
- `.env.local` 파일에 API 키가 잘못 입력됨
- 또는 환경 변수가 잘못 로드됨

**영향:**
- API 키 오타로 인해 Google API 호출이 실패할 수 있음
- `firebase.ts`에서 자동 수정을 시도하지만, 근본 원인은 `.env.local` 파일 수정 필요

---

## 🛠️ 해결 방법

### **1단계: Google Cloud Console에 `127.0.0.1` 리퍼러 추가**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   - Browser Key 선택

2. **웹사이트 제한사항에 추가**
   - "+ Add" 버튼 클릭
   - `http://127.0.0.1:5173/*` 추가
   - 저장 버튼 클릭

3. **5-10분 대기** (설정 적용 시간)

---

### **2단계: API 키 오타 수정 (최우선)**

#### **A. `.env.local` 파일 확인 및 수정**

1. **`.env.local` 파일 열기**
2. **`VITE_FIREBASE_API_KEY` 확인**
3. **오타 수정:**
   - ❌ 잘못된 형식: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
   - ✅ 올바른 형식: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (첫 글자는 `AI`)

4. **저장**

#### **B. Google Cloud Console에서 올바른 API 키 확인**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   - Browser Key 목록 확인

2. **올바른 API 키 찾기**
   - `AIzaSy...`로 시작하는 키 찾기
   - `AlzaSy...`로 시작하는 키는 잘못된 키

3. **올바른 API 키를 `.env.local`에 설정**

---

### **3단계: 브라우저 캐시 삭제 및 재시작**

1. **브라우저 캐시 삭제**
   - `Ctrl+Shift+R` (강제 새로고침)
   - 또는 개발자 도구 → Application → Clear storage

2. **개발 서버 재시작**
   - 현재 실행 중인 서버 종료
   - `npm run dev` 재실행

3. **재테스트**
   - `http://127.0.0.1:5173/login` 접속
   - Google 로그인 버튼 클릭
   - 오류 해결 확인

---

## 📋 최종 리퍼러 목록 (추가 후)

다음 리퍼러가 **모두** 등록되어 있어야 합니다:

```
http://localhost:5173/*
http://127.0.0.1:5173/*                    ← 추가 필요!
https://www.yagovibe.com/*
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.firebaseapp.com/
https://yago-vibe-spt.firebaseapp.com/*
https://yago-vibe-spt.web.app/*
https://yagovibe.com/*
```

---

## 🎯 우선순위

### **최우선:**
1. ✅ **API 키 오타 수정** (`.env.local` 파일)
   - `AlzaSy` → `AIzaSy` (첫 글자는 `AI`)

### **중간 우선순위:**
2. ✅ **`http://127.0.0.1:5173/*` 리퍼러 추가**
   - Google Cloud Console에 추가

### **저장 및 대기:**
3. ✅ **저장 후 5-10분 대기**
4. ✅ **브라우저 캐시 삭제**
5. ✅ **개발 서버 재시작**
6. ✅ **재테스트**

---

## ✅ 해결 확인 방법

### **오류가 해결되었는지 확인:**

1. **콘솔에서 다음 오류가 없어야 함:**
   - ❌ `auth/requests-from-referer-http://127.0.0.1:5173-are-blocked.`
   - ❌ `403 PERMISSION_DENIED`
   - ❌ `API_KEY_HTTP_REFERRER_BLOCKED`

2. **API 키 확인:**
   - 브라우저 콘솔에서 `getFirebaseApiKey()` 실행
   - `AIzaSy...`로 시작하는지 확인 (올바른 형식)

3. **Google 로그인 버튼 클릭 시:**
   - ✅ 오류 없음
   - ✅ Google 계정 선택 화면 표시
   - ✅ 또는 정상적인 리디렉션

---

## 🚨 현재 상태

### **문제:**
- ❌ `http://127.0.0.1:5173/*` 리퍼러 누락
- ❌ API 키 오타: `AlzaSy` → `AIzaSy` (치명적)

### **해결:**
- [ ] `.env.local` 파일에서 API 키 오타 수정 (`AlzaSy` → `AIzaSy`)
- [ ] Google Cloud Console에 `http://127.0.0.1:5173/*` 리퍼러 추가
- [ ] 저장 후 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] 개발 서버 재시작
- [ ] 재테스트

---

## 💡 중요 참고사항

### **API 키 오타:**
- `AlzaSy` → `AIzaSy` (첫 글자는 **AI**)
- 이것은 치명적인 오류입니다
- Google API 호출이 실패할 수 있습니다
- `.env.local` 파일에서 즉시 수정해야 합니다

### **리퍼러 패턴:**
- `localhost`와 `127.0.0.1`은 다르게 인식됩니다
- 둘 다 등록하는 것이 안전합니다

---

## 🎯 결론

**두 가지 문제가 있습니다:**

1. **API 키 오타** (치명적) - `.env.local` 파일 수정 필요
2. **`127.0.0.1` 리퍼러 누락** - Google Cloud Console에 추가 필요

**즉시 해결해야 합니다!**

