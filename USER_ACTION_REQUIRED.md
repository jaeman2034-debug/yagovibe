# 🔧 사용자가 직접 해야 할 작업

## ❌ 현재 상황
- "The requested action is invalid." 오류 계속 발생
- 중복 호출 방지 로직은 추가했지만 여전히 문제 발생

## ✅ 사용자가 직접 확인해야 할 사항

### 1. 브라우저 캐시/쿠키 완전 삭제 (가장 중요!)

**작업**:
1. 브라우저 완전히 닫기 (모든 창)
2. 개발자 도구 열기 (F12)
3. Application 탭 → Storage → Clear site data
4. 또는:
   - Ctrl + Shift + Delete
   - "쿠키 및 기타 사이트 데이터" 선택
   - "전체 기간" 선택
   - "데이터 삭제" 클릭

**특히 삭제할 항목**:
- `localhost` 쿠키
- `firebaseapp.com` 쿠키
- `accounts.google.com` 쿠키
- 모든 캐시

### 2. 시크릿 모드에서 테스트

**작업**:
1. 시크릿 모드 열기 (Ctrl + Shift + N)
2. `http://localhost:5173/login` 접속
3. Google 로그인 시도

**확인**: 시크릿 모드에서도 같은 오류가 발생하는지 확인

### 3. React StrictMode 임시 비활성화 테스트

**작업**:
1. `src/main.tsx` 파일 열기
2. `<React.StrictMode>` 주석 처리:
   ```typescript
   // <React.StrictMode>
     <Root />
   // </React.StrictMode>
   ```
3. 서버 재시작
4. 테스트

**확인**: StrictMode 없이도 같은 오류가 발생하는지 확인

### 4. 다른 브라우저에서 테스트

**작업**:
- Chrome에서 테스트 중이라면 → Edge 또는 Firefox에서 테스트
- 다른 브라우저에서도 같은 오류가 발생하는지 확인

### 5. Firebase Console 설정 재확인

**작업**:
1. Firebase Console → Authentication → Settings → Authorized domains
2. 다음이 모두 포함되어 있는지 확인:
   - `localhost`
   - `127.0.0.1`
   - `yago-vibe-spt.firebaseapp.com`

### 6. Google Cloud Console OAuth 설정 재확인

**작업**:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 클라이언트 ID 클릭
3. "승인된 JavaScript 원본" 확인:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
4. "승인된 리디렉션 URI" 확인:
   - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
   - `http://localhost:5173/__/auth/handler` (필요시)

## 🔍 디버깅 정보 수집

테스트 후 다음 정보를 확인하세요:

1. **콘솔 로그**:
   - "signInWithPopup 호출 시작" 로그가 몇 번 출력되는지
   - refValue와 loadingState 값
   - 오류 발생 시 상세 로그

2. **Network 탭**:
   - 개발자 도구 → Network 탭
   - Google 로그인 버튼 클릭
   - `firebaseapp.com` 또는 `accounts.google.com` 요청 확인
   - 실패한 요청의 상태 코드와 응답 확인

3. **Application 탭**:
   - 개발자 도구 → Application 탭
   - Cookies → `localhost` 확인
   - Local Storage 확인

## 🎯 우선순위

1. **브라우저 캐시/쿠키 완전 삭제** (가장 중요!)
2. **시크릿 모드에서 테스트**
3. **React StrictMode 임시 비활성화**
4. **다른 브라우저에서 테스트**

이 중 하나라도 해결되면 원인을 파악할 수 있습니다!

