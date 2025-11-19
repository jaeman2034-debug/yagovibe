# ⚡ 빠른 디버깅 가이드

## 🎯 현재 상황

Edge의 `edge://inspect/#devices` 페이지가 열려 있습니다.

**다음 단계:**

### 1. Android 앱 실행

Android Studio에서:
- Build → Make Project
- Run ▶ 버튼 클릭
- 앱이 기기/에뮬레이터에서 실행됨

### 2. Edge에서 기기 확인

**Remote Target 목록에서:**
- `com.yagovibe.app` 또는 `YAGO VIBE` 찾기
- 또는 현재 보이는 "KSTB6188" 기기 확인

### 3. "inspect" 클릭

- 기기 옆에 "inspect" 버튼 클릭
- DevTools 창이 열림

### 4. 디버깅 시작

**콘솔 탭:**
- JavaScript 오류 확인
- `console.log` 메시지 확인

**Network 탭:**
- API 호출 확인
- Firebase 요청 확인

**Application 탭:**
- LocalStorage 확인
- Service Worker 확인

---

## 🔍 주요 확인 사항

### 앱 실행 확인
- ✅ 앱이 실행되는가?
- ✅ 화면이 정상적으로 로드되는가?

### 오류 확인
- ❌ 콘솔에 오류가 있는가?
- ❌ Network 요청이 실패하는가?

### Firebase 확인
- ✅ Firebase 초기화 성공?
- ✅ Auth 작동하는가?
- ✅ Firestore 연결되는가?

---

## 📱 실행 방법 (간단 요약)

1. **Android Studio 열기**
   ```bash
   npx cap open android
   ```

2. **Gradle Sync**
   - 노란 바 뜨면 "Sync Now" 클릭

3. **Build**
   - Build → Make Project

4. **Run**
   - Run ▶ 버튼 클릭
   - 기기 선택

5. **디버깅**
   - Edge에서 `edge://inspect` 접속
   - 기기 찾기
   - "inspect" 클릭

---

**앱을 실행하고 Edge DevTools에서 디버깅하세요!**

