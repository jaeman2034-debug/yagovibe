# 🔥 구글 로그인 오류 완전 해결 가이드

## ❌ 오류 의미 정리

### 오류 코드
```
auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked
```

### 의미
- Firebase Auth가 특정 referer(도메인)에서 오는 OAuth 요청을 차단하고 있음
- `https://yago-vibe-spt.firebaseapp.com`에서 오는 요청이 허용되지 않음

### 발생 원인
1. **Firebase Authorized domains에 도메인 미등록**
2. **Firebase Google provider 설정과 Google Cloud OAuth client 설정 불일치**
3. **과거 호스팅 도메인/클라이언트 ID와 현재 사용하는 것 불일치**

## 🔧 1단계: 코드 레벨 개선

### 개선된 LoginPage.tsx 코드

```typescript
// src/pages/LoginPage.tsx
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

// 🔥 Google 로그인 버튼 onClick 핸들러
onClick={async () => {
    try {
        // 🔍 1. 사전 검증: 현재 환경 정보 로깅
        const currentUrl = window.location.href;
        const referer = document.referrer || currentUrl;
        const hostname = window.location.hostname;
        
        console.log("🔍 [Google Login] 사전 검증 시작:", {
            currentUrl,
            referer,
            hostname,
            authDomain: auth.app.options.authDomain,
            projectId: auth.app.options.projectId,
            apiKey: auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : "없음",
            timestamp: new Date().toISOString(),
        });
        
        // 🔍 2. Firebase Auth 인스턴스 정보 확인
        console.log("🔍 [Google Login] Firebase Auth 인스턴스 정보:", {
            appName: auth.app.name,
            authDomain: auth.app.options.authDomain,
            projectId: auth.app.options.projectId,
            apiKey: auth.app.options.apiKey ? "✅ 설정됨" : "❌ 없음",
        });
        
        // 🔍 3. GoogleAuthProvider 생성 및 로깅
        const provider = new GoogleAuthProvider();
        console.log("🔍 [Google Login] GoogleAuthProvider 생성 완료:", {
            providerId: provider.providerId,
            // provider.customParameters는 private이므로 직접 접근 불가
        });
        
        // 🔍 4. signInWithPopup 호출 전 최종 확인
        console.log("🔍 [Google Login] signInWithPopup 호출 직전:", {
            authInstance: auth ? "✅ 존재" : "❌ 없음",
            provider: provider ? "✅ 존재" : "❌ 없음",
            currentDomain: hostname,
            expectedAuthDomain: auth.app.options.authDomain,
            domainMatch: hostname === auth.app.options.authDomain || 
                        hostname.includes(auth.app.options.authDomain?.replace('.firebaseapp.com', '') || ''),
        });
        
        // 🔥 5. 실제 로그인 시도
        const result = await signInWithPopup(auth, provider);
        
        console.log("✅ [Google Login] 로그인 성공:", {
            userEmail: result.user.email,
            userUid: result.user.uid,
            providerId: result.providerId,
            timestamp: new Date().toISOString(),
        });
        
        navigate("/sports-hub");
    } catch (error: any) {
        // 🔍 6. 오류 발생 시 상세 정보 로깅
        const errorDetails = {
            code: error.code,
            message: error.message,
            email: error.email,
            credential: error.credential,
            customData: error.customData,
            stack: error.stack,
            currentUrl: window.location.href,
            referer: document.referrer,
            hostname: window.location.hostname,
            authDomain: auth.app.options.authDomain,
            projectId: auth.app.options.projectId,
            timestamp: new Date().toISOString(),
        };
        
        console.error("❌ [Google Login] 로그인 실패 - 상세 정보:", errorDetails);
        console.error("❌ [Google Login] 전체 오류 객체:", error);
        
        let errorMsg = "";
        
        // 🔥 7. auth/requests-from-referer-are-blocked 오류 특별 처리
        if (error.code === "auth/requests-from-referer-are-blocked" || 
            error.message?.includes("requests-from-referer") || 
            error.message?.includes("are-blocked") ||
            error.code?.includes("requests-from-referer")) {
            
            errorMsg = 
                "❌ 인증 요청이 차단되었습니다.\n\n" +
                "🔍 발견된 문제: 승인된 도메인 누락 또는 클라이언트 ID 불일치\n\n" +
                "현재 도메인: " + window.location.hostname + "\n" +
                "예상 도메인: " + auth.app.options.authDomain + "\n\n" +
                "✅ 해결 방법:\n" +
                "1. Firebase Console → Authentication → Settings → Authorized domains\n" +
                "   - '" + window.location.hostname + "' 추가\n" +
                "   - '" + auth.app.options.authDomain + "' 확인\n\n" +
                "2. Firebase Console → Authentication → Sign-in method → Google\n" +
                "   - '웹 클라이언트 ID' 확인\n" +
                "   - Google Cloud Console의 OAuth 2.0 Web Client ID와 일치하는지 확인\n\n" +
                "3. Google Cloud Console → APIs & Services → Credentials\n" +
                "   - OAuth 2.0 클라이언트 ID 확인\n" +
                "   - '승인된 JavaScript 원본'에 현재 도메인 포함 여부 확인\n\n" +
                "4. 브라우저 캐시 삭제 후 새로고침 (Ctrl+Shift+R)\n\n" +
                `에러 코드: ${error.code || "unknown"}\n` +
                `에러 메시지: ${error.message || "없음"}\n\n` +
                "💡 개발자 콘솔(F12)에서 상세 정보를 확인하세요.";
            
            alert(errorMsg);
            
            // 🔍 개발 환경에서만 추가 디버깅 정보 표시
            if (import.meta.env.DEV) {
                console.group("🔍 [개발 모드] 추가 디버깅 정보");
                console.log("현재 URL:", window.location.href);
                console.log("Referer:", document.referrer);
                console.log("Hostname:", window.location.hostname);
                console.log("Firebase Auth Domain:", auth.app.options.authDomain);
                console.log("Firebase Project ID:", auth.app.options.projectId);
                console.log("Firebase API Key:", auth.app.options.apiKey ? "✅ 설정됨" : "❌ 없음");
                console.groupEnd();
            }
        } else if (error.code === "auth/operation-not-allowed") {
            errorMsg =
                "Google 로그인이 활성화되지 않았습니다.\n\nFirebase Console에서 활성화해주세요:\n1. Firebase Console > Authentication > Sign-in method\n2. Google 활성화\n3. Project support email 설정";
            alert(errorMsg);
        } else if (error.code === "auth/popup-closed-by-user") {
            errorMsg = "로그인 창이 닫혔습니다. 다시 시도해주세요.";
        } else if (error.code === "auth/popup-blocked") {
            errorMsg =
                "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
        } else if (error.message?.includes("invalid") || error.message?.includes("invalid action") || error.code === "auth/invalid-action") {
            errorMsg = 
                "❌ 인증 요청이 거부되었습니다.\n\n" +
                "🔍 발견된 문제: OAuth 설정 문제\n\n" +
                "OAuth 동의 화면 또는 클라이언트 ID 설정에 문제가 있을 수 있습니다.\n\n" +
                "✅ 해결 방법:\n" +
                "1. Google Cloud Console → APIs & Services → OAuth consent screen\n" +
                "   - 앱 상태 확인 (테스트/프로덕션)\n" +
                "   - 테스트 상태라면 테스트 사용자 목록에 이메일 추가\n\n" +
                "2. Google Cloud Console → APIs & Services → Credentials\n" +
                "   - OAuth 2.0 클라이언트 ID 확인\n" +
                "   - '승인된 JavaScript 원본' 확인\n\n" +
                "3. Firebase Console → Authentication → Sign-in method → Google\n" +
                "   - '웹 클라이언트 ID' 확인\n\n" +
                "4. 브라우저 새로고침 (Ctrl+Shift+R)\n" +
                "5. Google 로그인 재시도\n\n" +
                `에러 코드: ${error.code || "unknown"}\n` +
                `에러 메시지: ${error.message || "없음"}`;
            alert(errorMsg);
        } else {
            errorMsg = error.message || "구글 로그인에 실패했습니다.";
        }
        
        setError(errorMsg);
    }
}}
```

