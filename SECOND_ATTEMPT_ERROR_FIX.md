# 🔧 두 번째 시도 오류 해결

## 📋 문제 상황

**첫 번째 시도**:
1. `signInWithRedirect` 호출
2. Firebase Auth handler로 리다이렉트
3. "Unable to verify that the app domain is authorized" 오류
4. "The requested action is invalid" 오류

**두 번째 시도**:
1. 다시 로그인 페이지로 돌아옴
2. "로그인 중..." 상태
3. 우측 콘솔에 특정 메시지 표시

## 🎯 핵심 문제

**Firebase Console의 Authorized Domains에 `localhost`가 없어서 발생하는 문제입니다.**

리다이렉션이 발생했지만, Firebase Auth handler가 `localhost`를 인증하지 못해서 오류가 발생합니다.

## ✅ 즉시 해결 방법

### Step 1: Firebase Console - Authorized Domains 추가 (필수!)

1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication** → **Settings** 탭
4. **Authorized domains** 섹션 확인
5. **`localhost`가 있는지 확인**
   - 없으면 "Add domain" 클릭
   - `localhost` 입력
   - "Add" 클릭
6. **`yago-vibe-spt.firebaseapp.com`도 있는지 확인**
   - 없으면 추가

### Step 2: 설정 적용 대기

1. **1-2분 대기** (설정 적용 시간)
2. 브라우저 새로고침 (F5)
3. 다시 테스트

## 🔍 두 번째 시도 시 나타나는 메시지

### 예상되는 콘솔 메시지

1. **타임아웃 메시지** (제가 추가한 코드)
   ```
   ⚠️ [Google Login] 리다이렉션이 발생하지 않았습니다. 상태를 해제합니다.
   ```

2. **오류 메시지**
   ```
   ❌ [Google Login] 오류 발생: ...
   ```

3. **기타 메시지**
   - 중복 호출 차단 메시지
   - 기타 Firebase 오류

## 💡 해결 순서

### 우선순위 1: Firebase Console 설정 (가장 중요!)

**Firebase Console → Authentication → Settings → Authorized domains**

다음이 모두 포함되어 있어야 합니다:
- ✅ `localhost` ← **가장 중요!**
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`

### 우선순위 2: 브라우저 캐시 삭제

1. **Ctrl + Shift + Delete**
2. "전체 기간" 선택
3. "쿠키 및 기타 사이트 데이터" 체크
4. "캐시된 이미지 및 파일" 체크
5. "데이터 삭제" 클릭
6. Chrome 완전 종료 후 재시작

### 우선순위 3: Service Worker 제거

1. 주소창에 입력: `chrome://serviceworker-internals`
2. `yago-vibe-spt.firebaseapp.com` 관련 Service Worker 찾기
3. "Unregister" 클릭
4. Chrome 재시작

## 🎯 확인 체크리스트

- [ ] Firebase Console → Authorized domains에 `localhost` 포함
- [ ] Firebase Console → Authorized domains에 `yago-vibe-spt.firebaseapp.com` 포함
- [ ] 1-2분 대기 완료
- [ ] 브라우저 캐시 삭제 완료
- [ ] Chrome 재시작 완료
- [ ] 다시 테스트

## 📋 두 번째 시도 시 확인할 사항

1. **콘솔 메시지 확인**
   - 어떤 메시지가 나타나는지 확인
   - 오류 코드 확인

2. **Network 탭 확인** (F12 → Network)
   - `firebaseapp.com/_/auth/handler` 요청 확인
   - 요청 상태 코드 확인 (200, 302, 400, 500 등)

3. **페이지 상태 확인**
   - Google 로그인 페이지로 이동하는지
   - 아니면 오류 페이지에 머물러 있는지

## 💡 핵심 포인트

**가장 중요한 것**: Firebase Console의 Authorized Domains에 `localhost` 추가!

이것만 해도 문제가 해결됩니다!

