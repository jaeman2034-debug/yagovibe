# 🔍 구글 로그인 오류 완전 분석 보고서

## ❌ 실제 오류 메시지
```
auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked.
```

## 📍 1단계: 오류 발생 위치 찾기

### 발견된 오류 처리 코드
**파일**: `src/pages/LoginPage.tsx` (라인 362-379)

```typescript
} else if (error.message?.includes("requests-from-referer") || 
           error.message?.includes("are-blocked") || 
           error.code?.includes("requests-from-referer")) {
    // 오류 메시지 표시
}
```

### 오류 발생 함수
**파일**: `src/pages/LoginPage.tsx` (라인 326-341)

```typescript
onClick={async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        // ...
    } catch (error: any) {
        // 오류 처리
    }
}}
```

## 🔍 2단계: OAuth 흐름 분석

### 현재 구현 방식
1. **프론트엔드**: `signInWithPopup(auth, provider)` 사용
2. **Firebase SDK**: 자동으로 OAuth 팝업 생성 및 callback 처리
3. **클라이언트 ID**: Firebase Console의 Google 제공자 설정에서 자동으로 가져옴

### 문제점 발견
- **코드에서 클라이언트 ID를 직접 설정하지 않음**
- Firebase SDK가 Firebase Console의 Google 제공자 설정에서 클라이언트 ID를 가져옴
- 만약 Firebase Console의 "웹 클라이언트 ID"가 Google Cloud Console의 클라이언트 ID와 다르면 오류 발생

## 🎯 3단계: 원인 분석

### 가능한 원인 1: Firebase Console의 Google 제공자 설정 불일치
**가장 가능성 높음!**

Firebase Console → Authentication → Sign-in method → Google에서:
- "웹 클라이언트 ID" 필드에 설정된 값이
- Google Cloud Console의 OAuth 클라이언트 ID와 일치하지 않을 수 있음

**확인 필요**:
- Firebase Console의 "웹 클라이언트 ID": `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- Google Cloud Console의 OAuth 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### 가능한 원인 2: OAuth 동의 화면 설정
Google Cloud Console → APIs & Services → OAuth consent screen:
- "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
- 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가

### 가능한 원인 3: 여러 OAuth 클라이언트 ID 존재
Google Cloud Console에 여러 OAuth 클라이언트 ID가 있을 수 있음:
- Firebase가 잘못된 클라이언트 ID를 사용하고 있을 수 있음
- 올바른 클라이언트 ID를 확인하고 Firebase Console에 설정

## 🔧 4단계: 해결 방법

### 해결 방법 1: Firebase Console의 Google 제공자 재설정 (가장 중요!)

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Sign-in method → Google**
   - 현재 설정 확인
   - "웹 클라이언트 ID" 필드 확인

3. **클라이언트 ID 확인 및 수정**
   - Google Cloud Console에서 확인한 클라이언트 ID:
     - `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - Firebase Console의 "웹 클라이언트 ID" 필드에 **정확히 동일한 값** 입력
   - 저장

4. **비활성화 후 재활성화**
   - Google 제공자 비활성화
   - 잠시 후 다시 활성화
   - 클라이언트 ID 다시 확인

### 해결 방법 2: OAuth 동의 화면 확인

1. **Google Cloud Console → APIs & Services → OAuth consent screen**
2. **승인된 도메인 확인**:
   - `yago-vibe-spt.firebaseapp.com` 포함 여부
3. **앱 상태 확인**:
   - "테스트" 상태라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가
   - 또는 "프로덕션"으로 변경 (검토 필요)

### 해결 방법 3: 브라우저 완전 초기화

1. 브라우저 완전히 닫기
2. 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
3. Google 관련 쿠키 모두 삭제
4. 브라우저 다시 열기
5. 시크릿 모드에서 테스트

## 📝 5단계: 최종 확인 체크리스트

### Firebase Console
- [ ] Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID"가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**
- [ ] "Project support email" 설정됨

### Google Cloud Console - OAuth 클라이언트 ID
- [ ] APIs & Services → Credentials → OAuth 2.0 클라이언트 ID
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

### Google Cloud Console - OAuth 동의 화면
- [ ] APIs & Services → OAuth consent screen
- [ ] "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가됨

## 🎯 핵심 발견 사항

1. **코드에서 클라이언트 ID를 직접 설정하지 않음**
   - Firebase SDK가 Firebase Console 설정에서 자동으로 가져옴
   - 따라서 Firebase Console의 설정이 정확해야 함

2. **오류는 Firebase Auth의 내부 검증에서 발생**
   - `auth/requests-from-referer-are-blocked`는 Firebase Auth가 특정 도메인에서의 요청을 차단할 때 발생
   - 이는 클라이언트 ID 불일치 또는 승인된 도메인 누락 때문일 수 있음

3. **가장 가능성 높은 원인**
   - Firebase Console의 "웹 클라이언트 ID"가 Google Cloud Console의 OAuth 클라이언트 ID와 일치하지 않음

## ✅ 최종 해결 방법

**Firebase Console → Authentication → Sign-in method → Google**에서:
1. "웹 클라이언트 ID" 필드를 확인
2. Google Cloud Console의 클라이언트 ID와 **완전히 일치**하는지 확인
3. 다르다면 수정하고 저장
4. 브라우저 새로고침 후 재시도