## 🔧 2단계: Firebase / Google Cloud 설정 가이드

### ✅ (1) Firebase Console - Authorized domains 설정

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**필수 도메인 목록**:
- `localhost` (개발 환경용)
- `yago-vibe-spt.firebaseapp.com` (Firebase 기본 도메인)
- `yago-vibe-spt.web.app` (Firebase 기본 도메인)
- 실제 서비스 도메인 (예: `www.yagovibe.com`, `yagovibe.com`)

**설정 방법**:
1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. 왼쪽 메뉴 → **Authentication** 클릭
4. **Settings** 탭 선택
5. **Authorized domains** 섹션 찾기
6. **"Add domain"** 버튼 클릭
7. 도메인 입력 후 **"Add"** 클릭

**⚠️ 중요**: 이 리스트에 없는 도메인에서 오는 요청은 차단됩니다.

### ✅ (2) Firebase Console - Google Provider 설정

**경로**: Firebase Console → Authentication → Sign-in method → Google

**확인 사항**:
1. **"웹 클라이언트 ID"** 필드 확인
2. 이 값이 Google Cloud Console의 OAuth 2.0 Web Client ID와 **완전히 일치**해야 함
3. 한 글자라도 다르면 안 됨

**설정 방법**:
1. Firebase Console → Authentication → Sign-in method
2. **Google** 옵션 클릭
3. **"웹 클라이언트 ID"** 필드 확인
4. Google Cloud Console에서 확인한 OAuth 2.0 Web Client ID와 비교
5. 다르다면 수정 후 **"Save"** 클릭

