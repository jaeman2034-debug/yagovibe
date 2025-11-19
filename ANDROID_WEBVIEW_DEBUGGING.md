# 🔍 Android 앱 웹뷰 디버깅 방법

## 📱 Android 앱 실행 후 웹뷰 디버깅

### 방법 1: Chrome/Edge DevTools 사용 (추천)

#### 1단계: Android 앱 실행
- Android Studio에서 앱 실행
- 또는 실제 기기에서 앱 실행

#### 2단계: Chrome/Edge에서 디버깅 페이지 열기

**Chrome:**
```
chrome://inspect/#devices
```

**Edge:**
```
edge://inspect/#devices
```

#### 3단계: USB 디버깅 활성화

**Android 기기에서:**
1. 설정 → 개발자 옵션
2. USB 디버깅 활성화
3. USB로 PC에 연결

**Chrome/Edge에서:**
- ✅ "Discover USB devices" 체크박스 선택
- 기기가 목록에 나타나면 "inspect" 클릭

#### 4단계: 웹뷰 디버깅

**Remote Target 목록에서:**
- `com.yagovibe.app` 또는 `YAGO VIBE` 찾기
- "inspect" 클릭
- DevTools 창이 열림

**디버깅 가능한 항목:**
- ✅ 콘솔 로그 확인
- ✅ 네트워크 요청 확인
- ✅ JavaScript 오류 확인
- ✅ DOM 요소 검사
- ✅ Performance 분석
- ✅ Application 탭 (LocalStorage, IndexedDB 등)

---

### 방법 2: Android Studio Logcat 사용

#### 1단계: Logcat 열기
- Android Studio 하단 **Logcat** 탭 클릭

#### 2단계: 필터 설정
- 필터: `com.yagovibe.app`
- 또는 `YAGO VIBE`
- 또는 `chromium` (웹뷰 로그)

#### 3단계: 로그 확인
- **오류:** 빨간색으로 표시
- **경고:** 노란색으로 표시
- **정보:** 일반 텍스트

**주요 로그 패턴:**
```
E/AndroidRuntime: FATAL EXCEPTION
E/chromium: [ERROR]
W/System: ...
I/chromium: [INFO]
```

---

### 방법 3: 네트워크 타겟 디버깅 (같은 네트워크)

#### 1단계: Android 기기와 PC가 같은 Wi-Fi에 연결

#### 2단계: Chrome/Edge에서
- ✅ "Discover network targets" 체크박스 선택
- 기기가 목록에 나타나면 "inspect" 클릭

**장점:**
- USB 연결 불필요
- 무선으로 디버깅 가능

---

## 🛠️ 디버깅 체크리스트

### 기본 확인
- [ ] Android 앱 실행됨
- [ ] USB 디버깅 활성화 (실제 기기인 경우)
- [ ] Chrome/Edge에서 `chrome://inspect` 또는 `edge://inspect` 접속
- [ ] 기기가 목록에 나타남
- [ ] "inspect" 클릭하여 DevTools 열림

### 디버깅 항목
- [ ] 콘솔에서 JavaScript 오류 확인
- [ ] Network 탭에서 API 호출 확인
- [ ] Application 탭에서 LocalStorage 확인
- [ ] Performance 탭에서 성능 확인

---

## 🔧 문제 해결

### 문제 1: 기기가 목록에 안 나타남

**해결:**
1. USB 디버깅 다시 활성화
2. USB 케이블 다시 연결
3. 기기에서 "USB 디버깅 허용" 팝업 확인
4. Chrome/Edge 재시작

### 문제 2: "inspect" 버튼이 비활성화됨

**해결:**
1. 앱이 실행 중인지 확인
2. 웹뷰가 로드되었는지 확인
3. Chrome/Edge 재시작

### 문제 3: DevTools가 열리지 않음

**해결:**
1. 팝업 차단 해제
2. 다른 브라우저 시도
3. 포트 충돌 확인

---

## 📋 현재 상태 확인

이미지에서 보이는 것:
- ✅ Edge의 inspect 페이지 열림
- ✅ "Discover USB devices" 체크됨
- ✅ "Discover network targets" 체크됨
- ✅ Remote Target: "KSTB6188" #183.113.105.214

**다음 단계:**
1. Android 앱 실행
2. Remote Target 목록에서 `com.yagovibe.app` 찾기
3. "inspect" 클릭
4. DevTools에서 디버깅 시작

---

## 🎯 디버깅 팁

### JavaScript 오류 확인
```javascript
// DevTools 콘솔에서
console.log("앱 실행 확인");
```

### 네트워크 요청 확인
- Network 탭에서 Firebase API 호출 확인
- Cloud Functions 호출 확인
- 이미지 로딩 확인

### 성능 확인
- Performance 탭에서 렌더링 성능 확인
- 메모리 사용량 확인

---

**준비 완료! Android 앱을 실행하고 DevTools에서 디버깅하세요!**

