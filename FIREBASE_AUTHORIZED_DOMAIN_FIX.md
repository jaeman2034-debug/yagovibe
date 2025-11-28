# 🚨 "Unable to verify that the app domain is authorized" 오류 해결

## ❌ 현재 오류

콘솔에 다음 오류가 보입니다:
```
Unable to verify that the app domain is authorized
The requested action is invalid
```

## ✅ 원인

Firebase Console의 **Authorized domains**에 `localhost`가 없거나, Firebase가 도메인을 인식하지 못하는 상황입니다.

## 🔥 즉시 해결 방법

### Step 1: Firebase Console 접속

1. **Firebase Console 열기**
   - https://console.firebase.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **Authentication > Settings로 이동**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - 상단 탭 > **"Settings"** 클릭

3. **Authorized domains 확인**
   - 아래로 스크롤하여 **"Authorized domains"** 섹션 확인

### Step 2: localhost 추가 (없는 경우)

**Authorized domains** 목록에 다음이 있는지 확인:
- `localhost` ⚠️ **필수!**
- `127.0.0.1` (선택사항)
- `yagovibe.com`
- `www.yagovibe.com`
- `yago-vibe-spt.firebaseapp.com` (자동 추가됨)
- `yago-vibe-spt.web.app` (자동 추가됨)

**`localhost`가 없으면:**
1. **"Add domain"** 버튼 클릭
2. `localhost` 입력
3. **"Add"** 클릭

### Step 3: 저장 및 대기

- 변경사항이 자동으로 저장됨
- **2-3분 대기** (설정 반영 시간)

### Step 4: 브라우저 테스트

1. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - 캐시된 이미지 및 파일 삭제

2. **시크릿 모드에서 테스트**
   - Chrome 시크릿 모드 (Ctrl + Shift + N)
   - http://localhost:5173 접속

3. **Google 로그인 테스트**
   - Google 로그인 버튼 클릭
   - 팝업이 정상적으로 열리는지 확인

## 📋 체크리스트

- [ ] Firebase Console > Authentication > Settings 접속
- [ ] Authorized domains 섹션 확인
- [ ] `localhost` 포함 여부 확인
- [ ] `localhost` 없으면 추가
- [ ] 2-3분 대기
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트

## 💡 참고사항

- `localhost`는 개발 환경에서 **필수**입니다
- `127.0.0.1`도 추가하면 더 안정적입니다
- Authorized domains 변경은 **즉시 반영되지 않을 수 있습니다** (최대 몇 시간)
- 개발 중에는 `localhost`가 없으면 Google 로그인이 **절대 작동하지 않습니다**

## 🚨 여전히 안 되는 경우

1. **Firebase 프로젝트 확인**
   - Firebase Console > Project Settings > General
   - 프로젝트가 활성화되어 있는지 확인

2. **Google Cloud 프로젝트 일치 확인**
   - Firebase Console > Project Settings > General
   - Google Cloud 프로젝트 번호 확인
   - Google Cloud Console 상단 프로젝트와 일치하는지 확인

3. **브라우저 콘솔에서 추가 오류 확인**
   - F12 > Console 탭
   - Network 탭에서 실패한 요청 확인