### ✅ (3) Google Cloud Console - OAuth 2.0 Client ID 확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**확인 방법**:
1. Google Cloud Console 접속: https://console.cloud.google.com
2. 프로젝트 선택: `yago-vibe-spt` (또는 연결된 GCP 프로젝트)
3. 왼쪽 메뉴 → **APIs & Services** → **Credentials**
4. **OAuth 2.0 Client IDs** 섹션에서 **Web application** 타입 클라이언트 찾기
5. 클라이언트 ID 클릭하여 편집
6. **"승인된 JavaScript 원본"** 확인:
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://www.yagovibe.com` (커스텀 도메인 사용 시)
   - `http://localhost:5179` (개발 환경용)
7. **"승인된 리디렉션 URI"** 확인:
   - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
   - `https://yago-vibe-spt.web.app/__/auth/handler`

**클라이언트 ID 복사**:
- 클라이언트 ID 전체 값 복사 (예: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`)
- Firebase Console의 "웹 클라이언트 ID" 필드에 붙여넣기

### ✅ (4) OAuth 동의 화면 확인

**경로**: Google Cloud Console → APIs & Services → OAuth consent screen

**확인 사항**:
1. **"승인된 도메인"** 섹션 확인:
   - `yago-vibe-spt.firebaseapp.com` 포함 여부
   - `www.yagovibe.com` 포함 여부 (커스텀 도메인 사용 시)
2. **앱 상태** 확인:
   - "테스트" 상태라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가
   - 또는 "프로덕션"으로 변경 (검토 필요)

## 📋 3단계: 최종 해결 체크리스트

### ✅ Step 1: Firebase Console 설정 확인

- [ ] **Firebase Console 접속**
  - URL: https://console.firebase.google.com
  - 프로젝트: `yago-vibe-spt` 선택

- [ ] **Authorized domains 확인**
  - Authentication → Settings → Authorized domains
  - `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
  - 없으면 "Add domain"으로 추가

- [ ] **Google Provider 설정 확인**
  - Authentication → Sign-in method → Google
  - "웹 클라이언트 ID" 필드 확인
  - 값 기록: `___________________________`

### ✅ Step 2: Google Cloud Console 설정 확인

- [ ] **Google Cloud Console 접속**
  - URL: https://console.cloud.google.com
  - 프로젝트: `yago-vibe-spt` (또는 연결된 GCP 프로젝트) 선택

- [ ] **OAuth 2.0 Client ID 확인**
  - APIs & Services → Credentials → OAuth 2.0 Client IDs
  - Web application 타입 클라이언트 찾기
  - 클라이언트 ID 클릭하여 편집
  - 클라이언트 ID 값 복사: `___________________________`

- [ ] **클라이언트 ID 일치 확인**
  - Firebase Console의 "웹 클라이언트 ID"와 비교
  - 완전히 일치하는지 확인
  - 다르다면 Firebase Console에 Google Cloud Console의 값 입력

- [ ] **승인된 JavaScript 원본 확인**
  - OAuth 클라이언트 편집 화면에서
  - "승인된 JavaScript 원본"에 다음 포함 여부 확인:
    - `https://yago-vibe-spt.firebaseapp.com`
    - 없으면 추가

- [ ] **승인된 리디렉션 URI 확인**
  - "승인된 리디렉션 URI"에 다음 포함 여부 확인:
    - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
    - 없으면 추가

- [ ] **OAuth 동의 화면 확인**
  - APIs & Services → OAuth consent screen
  - "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
  - 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가

### ✅ Step 3: Firebase Google Provider 재설정 (선택사항, 추천)

- [ ] **Google Provider 비활성화**
  - Firebase Console → Authentication → Sign-in method → Google
  - 비활성화 클릭

- [ ] **잠시 대기** (5-10초)

- [ ] **Google Provider 다시 활성화**
  - 다시 활성화 클릭
  - "웹 클라이언트 ID" 다시 확인 및 입력
  - 저장

### ✅ Step 4: 브라우저 캐시/세션 초기화 및 테스트

- [ ] **브라우저 완전히 종료**
  - 모든 브라우저 창 닫기

- [ ] **브라우저 캐시/쿠키 삭제**
  - Ctrl+Shift+Delete (Windows) 또는 Cmd+Shift+Delete (Mac)
  - 캐시 및 쿠키 선택
  - 삭제

- [ ] **시크릿 모드에서 테스트**
  - 브라우저 시크릿 모드 열기
  - `https://yago-vibe-spt.firebaseapp.com` 접속
  - Google 로그인 시도

- [ ] **개발자 도구 확인**
  - F12로 개발자 도구 열기
  - Console 탭에서 오류 메시지 확인
  - Network 탭에서 OAuth 요청 확인

### ✅ Step 5: 최종 확인

- [ ] **로그인 성공 확인**
  - Google 로그인 버튼 클릭
  - 팝업 창에서 Google 계정 선택
  - 로그인 성공 확인

- [ ] **콘솔 로그 확인**
  - 개발자 도구 Console에서
  - "✅ [Google Login] 로그인 성공" 메시지 확인
  - 오류 없이 성공했는지 확인

## 🎯 핵심 포인트 요약

1. **Firebase Authorized domains에 도메인 등록 필수**
2. **Firebase Google Provider의 "웹 클라이언트 ID"와 Google Cloud OAuth Client ID 완전 일치 필수**
3. **Google Cloud OAuth Client의 "승인된 JavaScript 원본"에 도메인 포함 필수**
4. **설정 변경 후 브라우저 캐시 삭제 필수**

## 📝 추가 참고사항

- 설정 변경 후 적용되는 데 5분~몇 시간이 걸릴 수 있음
- 여러 환경(dev/prod)이 있다면 각각 확인 필요
- 클라이언트 ID는 한 글자라도 다르면 안 됨

