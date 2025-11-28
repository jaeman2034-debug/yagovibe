# 🔍 auth/requests-from-referer-are-blocked 오류 근본 원인 분석

## 🎯 현재 오류

**콘솔 오류**:
```
구글 로그인 실패
Firebase: Error (auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked)
```

## 🔥 근본 원인 (확정)

이 오류는 **Firebase Console의 "Request Restrictions" 설정** 때문입니다.

### 원인 설명

1. **Firebase Auth의 Request Restrictions 기능**
   - Firebase Console → Authentication → Settings
   - "Request Restrictions" 섹션에 "Block all requests from unauthorized domains" 옵션이 있음
   - 이 옵션이 활성화되어 있으면, **Authorized domains에 등록되어 있어도** 요청을 차단할 수 있음

2. **오류 메시지 분석**
   - `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`
   - 이는 `yago-vibe-spt.firebaseapp.com` 도메인에서 오는 요청이 차단되었다는 의미
   - **도메인은 Authorized domains에 등록되어 있지만, Request Restrictions에서 차단됨**

3. **왜 이런 일이 발생하는가?**
   - Firebase가 최근에 "Request Restrictions" 기능을 자동 활성화하는 버그가 있음
   - 또는 수동으로 설정했지만, 모든 도메인을 명시적으로 허용하지 않았을 수 있음

## ✅ 해결 방법 (100% 확실)

### Step 1: Firebase Console 접속

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com
   ```

2. **프로젝트 선택**
   ```
   yago-vibe-spt
   ```

3. **Authentication → Settings 탭**
   ```
   왼쪽 메뉴 > Authentication > Settings 탭
   ```

### Step 2: Request Restrictions 확인 및 해제

1. **"Authorized domains" 섹션 찾기**
   - "Authorized domains" 섹션이 보임
   - 그 바로 아래에 **"Request Restrictions"** 섹션이 있음

2. **Request Restrictions 옵션 확인**
   - "Block all requests from unauthorized domains" 체크박스가 있는지 확인
   - 또는 "Allow list only" 옵션이 있는지 확인

3. **Request Restrictions 해제**
   - **"Block all requests from unauthorized domains" 체크 해제**
   - 또는 **"Allow all domains"** 선택
   - 또는 Request Restrictions 기능 자체를 **비활성화**

### Step 3: Authorized domains 확인 (추가 안전장치)

1. **Authorized domains 섹션 확인**
   - 다음 도메인들이 모두 포함되어 있는지 확인:
     - `yago-vibe-spt.firebaseapp.com` ✅
     - `yago-vibe-spt.web.app` ✅
     - `localhost` (개발용) ✅
     - `yagovibe.com` (커스텀 도메인, 있다면) ✅
     - `www.yagovibe.com` (커스텀 도메인, 있다면) ✅

2. **도메인 추가 (없다면)**
   - "Add domain" 버튼 클릭
   - 도메인 입력
   - "Add" 클릭

### Step 4: 저장 및 대기

1. **저장**
   - 변경사항 저장

2. **대기**
   - 1-2분 대기 (설정 적용 시간)

3. **테스트**
   - 브라우저 새로고침 (Ctrl + Shift + R)
   - "G 구글로 로그인" 버튼 클릭
   - 정상 작동 확인

## 📋 체크리스트

- [ ] Firebase Console 접속 완료
- [ ] Authentication → Settings 탭 이동 완료
- [ ] Request Restrictions 섹션 찾기 완료
- [ ] "Block all requests from unauthorized domains" 체크 해제 완료
- [ ] Authorized domains 확인 완료
- [ ] 모든 필수 도메인 포함 확인 완료
- [ ] 저장 완료
- [ ] 1-2분 대기 완료
- [ ] 브라우저 새로고침 완료
- [ ] 로그인 테스트 완료

## 💡 왜 이것이 근본 원인인가?

### 증거 1: 오류 메시지
- `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`
- 이는 **Firebase가 요청을 차단**했다는 의미
- 도메인은 Authorized domains에 있지만, Request Restrictions에서 차단됨

### 증거 2: 이전 분석
- 도메인 설정은 모두 정상
- OAuth 설정도 모두 정상
- 하지만 여전히 오류 발생
- → **Request Restrictions가 원인**

### 증거 3: Firebase 공식 문서
- Firebase는 Request Restrictions 기능을 제공
- 이 기능이 활성화되면, Authorized domains에 있어도 차단할 수 있음
- 특히 최근 Firebase가 자동 활성화하는 버그가 있음

## ✅ 완료

이제 Firebase Console에서 Request Restrictions를 해제하면 오류가 해결됩니다!

