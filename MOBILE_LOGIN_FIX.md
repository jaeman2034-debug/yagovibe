# 🔧 모바일 로그인 튕김 현상 해결

## 📊 문제 원인

모바일 환경(특히 카카오톡 인앱 브라우저)에서 로그인 후 튕김 현상이 발생하는 원인:

1. **경쟁 상태(Race Condition)**
   - LoginPage의 useEffect가 `/sports-hub`로 리다이렉트
   - 동시에 ProtectedRoute가 user 상태를 확인하여 `/login`으로 리다이렉트
   - 이 과정이 반복되면서 무한 루프 발생

2. **인증 상태 업데이트 지연**
   - 모바일 환경에서 Firebase 인증 상태 업데이트가 느릴 수 있음
   - `/sports-hub` 페이지 로드 시점에 user 상태가 아직 업데이트되지 않아 ProtectedRoute가 `/login`으로 리다이렉트

3. **useEffect 중복 실행**
   - LoginPage의 useEffect가 user 상태 변경 시마다 실행됨
   - 이미 다른 페이지에 있어도 다시 리다이렉트를 시도

## ✅ 해결 방법

### 1. LoginPage.tsx 수정

**변경 사항:**
- `useRef`를 사용하여 무한 루프 방지
- 현재 경로가 `/login`일 때만 리다이렉트하도록 조건 추가
- 경로 변경 시 ref 초기화

```typescript
const hasRedirectedRef = useRef(false); // 🔥 무한 루프 방지용 ref

useEffect(() => {
    if (!loading && user && location.pathname === "/login" && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        navigate("/sports-hub", { replace: true });
    }
    
    // 🔥 경로가 변경되거나 user가 null이 되면 ref 초기화
    if (location.pathname !== "/login" || !user) {
        hasRedirectedRef.current = false;
    }
}, [user, loading, navigate, location.pathname]);
```

### 2. ProtectedRoute.tsx 수정

**변경 사항:**
- `useRef`를 사용하여 리다이렉트 시도 횟수 제한
- 경로 변경 시 ref 초기화
- user가 null이고 이미 리다이렉트를 시도한 경우 로딩 화면 표시

```typescript
const redirectAttemptedRef = useRef(false); // 🔥 무한 루프 방지용 ref

useEffect(() => {
    redirectAttemptedRef.current = false;
}, [location.pathname]);

if (!user && !redirectAttemptedRef.current) {
    redirectAttemptedRef.current = true;
    return <Navigate to="/login" replace />;
}
```

## 🚀 배포 방법

### 1. 빌드
```bash
npm run build
```

### 2. 배포
```bash
firebase deploy
```

### 3. 테스트
- 모바일 브라우저에서 `https://www.yagovibe.com/login` 접속
- 로그인 시도
- `/sports-hub`로 정상 이동하는지 확인
- 다시 `/login`으로 튕기지 않는지 확인

## 📝 추가 확인 사항

### 모바일 환경 특이사항

1. **카카오톡 인앱 브라우저**
   - sessionStorage 접근 제한 가능
   - 인증 상태 업데이트 지연 가능

2. **네트워크 지연**
   - 모바일 네트워크에서 Firebase 인증 상태 업데이트가 느릴 수 있음
   - 로딩 상태를 충분히 기다려야 함

3. **브라우저 캐시**
   - 이전 빌드 파일이 캐시되어 있을 수 있음
   - 브라우저 캐시 삭제 후 테스트 필요

## 🔍 디버깅 방법

### 콘솔 로그 확인

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 확인
3. 다음 로그들이 정상적으로 출력되는지 확인:
   - `✅ [LoginPage] 인증 완료. /sports-hub로 이동.`
   - `✅ [ProtectedRoute] 로그인 확인됨 - 페이지 렌더링`
   - `⚠️ [ProtectedRoute] 로그인 필요 - /login으로 리다이렉트` (이 로그가 반복되면 문제)

### 모바일 디버깅

1. Chrome DevTools 원격 디버깅 사용
   - PC에서 `chrome://inspect` 접속
   - 모바일 기기 연결 후 콘솔 확인

2. Eruda 사용
   - 모바일에서 콘솔 확인 가능
   - 이미 프로젝트에 포함되어 있음

## ✅ 해결 확인 체크리스트

- [ ] 로그인 성공 후 `/sports-hub`로 정상 이동
- [ ] `/sports-hub` 페이지에서 다시 `/login`으로 튕기지 않음
- [ ] 여러 번 새로고침해도 정상 작동
- [ ] 카카오톡 인앱 브라우저에서도 정상 작동
- [ ] 일반 모바일 브라우저에서도 정상 작동

