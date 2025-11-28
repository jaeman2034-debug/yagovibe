# 🔍 Google 로그인 최종 진단

## ✅ 이미 확인된 사항
- [x] Firebase Console > Authentication > 로그인 방법 > Google: **사용 설정됨** ✅
- [x] Firebase Authorized domains: `localhost` 포함됨 ✅
- [x] Google Cloud Console OAuth 클라이언트: 리디렉션 URI `__/auth/handler` (언더스코어 2개) ✅
- [x] 코드: `signInWithPopup` 사용 중 ✅
- [x] 코드: `googleProvider` 설정 정상 ✅

## 🚨 남은 원인 확인

### 원인 1: OAuth 동의 화면 > 테스트 사용자 미추가 (가장 가능성 높음!)

**외부 사용자 유형을 선택했는데 테스트 사용자가 없으면 Google이 로그인을 거부합니다.**

#### 확인 방법:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 "yago-vibe-spt" 선택

2. **OAuth 동의 화면 확인**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"OAuth 동의 화면"**

3. **사용자 유형 확인**
   - **"사용자 유형"** 섹션 확인
   - **"외부"** 또는 **"내부"** 선택됨

4. **테스트 사용자 확인** (외부인 경우 필수!)
   - **"테스트 사용자"** 섹션 확인
   - **본인 이메일 추가**: `jaeman2034@gmail.com`
   - 없으면:
     - **"+ 사용자 추가"** 또는 **"사용자 추가"** 클릭
     - 이메일 입력: `jaeman2034@gmail.com`
     - **"저장"** 클릭

5. **앱 정보 확인**
   - **"앱 정보"** 섹션 확인
   - **"사용자 지원 이메일"**이 실제 이메일 주소로 설정되어 있는지 확인
   - 예: `jaeman2034@gmail.com`

### 원인 2: Identity Toolkit API 미활성화

#### 확인 방법:

1. **Google Cloud Console > API 라이브러리**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"라이브러리"**

2. **Identity Toolkit API 검색**
   - 검색창에 **"Identity Toolkit API"** 입력
   - 클릭

3. **활성화 상태 확인**
   - **"사용 설정됨"** 또는 **"관리"** 버튼이 보이면 활성화된 것
   - **"사용 설정"** 버튼이 보이면 비활성화 → 클릭하여 활성화

### 원인 3: 브라우저 캐시/쿠키 문제

#### 해결 방법:

1. **완전한 캐시 삭제**
   - Chrome: Ctrl + Shift + Delete
   - **"전체 기간"** 선택
   - **"캐시된 이미지 및 파일"** 체크
   - **"쿠키 및 기타 사이트 데이터"** 체크
   - **"데이터 삭제"** 클릭

2. **시크릿 모드에서 테스트**
   - Chrome 시크릿 모드 (Ctrl + Shift + N)
   - http://localhost:5173 접속
   - Google 로그인 테스트

3. **쿠키 허용 확인**
   - Chrome 설정 > **"개인정보 및 보안"** > **"쿠키 및 기타 사이트 데이터"**
   - **"모든 쿠키 허용"** 확인

### 원인 4: 팝업 차단 문제

#### 해결 방법:

1. **팝업 차단 해제**
   - Chrome 주소창 오른쪽 팝업 차단 아이콘 클릭
   - **"항상 localhost:5173의 팝업 허용"** 선택

2. **사이트 설정 확인**
   - Chrome 주소창 왼쪽 자물쇠 아이콘 클릭
   - **"사이트 설정"** 클릭
   - **"팝업 및 리디렉션"** > **"허용"** 확인

### 원인 5: Firebase 프로젝트와 Google Cloud 프로젝트 불일치

#### 확인 방법:

1. **Firebase Console > 프로젝트 설정**
   - Firebase Console > **"프로젝트 설정"** (⚙️ 아이콘)
   - **"일반"** 탭
   - **"Google Cloud 프로젝트 번호"** 확인 (예: `126699415285`)

2. **Google Cloud Console에서 확인**
   - Google Cloud Console 상단 프로젝트 선택
   - 프로젝트 번호가 Firebase와 일치하는지 확인
   - 일치하지 않으면 OAuth 클라이언트가 다른 프로젝트에 있을 수 있음

## 🔥 즉시 확인할 순서

1. **Google Cloud Console > OAuth 동의 화면 > 테스트 사용자에 `jaeman2034@gmail.com` 추가** (가장 중요!)
2. **Google Cloud Console > API 라이브러리 > Identity Toolkit API 활성화 확인**
3. **브라우저 캐시 완전 삭제**
4. **시크릿 모드에서 테스트**
5. **팝업 차단 해제 확인**

## 📋 최종 체크리스트

- [ ] Google Cloud Console > OAuth 동의 화면 > 테스트 사용자에 `jaeman2034@gmail.com` 추가됨
- [ ] Google Cloud Console > OAuth 동의 화면 > 사용자 지원 이메일 설정됨
- [ ] Google Cloud Console > API 라이브러리 > Identity Toolkit API 활성화됨
- [ ] Firebase Console > 프로젝트 설정 > Google Cloud 프로젝트 번호 일치 확인
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] 팝업 차단 해제 확인

## 💡 디버깅 팁

브라우저 콘솔에서 다음을 확인하세요:

```javascript
// 현재 도메인 확인
console.log('Current domain:', window.location.origin);

// Firebase Auth 설정 확인
import { auth } from './src/lib/firebase';
console.log('Auth domain:', auth.config.authDomain);
console.log('Auth API key:', auth.config.apiKey ? '✅ 설정됨' : '❌ 없음');
```

Network 탭에서 실패한 요청 확인:
- F12 > Network 탭
- Google 로그인 버튼 클릭
- 실패한 요청 (빨간색) 클릭
- Response 탭에서 오류 메시지 확인
- Headers 탭에서 요청 URL 확인

## 🚨 가장 가능성 높은 원인

**OAuth 동의 화면 > 테스트 사용자에 본인 이메일이 추가되지 않았을 가능성이 가장 높습니다!**

외부 사용자 유형을 선택했는데 테스트 사용자가 없으면, Google이 로그인을 거부하고 "The requested action is invalid" 오류를 반환합니다.

## 🔥 즉시 해야 할 것

1. **Google Cloud Console > OAuth 동의 화면** 접속
2. **"테스트 사용자"** 섹션 확인
3. **"+ 사용자 추가"** 클릭
4. **이메일 입력**: `jaeman2034@gmail.com`
5. **"저장"** 클릭
6. **브라우저 캐시 삭제**
7. **시크릿 모드에서 테스트**

