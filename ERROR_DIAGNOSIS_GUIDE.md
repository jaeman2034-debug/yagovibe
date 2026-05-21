# 🔍 오류 진단 가이드

## 📊 현재 상황

### **사용자 보고:**
- 배포 후에도 같은 오류 발생
- 오류 메시지가 하나 더 늘어남

---

## 🔍 확인 필요 사항

### **1. 브라우저 콘솔 오류 확인**

브라우저 콘솔(F12)에서 다음을 확인해주세요:

1. **콘솔 탭 (Console)**
   - 빨간색 오류 메시지 확인
   - 경고(노란색) 메시지 확인
   - 어떤 오류가 나타나는지 정확한 메시지 복사

2. **네트워크 탭 (Network)**
   - 실패한 요청 확인 (빨간색)
   - 상태 코드 확인 (404, 500 등)
   - 어떤 API 호출이 실패하는지 확인

3. **애플리케이션 탭 (Application)**
   - Local Storage 확인
   - Session Storage 확인
   - Cookies 확인

---

## 🛠️ 가능한 오류 유형

### **1. JavaScript 오류**
- `TypeError: ...`
- `ReferenceError: ...`
- `SyntaxError: ...`

### **2. Firebase 인증 오류**
- `auth/invalid-credential`
- `auth/requests-from-referer-are-blocked`
- `auth/popup-blocked`

### **3. 네트워크 오류**
- `Failed to fetch`
- `CORS error`
- `404 Not Found`

### **4. React 오류**
- `React Hook ...`
- `Cannot read property ...`
- `Maximum update depth exceeded`

---

## 📝 오류 메시지 수집 방법

### **브라우저 콘솔에서:**

1. **F12 키 누르기**
2. **Console 탭 선택**
3. **오류 메시지 복사** (우클릭 → Copy)

### **또는 스크린샷:**
- 콘솔 오류 화면 스크린샷
- 네트워크 탭 오류 화면 스크린샷

---

## 🎯 다음 단계

오류 메시지를 확인한 후:
1. 오류 메시지 내용 분석
2. 원인 파악
3. 해결 방안 적용

---

## 💡 임시 해결책

오류 메시지를 확인하는 동안:

1. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - 캐시된 이미지 및 파일 삭제

2. **시크릿 모드에서 테스트**
   - Ctrl + Shift + N (Chrome)
   - 캐시 없이 테스트

3. **다른 브라우저에서 테스트**
   - Chrome, Firefox, Edge 등

---

## 📋 체크리스트

오류 진단을 위해 다음 정보를 제공해주세요:

- [ ] 브라우저 콘솔 오류 메시지 (전체 텍스트)
- [ ] 네트워크 탭 실패한 요청
- [ ] 발생 시점 (로그인 시도 시? 페이지 로드 시?)
- [ ] 브라우저 종류 및 버전
- [ ] 모바일/데스크톱 여부

