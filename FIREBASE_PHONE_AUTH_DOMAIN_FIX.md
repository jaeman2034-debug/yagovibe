# 🔧 Firebase 인증 도메인 오류 해결

## 🚨 현재 오류

배포된 사이트에서 로그인 시도 시:
```
Firebase: Error (auth/requests-from-referer-https://www.yagovibe.com-are-blocked.)
```
또는
```
Firebase: Error (auth/requests-from-referer-https://yago-vibe-spt.web.app-are-blocked.)
```

## ✅ 원인

Firebase Console의 **Authorized domains**에 배포된 도메인이 추가되지 않아서 발생하는 오류입니다.

## 🔥 해결 방법

### Step 1: Firebase Console 접속

1. **Firebase Console 열기**
   - https://console.firebase.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **Authentication > Settings로 이동**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - 상단 탭 > **"Settings"** 클릭

3. **Authorized domains 확인**
   - 아래로 스크롤하여 **"Authorized domains"** 섹션 확인

### Step 2: 배포된 도메인 추가

**Authorized domains** 목록에 다음이 **모두** 포함되어 있는지 확인:

- ✅ `localhost` (개발용)
- ✅ `127.0.0.1` (개발용)
- ✅ `yago-vibe-spt.firebaseapp.com` (자동 추가됨)
- ✅ `yago-vibe-spt.web.app` (자동 추가됨 - 하지만 확인 필요)
- ✅ `yagovibe.com` (실제 도메인 - **반드시 추가 필요**)
- ✅ `www.yagovibe.com` (실제 도메인 - **반드시 추가 필요**)

**누락된 도메인 추가 방법:**

1. **"Add domain"** 버튼 클릭
2. 도메인 입력 (예: `www.yagovibe.com`)
3. **"Add"** 클릭
4. 다음 도메인들도 동일하게 추가:
   - `yagovibe.com` (www 없이)
   - `yago-vibe-spt.web.app` (없는 경우)

### Step 3: 저장 및 대기

- 변경사항이 자동으로 저장됨
- **2-3분 대기** (설정 반영 시간)

### Step 4: 배포된 사이트에서 테스트

1. **배포된 사이트 접속**
   - https://yago-vibe-spt.web.app/login/phone

2. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete
   - 캐시된 이미지 및 파일 삭제

3. **전화번호 로그인 테스트**
   - 테스트 번호: `+821056890800`
   - "인증번호 받기" 클릭
   - 인증번호: `123456`
   - "로그인" 클릭

## 📋 체크리스트

- [ ] Firebase Console > Authentication > Settings 접속
- [ ] Authorized domains 섹션 확인
- [ ] `localhost` 포함 확인
- [ ] `127.0.0.1` 포함 확인
- [ ] `yago-vibe-spt.firebaseapp.com` 포함 확인
- [ ] `yago-vibe-spt.web.app` 포함 확인 (없으면 추가)
- [ ] `yagovibe.com` 포함 확인 (없으면 추가)
- [ ] `www.yagovibe.com` 포함 확인 (없으면 추가) ⚠️ **가장 중요!**
- [ ] 2-3분 대기 (설정 반영 시간)
- [ ] 브라우저 캐시 삭제 (Ctrl + Shift + Delete)
- [ ] 배포된 사이트에서 테스트

## 💡 참고사항

- Firebase Hosting 도메인(`yago-vibe-spt.web.app`, `yago-vibe-spt.firebaseapp.com`)은 보통 자동으로 추가되지만, 때로는 수동으로 추가해야 할 수 있습니다.
- 실제 도메인(`yagovibe.com`)을 사용하는 경우 반드시 추가해야 합니다.
- Authorized domains 변경은 **즉시 반영되지 않을 수 있습니다** (최대 몇 시간).

## 🚨 여전히 안 되는 경우

1. **Firebase Console > Authentication > Sign-in method**
   - **"전화번호"** 제공업체가 **"사용 설정됨"** 상태인지 확인

2. **브라우저 콘솔 확인**
   - F12 > Console 탭
   - 추가 오류 메시지 확인

3. **네트워크 탭 확인**
   - F12 > Network 탭
   - 실패한 요청 확인

