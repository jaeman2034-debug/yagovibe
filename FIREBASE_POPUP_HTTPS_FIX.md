# 🔥 Firebase 팝업 차단 및 HTTPS 문제 해결

## 🚨 발견된 문제

이미지에서 확인한 내용:
1. ✅ 팝업 설정: "팝업 및 리디렉션"이 "허용됨"으로 설정됨
2. ❌ 주소창에 팝업 차단 아이콘(빨간색 X) 표시됨
3. ⚠️ "이 사이트에 대한 연결이 안전하지 않습니다" 경고 표시됨

**문제**: HTTP로 접속하고 있어서 Firebase OAuth 팝업이 차단될 수 있습니다.

## 🔍 원인 분석

### 1순위: HTTP 연결 문제 (가장 가능성 높음)

**원인**: 
- `localhost:5173`이 HTTP로 접속되고 있음
- Firebase OAuth는 보안 연결(HTTPS)을 선호함
- 일부 브라우저는 HTTP에서 OAuth 팝업을 차단할 수 있음

**해결 방법**:
1. **HTTPS로 개발 서버 실행**
   - Vite에서 HTTPS 설정 확인
   - 또는 Firebase OAuth가 HTTP localhost를 허용하도록 설정

### 2순위: 브라우저 팝업 차단 설정 충돌

**원인**:
- 사이트 설정에서는 허용되어 있지만
- 브라우저의 전역 팝업 차단 설정이 우선 적용될 수 있음

**해결 방법**:
1. **브라우저 전역 설정 확인**
   - Chrome: 설정 > 개인정보 및 보안 > 사이트 설정 > 팝업 및 리디렉션
   - "사이트에서 팝업 및 리디렉션 보내기 허용" 확인

### 3순위: Firebase OAuth 리디렉션 URI 설정

**원인**:
- Google Cloud Console에서 `http://localhost:5173`이 승인된 리디렉션 URI에 추가되지 않음

**해결 방법**:
1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **OAuth 동의 화면 설정**
   - **API 및 서비스** > **OAuth 동의 화면**
   - **승인된 리디렉션 URI** 섹션 확인
   - 다음 URI가 추가되어 있는지 확인:
     ```
     http://localhost:5173/__/auth/handler
     http://localhost:5173
     ```
   - 없으면 추가

## ✅ 즉시 해결 방법

### 방법 1: 브라우저 팝업 차단 완전 해제

1. **Chrome 설정 열기**
   - 주소창에 `chrome://settings/content/popups` 입력
   - 또는 설정 > 개인정보 및 보안 > 사이트 설정 > 팝업 및 리디렉션

2. **팝업 허용 설정**
   - "사이트에서 팝업 및 리디렉션 보내기 허용" 토글 활성화
   - 또는 "허용" 목록에 `localhost:5173` 추가

3. **브라우저 재시작**
   - 설정 변경 후 브라우저 완전히 종료 후 재시작

### 방법 2: HTTPS로 개발 서버 실행

1. **vite.config.ts 확인**
   - HTTPS 설정이 있는지 확인
   - 없으면 추가

2. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

3. **HTTPS로 접속**
   - `https://localhost:5173`으로 접속
   - 인증서 경고가 나오면 "고급" > "계속 진행" 클릭

### 방법 3: Google Cloud Console에서 리디렉션 URI 추가

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **OAuth 동의 화면 설정**
   - **API 및 서비스** > **OAuth 동의 화면**
   - **승인된 리디렉션 URI** 섹션
   - **URI 추가** 클릭
   - 다음 추가:
     ```
     http://localhost:5173/__/auth/handler
     ```

3. **저장** 클릭

## 🔍 추가 확인 사항

### 브라우저 콘솔에서 확인:

```javascript
// 팝업 차단 여부 확인
const testPopup = window.open('about:blank', 'test', 'width=100,height=100');
if (!testPopup || testPopup.closed) {
  console.error('❌ 팝업이 차단되었습니다!');
} else {
  console.log('✅ 팝업이 허용되었습니다.');
  testPopup.close();
}
```

### Firebase 설정 확인:

```javascript
// Firebase 설정 확인
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
console.log('Firebase Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
```

## 📝 체크리스트

- [ ] 브라우저 전역 팝업 차단 설정 확인
- [ ] Chrome 설정에서 팝업 허용 확인
- [ ] Google Cloud Console에서 리디렉션 URI 추가 확인
- [ ] 브라우저 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 하드 리프레시 (Ctrl + Shift + R)
- [ ] 다시 로그인 시도

## ⚠️ 참고

사이트 설정에서 팝업이 허용되어 있어도, 브라우저의 전역 설정이나 보안 정책에 의해 차단될 수 있습니다. 

**가장 확실한 해결 방법**: 브라우저 전역 설정에서 팝업을 허용하거나, HTTPS로 개발 서버를 실행하는 것입니다.

