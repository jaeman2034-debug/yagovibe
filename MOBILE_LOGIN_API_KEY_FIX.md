# 📱 모바일 로그인 문제 해결 가이드

## 🚨 문제 진단

### 증상
- ✅ **웹(PC)**: 앱이 잘 열리고 로그인 정상 작동
- ❌ **모바일**: 앱이 열리지 않거나 로그인 후 튕김

### 근본 원인

코드 분석 결과:

1. **인증 방식 차이**:
   - **PC**: `signInWithPopup()` 사용 (팝업 창)
   - **모바일**: `signInWithRedirect()` 사용 (페이지 리다이렉션)

2. **리퍼러 체크 엄격성**:
   - `signInWithPopup`: 팝업 창 내에서 처리되어 리퍼러 체크가 상대적으로 관대함
   - `signInWithRedirect`: 페이지 리다이렉션을 거치며 여러 경로를 통과하므로 리퍼러 체크가 더 엄격함

3. **API 키 제한 설정 문제**:
   - '키 제한 안 함'으로 설정되어 있어도
   - '웹사이트 제한사항' 목록에 주소가 남아있으면
   - Google 서버에서 불필요한 리퍼러 체크를 수행
   - 모바일 Redirect 방식에서는 이 체크를 통과하지 못할 수 있음

## ✅ 해결 방법

### Step 1: Google Cloud Console에서 웹사이트 제한 목록 완전 삭제

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **Browser key (Firebase API Key) 편집**
   - API 키 목록에서 Browser key 클릭
   - 편집 버튼 클릭

3. **웹사이트 제한사항 완전 삭제** ⚠️ **가장 중요!**
   ```
   '애플리케이션 제한사항' 섹션에서:
   
   1. '웹사이트' 선택 (목록을 활성화하기 위해)
   2. '웹사이트 제한사항' 목록에 있는 모든 주소를 체크(✓)
      예: http://127.0.0.1:5173/*, http://localhost:5173/* 등
   3. 목록 위의 [Delete] 버튼 클릭하여 모든 주소 삭제
   4. 목록이 완전히 비워진 것을 확인
   ```

4. **애플리케이션 제한사항 변경**
   ```
   '애플리케이션 제한사항':
   → '없음' 선택
   ```

5. **API 제한사항 확인**
   ```
   'API 제한사항':
   → '키 제한 안 함' 선택 (이미 되어있으면 확인만)
   ```

6. **저장**
   - 화면 하단의 [저장] 버튼 클릭
   - 변경사항 적용까지 5-10분 대기

### Step 2: 브라우저 캐시 삭제 및 테스트

1. **모바일 브라우저 캐시 삭제**
   - Chrome: 설정 > 개인정보 보호 및 보안 > 인터넷 사용 기록 삭제
   - Safari: 설정 > Safari > 인터넷 사용 기록 및 웹사이트 데이터 지우기

2. **시크릿/비공개 모드에서 테스트**
   - 새로운 시크릿 탭에서 앱 접속
   - 로그인 시도

## 🔍 코드 확인

### 모바일/PC 인증 방식 분기

```typescript
// src/lib/authRedirect.ts
export function shouldUseRedirect(): boolean {
  const environment = detectInAppBrowser();

  // 인앱 브라우저는 무조건 Redirect만 허용됨
  if (environment === "kakao" || environment === "instagram" || environment === "facebook" || environment === "line") {
    return true;
  }

  // 모바일 기본 브라우저: Redirect 권장
  if (environment === "mobile") {
    return true;
  }

  // PC는 팝업 로그인
  return false;
}
```

### LoginPage.tsx에서 사용

```typescript
// src/pages/LoginPage.tsx
const redirectNeeded = shouldUseRedirect();

if (redirectNeeded) {
    // 모바일: signInWithRedirect 사용
    await signInWithRedirect(auth, provider);
} else {
    // PC: signInWithPopup 사용
    await signInWithPopup(auth, provider);
}
```

## ⚠️ 주의사항

1. **웹사이트 제한 목록이 비어있어야 함**
   - '키 제한 안 함'이어도 목록에 주소가 있으면 체크함
   - 모바일 Redirect 방식에서는 이 체크를 통과하지 못할 수 있음

2. **변경사항 적용 대기 시간**
   - Google Cloud Console 설정 변경 후 5-10분 대기 필수
   - 전 세계 서버에 설정이 전파되는 데 시간이 걸림

3. **브라우저 캐시 삭제 필수**
   - 이전 설정이 캐시되어 있을 수 있음
   - 시크릿 모드에서 테스트하는 것을 권장

## 📊 예상 결과

### 수정 전
- ❌ 모바일: 로그인 시도 → 오류 발생 또는 튕김
- ✅ PC: 로그인 정상 작동

### 수정 후
- ✅ 모바일: 로그인 정상 작동
- ✅ PC: 로그인 정상 작동 (변화 없음)

## 🔗 관련 파일

- `src/lib/authRedirect.ts`: 모바일/PC 인증 방식 분기
- `src/pages/LoginPage.tsx`: Google 로그인 처리
- `src/lib/firebase.ts`: Firebase 초기화 및 API 키 설정

## 📝 체크리스트

- [ ] Google Cloud Console 접속
- [ ] Browser key 편집
- [ ] 웹사이트 제한사항 목록 완전 삭제
- [ ] 애플리케이션 제한사항을 '없음'으로 변경
- [ ] API 제한사항이 '키 제한 안 함'인지 확인
- [ ] 저장 버튼 클릭
- [ ] 5-10분 대기
- [ ] 모바일 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] 로그인 성공 확인

---

**이 가이드를 따라 설정하면 모바일 로그인 문제가 해결됩니다!** 🎉

