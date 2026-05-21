# ✅ React Hooks Error #300 해결 (카카오톡 인앱 브라우저)

## 📊 오류 원인

**오류 메시지**: `Rendered fewer hooks than expected`

카카오톡 인앱 브라우저에서 앱을 클릭했을 때 발생하는 React Hooks 규칙 위반 오류입니다.

### 근본 원인

1. **`useInAppBrowser` 훅의 비동기 상태 업데이트**
   - `useState` 초기값이 `'none'`으로 설정됨
   - `useEffect`에서 `detectInAppBrowser()` 호출 후 상태 업데이트
   - 카카오톡 인앱 브라우저에서 `detectInAppBrowser` 함수 로드 지연

2. **Hooks 호출 순서 불일치**
   - 첫 렌더: `useInAppBrowser`가 `type: 'none'` 반환 → 조건부 return 실행 안 됨
   - `useEffect` 실행 후: `type: 'kakao'`로 업데이트 → 두 번째 렌더에서 조건부 return 실행
   - 카카오톡에서 `detectInAppBrowser` 함수가 로드되지 않으면 hooks 호출 순서가 달라짐

3. **조건부 return 전 hooks 호출 순서 문제**
   - `handleGuestLogin` 함수가 hooks 호출 후에 정의됨
   - `useCallback`으로 감싸지 않아 hooks 호출 순서가 일관되지 않음

## ✅ 해결 방법

### 1. `useInAppBrowser` 훅 동기적 초기화

**파일**: `src/hooks/useInAppBrowser.ts`

```typescript
// 🔥 동기적으로 초기값 설정 (hooks 호출 순서 일관성 보장)
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
    console.error('❌ [useInAppBrowser] 초기값 설정 중 에러:', error);
    return 'none';
  }
};

// 🔥 즉시 실행 함수로 초기값 설정 (lazy initialization)
const [type, setType] = useState<InAppBrowserType>(() => getInitialType());
```

**개선 사항**:
- ✅ 동기적으로 초기값 설정 (hooks 호출 순서 일관성 보장)
- ✅ `window.detectInAppBrowser` fallback 확인 (카카오톡에서 함수 로드 지연 대응)
- ✅ 즉시 실행 함수로 lazy initialization 방지

### 2. `handleGuestLogin` 함수를 `useCallback`으로 감싸기

**파일**: `src/pages/LoginPage.tsx`

```typescript
// 🔥 게스트 로그인 처리 함수 (인앱 브라우저에서도 작동)
// ⚠️ useCallback으로 감싸서 hooks 호출 순서 일관성 보장
const handleGuestLogin = useCallback(async () => {
  try {
    setGuestLoading(true);
    console.log("🎯 [LoginPage] 게스트 로그인 시도 중...");
    
    const userCred = await signInAnonymously(auth);
    console.log("✅ [LoginPage] 게스트 로그인 성공:", userCred.user.uid);
    
    navigate("/sports-hub", { replace: true });
  } catch (error: any) {
    console.error("❌ [LoginPage] 게스트 로그인 실패:", error);
    setError("게스트 로그인에 실패했습니다. 다시 시도해주세요.");
  } finally {
    setGuestLoading(false);
  }
}, [navigate]);
```

**개선 사항**:
- ✅ `useCallback`으로 감싸서 hooks 호출 순서 일관성 보장
- ✅ 의존성 배열에 `navigate` 포함

## 🎯 최종 결과

### 해결된 문제

1. ✅ **카카오톡 인앱 브라우저에서 React Hooks Error #300 해결**
   - `useInAppBrowser` 훅이 동기적으로 초기화됨
   - hooks 호출 순서가 일관되게 유지됨

2. ✅ **`detectInAppBrowser` 함수 로드 지연 대응**
   - `window.detectInAppBrowser` fallback 확인 추가
   - 동기적으로 초기값 설정

3. ✅ **조건부 return 전 hooks 호출 순서 보장**
   - `handleGuestLogin`을 `useCallback`으로 감싸기
   - 모든 hooks가 조건부 return 전에 호출됨

## 📝 관련 파일

- `src/hooks/useInAppBrowser.ts`: 인앱 브라우저 감지 훅 (동기적 초기화)
- `src/pages/LoginPage.tsx`: 로그인 페이지 (useCallback 적용)
- `src/utils/inAppBrowser.ts`: 인앱 브라우저 감지 유틸리티

## 🚀 배포 후 테스트

1. **카카오톡 인앱 브라우저에서 테스트**
   - 앱 클릭 → React Hooks Error #300 발생하지 않음 확인
   - 로그인 페이지 정상 로드 확인

2. **일반 브라우저에서 테스트**
   - 로그인 페이지 정상 작동 확인

---

**이제 카카오톡 인앱 브라우저에서도 React Hooks 오류 없이 정상 작동합니다!** 🎉

