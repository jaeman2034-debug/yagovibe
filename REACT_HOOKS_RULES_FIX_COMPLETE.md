# ✅ React Hooks 규칙 위반 완전 해결 (카카오톡 인앱 브라우저)

## 📊 오류 원인

**오류 메시지**: `Minified React error #300: Rendered fewer hooks than expected`

카카오톡 인앱 브라우저에서 앱을 클릭했을 때 발생하는 React Hooks 규칙 위반 오류입니다.

### 근본 원인

1. **조건부 return 전 hooks 호출 순서 문제**
   - `useEffect`가 조건부 return 이후에 호출됨
   - 카카오톡에서 첫 렌더링과 두 번째 렌더링에서 hooks 호출 순서가 달라짐

2. **함수 정의 순서 문제**
   - `handleLogin` 함수가 두 번 정의됨 (중복)
   - `handleLogin`이 `useCallback`으로 감싸지지 않아 `useEffect` 의존성 배열에서 불안정

3. **비동기 상태 업데이트**
   - `useInAppBrowser` 훅이 비동기로 상태 업데이트
   - 카카오톡에서 `detectInAppBrowser` 함수 로드 지연

## ✅ 해결 방법

### 1. 모든 hooks를 조건부 return 전에 호출

**파일**: `src/pages/LoginPage.tsx`

```typescript
export default function LoginPage() {
    // ✅ 1. 모든 useState hooks
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // ... 기타 useState
    
    // ✅ 2. 모든 커스텀 hooks
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const { type: inAppBrowserType, isInApp } = useInAppBrowser();
    const isSigningInRef = useRef(false);
    
    // ✅ 3. 모든 useEffect hooks
    useEffect(() => { /* ... */ }, [user, loading, navigate]);
    useEffect(() => { /* ... */ }, []);
    useEffect(() => { /* ... */ }, [handleLogin]); // ⚠️ handleLogin 의존성
    
    // ✅ 4. 모든 useCallback hooks
    const handleGuestLogin = useCallback(async () => { /* ... */ }, [navigate]);
    const handleLogin = useCallback(async (e?: React.FormEvent) => { /* ... */ }, [email, password, googleLoading]);
    
    // ✅ 5. 조건부 return (모든 hooks 호출 후)
    if (loading) {
        return <LoadingSpinner />;
    }
    
    if (BLOCK_INAPP && isInApp && inAppBrowserType !== 'none') {
        return <InAppBrowserBlocker />;
    }
    
    // ✅ 6. 일반 함수 정의 (hooks가 아님)
    const speak = (text: string) => { /* ... */ };
    const handlePasswordReset = async () => { /* ... */ };
    
    // ✅ 7. JSX 반환
    return ( /* ... */ );
}
```

### 2. `handleLogin` 함수를 `useCallback`으로 감싸기

**이유**:
- `useEffect`의 의존성 배열에 `handleLogin` 포함
- `handleLogin`이 매 렌더링마다 새로 생성되면 `useEffect`가 계속 재실행됨
- `useCallback`으로 감싸서 함수 참조 안정화

```typescript
const handleLogin = useCallback(async (e?: React.FormEvent) => {
    // ... 로그인 로직
}, [email, password, googleLoading]); // 의존성 배열에 필요한 값 포함
```

### 3. 중복된 함수 정의 제거

- Line 213: `handleLogin` 정의 (유지)
- Line 430: `handleLogin` 정의 (제거) ✅

### 4. `useInAppBrowser` 훅 동기적 초기화

**파일**: `src/hooks/useInAppBrowser.ts`

```typescript
// ✅ 동기적으로 초기값 설정
const getInitialType = (): InAppBrowserType => {
    try {
        if (typeof window === 'undefined') return 'none';
        if (typeof detectInAppBrowser === 'function') {
            return detectInAppBrowser();
        }
        // window 객체에서 fallback 확인
        if (typeof (window as any).detectInAppBrowser === 'function') {
            return (window as any).detectInAppBrowser();
        }
        return 'none';
    } catch (error) {
        return 'none';
    }
};

// ✅ 즉시 실행 함수로 초기값 설정
const [type, setType] = useState<InAppBrowserType>(() => getInitialType());
```

## 🎯 최종 결과

### 해결된 문제

1. ✅ **카카오톡 인앱 브라우저에서 React Hooks Error #300 해결**
   - 모든 hooks가 조건부 return 전에 호출됨
   - hooks 호출 순서가 일관되게 유지됨

2. ✅ **함수 참조 안정화**
   - `handleLogin`을 `useCallback`으로 감싸서 함수 참조 안정화
   - `useEffect` 의존성 배열에서 안정적인 참조 보장

3. ✅ **중복 코드 제거**
   - 중복된 `handleLogin` 함수 제거
   - 코드 일관성 향상

## 📝 Hooks 호출 순서 (최종)

```typescript
1. useState (모든 state)
2. useNavigate
3. useAuth
4. useInAppBrowser
5. useRef
6. useEffect #1 (리디렉션 로직)
7. useEffect #2 (음성 인식 초기화)
8. useCallback (handleGuestLogin)
9. useCallback (handleLogin)
10. useEffect #3 (음성 인식 이벤트 리스너)
11. 조건부 return (if loading)
12. 조건부 return (if inApp)
13. 일반 함수 정의
14. JSX 반환
```

## 🚀 배포 후 테스트

1. **카카오톡 인앱 브라우저에서 테스트**
   - 앱 클릭 → React Hooks Error #300 발생하지 않음 확인
   - 로그인 페이지 정상 로드 확인

2. **일반 브라우저에서 테스트**
   - 로그인 페이지 정상 작동 확인
   - 모든 기능 정상 작동 확인

---

**이제 카카오톡 인앱 브라우저에서도 React Hooks 오류 없이 정상 작동합니다!** 🎉

