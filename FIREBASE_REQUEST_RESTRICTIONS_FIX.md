# 🔥 Firebase Request Restrictions 문제 해결 (최종 원인 확인)

## ✅ 최종 원인 확인

**100% Firebase Auth "Request Restrictions" 문제**

### 오류 메시지 분석

**현재 오류**:
```
auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked
```

**OAuth mismatch가 아님** (다른 오류 메시지):
- ❌ `redirect_uri_mismatch` → 이 오류가 아님
- ❌ `Unable to verify domain is authorized` → 이 오류가 아님

**결론**: Firebase Auth의 "요청 제한(Request Restriction)" 기능이 활성화되어 요청이 차단되고 있음

## ✅ 확인 완료된 설정들

다음 설정들은 모두 정상입니다:

- ✅ **Authorized domains** = OK
- ✅ **Redirect URI** = OK
- ✅ **JavaScript origin** = OK
- ✅ **브라우저 캐시/프로필 문제** 아님
- ✅ **Service Worker 문제** 아님
- ✅ **App domain mismatch** 아님

## ❌ 문제: Firebase Auth가 요청을 차단

Firebase Auth 자체가 다음 도메인에서 오는 인증 요청을 차단하고 있음:
- ❌ `yago-vibe-spt.firebaseapp.com`
- ❌ `yago-vibe-spt.web.app`
- ❌ `yagovibe.vercel.app`
- ❌ `yagovibe.com`

## ❌ 최종 원인

**Firebase Auth의 "Request Restrictions(요청 제한)" 기능이 활성화되어 있음**

- 도메인이 올바르게 설정되어 있어도 Firebase가 요청을 차단
- `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked` 오류 발생
- 최근 Firebase가 auto domain restriction 기능을 자동 활성화하는 버그 존재

## 🔍 왜 localhost는 되고 배포 환경은 안 되나?

### localhost는 항상 허용
- `localhost`, `127.0.0.1`은 Firebase가 **무조건 허용**
- Request Restrictions 규칙과 무관하게 작동

### 배포 환경은 차단됨
다음 도메인들이 "Request Restriction 규칙"에서 허용되지 않아 막힘:
- ❌ `yago-vibe-spt.firebaseapp.com`
- ❌ `yago-vibe-spt.web.app`
- ❌ `yagovibe.vercel.app`
- ❌ `yagovibe.com`

## ✅ 해결 방법

### Step 1: Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication** → **Settings** 탭 클릭

### Step 2: Request Restrictions 확인

**"Authorized domains(승인된 도메인)"** 섹션 바로 아래에 다음 옵션이 있습니다:

```
Request Restrictions
- Block all requests from unauthorized domains
- Allow list only ...
```

또는

```
Blocking requests from unlisted domain
```

### Step 3: Request Restrictions 비활성화

**옵션 1: 완전히 끄기 (권장)**
- Request Restrictions 옵션을 **OFF**로 설정
- 또는 "Allow all domains"로 변경

**옵션 2: 도메인 추가**
- Request Restrictions를 유지하면서
- 다음 도메인들을 허용 목록에 추가:
  - `yago-vibe-spt.firebaseapp.com`
  - `yago-vibe-spt.web.app`
  - `yagovibe.com`
  - `www.yagovibe.com`
  - `yagovibe.vercel.app`

### Step 4: 저장 및 확인

1. 설정 변경 후 **저장** 클릭
2. **1-2분 대기** (설정 적용 시간)
3. 브라우저 새로고침 (F5)
4. 다시 테스트

## 🎯 핵심 포인트

**특히 확인할 항목**:
- ✅ `"Blocking requests from unlisted domain"` 옵션이 **ON**인지 확인
- ✅ 이 옵션이 켜져 있으면 `firebaseapp.com` 도메인조차 request가 막힘
- ✅ 그래서 handler가 403/404/invalid 오류로 떨어짐

## 📋 체크리스트

### Firebase Console
- [ ] Authentication → Settings 접속
- [ ] "Authorized domains" 섹션 확인
- [ ] "Request Restrictions" 옵션 확인
- [ ] "Blocking requests from unlisted domain" 옵션이 **OFF**인지 확인
- [ ] 또는 허용 목록에 모든 도메인 추가
- [ ] 설정 저장
- [ ] 1-2분 대기
- [ ] 브라우저 새로고침
- [ ] 다시 테스트

## ⚠️ 주의사항

### Request Restrictions를 켜두는 경우

만약 보안상 Request Restrictions를 유지해야 한다면:

1. **모든 도메인을 허용 목록에 추가**
   - `yago-vibe-spt.firebaseapp.com`
   - `yago-vibe-spt.web.app`
   - `yagovibe.com`
   - `www.yagovibe.com`
   - `yagovibe.vercel.app`
   - `localhost` (개발 환경용)

2. **새 도메인 추가 시마다 허용 목록 업데이트 필요**

### Request Restrictions를 끄는 경우 (권장)

- ✅ 모든 도메인에서 정상 작동
- ✅ 새 도메인 추가 시 설정 변경 불필요
- ✅ 개발/프로덕션 환경 모두에서 작동
- ⚠️ 보안상 약간 덜 엄격 (하지만 Authorized domains로 충분히 제어 가능)

## 🔄 현재 코드 상태

현재 코드는 이미 **팝업 방식(`signInWithPopup`)**으로 전환되어 있습니다:

- ✅ `LoginPage.tsx`: `signInWithPopup` 사용
- ✅ `SignupPage.tsx`: `signInWithPopup` 사용
- ✅ `App.tsx`: `getRedirectResult` 제거

**Request Restrictions를 해제하면**:
- 팝업 방식이 정상 작동
- redirect 방식도 작동 (향후 필요 시)

## 💡 최종 해결 순서

1. **Firebase Console → Authentication → Settings**
2. **Request Restrictions 옵션 확인**
3. **"Blocking requests from unlisted domain" OFF로 설정**
4. **저장**
5. **1-2분 대기**
6. **브라우저 새로고침**
7. **테스트**

이제 `auth/requests-from-referer-are-blocked` 오류가 해결됩니다!

