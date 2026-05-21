# 🧪 로컬 환경 테스트 실행 가이드

## ✅ 서버 상태 확인 완료

**서버 상태:**
- ✅ 개발 서버가 `http://localhost:5173`에서 실행 중입니다
- ✅ 포트 5173 LISTENING 상태 확인
- ✅ 연결 ESTABLISHED 상태 확인

---

## 🚀 테스트 시작하기

### **1단계: 브라우저에서 접속**

1. 브라우저를 열고 다음 URL로 접속:
   ```
   http://localhost:5173
   ```

2. 개발자 도구 열기:
   - **Chrome/Edge**: `F12` 또는 `Ctrl+Shift+I`
   - **Firefox**: `F12` 또는 `Ctrl+Shift+K`

3. **콘솔 탭** 선택

---

## 📋 단계별 테스트 가이드

### **테스트 1: 기본 페이지 로드**

**확인 사항:**
- [ ] 시작 페이지가 정상적으로 표시됨
- [ ] 콘솔에 오류가 없음
- [ ] 다음 로그가 표시됨:
  ```
  ✅ [main.tsx] detectInAppBrowser 전역 함수 확인됨
  ✅ [main.tsx] detectInAppBrowser import 확인됨
  ✅ [firebase.ts] Firebase 앱 초기화 성공
  ```

**오류가 없어야 할 항목:**
- ❌ `detectInAppBrowser is not defined`
- ❌ `Failed to fetch dynamically imported module`
- ❌ `RefererNotAllowedMapError`

---

### **테스트 2: 로그인 페이지**

**작업:**
1. URL을 `http://localhost:5173/login`으로 변경
2. 로그인 페이지가 정상적으로 표시되는지 확인

**확인 사항:**
- [ ] 로그인 페이지 정상 표시
- [ ] 이메일 입력 필드 정상 작동
- [ ] 비밀번호 입력 필드 정상 작동
- [ ] "음성 명령 시작" 버튼 정상 표시
- [ ] Google 로그인 버튼 정상 표시
- [ ] 콘솔에 오류 없음

---

### **테스트 3: 음성 인식 기능**

**작업:**
1. `/login` 페이지에서 "음성 명령 시작" 버튼 클릭
2. 마이크 권한 허용
3. 다음 명령들을 순서대로 말하기:
   - "이메일 입력"
   - "jaeman 골뱅이 gmail 점 com"
   - "비밀번호 입력"
   - "비밀번호123"
   - "로그인"

**확인 사항:**
- [ ] 마이크 권한 요청 정상 작동
- [ ] 음성 명령 인식 정상 작동
- [ ] TTS 응답 정상 재생 ("이메일 입력을 시작합니다. 말씀해주세요.")
- [ ] Voice Debug Monitor에 로그 표시
- [ ] 연속 인식 정상 작동 (여러 번 말해도 계속 인식)
- [ ] 이메일 필드에 값이 자동 입력됨

**특히 확인할 사항:**
- ✅ TTS가 실패해도 인식이 계속됨 (500ms 후 재시작)
- ✅ 여러 번 말해도 계속 인식됨
- ✅ Voice Debug Monitor에 모든 로그가 표시됨

---

### **테스트 4: 게스트 로그인**

**작업:**
1. `http://localhost:5173/` 접속
2. "게스트로 둘러보기" 버튼 클릭

**확인 사항:**
- [ ] 게스트 로그인 성공
- [ ] `/sports-hub`로 리디렉션됨
- [ ] 콘솔에 오류 없음

---

### **테스트 5: Google 로그인 버튼**

**작업:**
1. `/login` 페이지 접속
2. "G 로그인" 버튼 클릭 (실제 로그인은 하지 않아도 됨)

**확인 사항:**
- [ ] 버튼 클릭 시 오류 없음
- [ ] 콘솔에 다음 오류가 없음:
  - ❌ `auth/invalid-action`
  - ❌ `RefererNotAllowedMapError`
  - ❌ `InvalidKeyMapError`
  - ❌ `auth/requests-to-this-api-identitytoolkit`

**참고:** Google 로그인 팝업이 열리면 정상입니다. 실제 로그인은 하지 않아도 됩니다.

---

### **테스트 6: 페이지 새로고침**

**작업:**
1. 현재 페이지에서 `Ctrl+Shift+R` (강제 새로고침)
2. 여러 번 새로고침 반복

**확인 사항:**
- [ ] 페이지가 정상적으로 로드됨
- [ ] 콘솔에 `Failed to fetch dynamically imported module` 오류 없음
- [ ] ErrorBoundary 자동 새로고침 로직 정상 작동 (오류 발생 시)

---

## 📝 테스트 결과 기록

### **테스트 완료 후 다음을 기록하세요:**

```
테스트 일시: [날짜] [시간]
브라우저: [Chrome/Firefox/Edge]
OS: [Windows/Mac/Linux]

테스트 결과:
- [ ] 서버 시작: ✅ / ❌
- [ ] 기본 페이지 로드: ✅ / ❌
- [ ] 초기화 안정성: ✅ / ❌
- [ ] 동적 모듈 로딩: ✅ / ❌
- [ ] Google API 접근: ✅ / ❌
- [ ] 음성 인식: ✅ / ❌
- [ ] 게스트 로그인: ✅ / ❌
- [ ] Google 로그인 버튼: ✅ / ❌

발견된 오류:
1. [오류 내용]
2. [오류 내용]
```

---

## 🎯 핵심 테스트 항목

다음 항목은 **반드시** 확인해야 합니다:

1. **✅ 콘솔 오류 없음**
   - `detectInAppBrowser is not defined` 없음
   - `Failed to fetch dynamically imported module` 없음
   - `RefererNotAllowedMapError` 없음

2. **✅ 음성 인식 연속 작동**
   - 여러 번 말해도 계속 인식됨
   - TTS 실패해도 인식이 계속됨

3. **✅ Google 로그인 버튼 정상**
   - 버튼 클릭 시 오류 없음
   - `auth/invalid-action` 오류 없음

---

## 🚀 다음 단계

로컬 환경 테스트가 완료되면:
1. **배포 환경 테스트** 진행
2. **모바일 환경 테스트** 진행
3. **최종 배포**

---

## 💡 문제 발생 시

테스트 중 문제가 발생하면:
1. 브라우저 콘솔의 오류 메시지 확인
2. `TEST_RESULTS.md` 파일에 기록
3. 문제 해결 후 재테스트

**축하합니다! 테스트를 시작하세요! 🎉**

