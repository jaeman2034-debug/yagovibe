# 🚨 모바일 로그인 오류 원인 분석 및 해결 방안

## 📊 발견된 문제

### 오류 1: `detectInAppBrowser is not defined`
- **증거**: 모바일 콘솔에서 `detectInAppBrowser is not defined` 오류 발생
- **영향**: 로그인 방식 결정 실패 → 로그인 튕김

### 오류 2: `Rendered fewer hooks than expected`
- **증거**: React 훅 호출 순서 불일치 오류
- **영향**: UI 렌더링 중단 → 빈 화면 또는 오류 팝업

## 🔍 근본 원인 분석

### 원인 1: detectInAppBrowser 함수 중복 정의 및 불일치

**문제점**:
1. **3개의 다른 파일에 detectInAppBrowser 함수가 정의됨**:
   - `src/utils/inAppBrowser.ts` - `InAppBrowserType` 반환 (메인)
   - `src/lib/detectInApp.ts` - `"kakao" | "instagram" | ... | "pc"` 반환
   - `src/utils/detectInAppBrowser.ts` - 또 다른 정의

2. **서로 다른 파일에서 서로 다른 함수를 import**:
   - `App.tsx`: `@/utils/inAppBrowser`에서 import
   - `authRedirect.ts`: `./detectInApp`에서 import
   - `useInAppBrowser.ts`: `@/utils/inAppBrowser`에서 import
   - `LoginPage.tsx`: `useInAppBrowser` 훅 사용

3. **모바일 빌드에서 모듈 로드 실패 가능성**:
   - 동적 import가 실패할 수 있음
   - 번들링 과정에서 함수가 제대로 export되지 않을 수 있음

### 원인 2: App.tsx의 InAppBrowserRedirect에서 안전하지 않은 함수 호출

**문제 코드** (`src/App.tsx` 189-203줄):
```typescript
const detectFn = detectInAppBrowserUtil || (window as any).detectInAppBrowser;

if (typeof detectFn === 'function') {
  const detectedType = detectFn();
  // ...
} else {
  console.error('❌ detectInAppBrowser 함수가 정의되지 않았습니다.');
  // 함수가 없어도 앱은 계속 실행 (일반 브라우저로 간주)
}
```

**문제점**:
- `detectInAppBrowserUtil`이 모바일에서 `undefined`일 수 있음
- `(window as any).detectInAppBrowser`도 정의되지 않았을 수 있음
- 함수가 없을 때 일반 브라우저로 간주하지만, 이후 로직에서 오류 발생 가능

### 원인 3: LoginPage.tsx의 조건부 훅 호출 가능성

**문제 코드** (`src/pages/LoginPage.tsx`):
```typescript
// 🔥 인앱 브라우저 감지
const { type: inAppBrowserType, isInApp } = useInAppBrowser();

// ... 중간에 조건부 return이 있을 수 있음

// 🔥 인앱 브라우저면 Blocker 표시
if (BLOCK_INAPP && isInApp && inAppBrowserType !== 'none') {
    return (
        <InAppBrowserBlocker
            type={inAppBrowserType}
            canonicalUrl={`https://${window.location.hostname}/login`}
        />
    );
}
```

**문제점**:
- `useInAppBrowser()` 훅이 내부적으로 `detectInAppBrowser()`를 호출
- 만약 `detectInAppBrowser`가 정의되지 않으면 훅 내부에서 오류 발생
- 조건부 return이 훅 호출 순서를 바꿀 수 있음

### 원인 4: useInAppBrowser 훅의 안전하지 않은 에러 처리

**문제 코드** (`src/hooks/useInAppBrowser.ts` 40-58줄):
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  try {
    const detectedType = detectInAppBrowser();
    setType(detectedType);
  } catch (error) {
    console.error('❌ [useInAppBrowser] 인앱 브라우저 감지 중 에러:', error);
    setType('none');
  }
}, []);
```

**문제점**:
- `detectInAppBrowser`가 정의되지 않았을 때 `ReferenceError` 발생
- catch로 잡히지만, 이미 오류가 발생한 후
- 모바일에서 함수가 로드되지 않으면 계속 오류 발생

## 🛠️ 해결 방안

### 해결책 1: detectInAppBrowser 함수 통일 및 안전한 export

1. **단일 소스로 통일**:
   - `src/utils/inAppBrowser.ts`를 메인 소스로 사용
   - 다른 파일의 `detectInAppBrowser` 함수 제거 또는 재export

2. **안전한 fallback 추가**:
   ```typescript
   // src/utils/inAppBrowser.ts
   export function detectInAppBrowser(uaRaw?: string): InAppBrowserType {
     try {
       // 기존 로직
     } catch (error) {
       console.error('❌ detectInAppBrowser 오류:', error);
       return 'none'; // 안전한 기본값
     }
   }
   
   // 전역 fallback (모바일 대응)
   if (typeof window !== 'undefined') {
     (window as any).detectInAppBrowser = detectInAppBrowser;
   }
   ```

### 해결책 2: App.tsx의 InAppBrowserRedirect 안전성 강화

1. **함수 존재 여부를 더 엄격하게 확인**:
   ```typescript
   // 함수가 확실히 정의되어 있는지 확인
   if (typeof detectInAppBrowserUtil !== 'function') {
     console.warn('⚠️ detectInAppBrowser 함수를 찾을 수 없습니다. 일반 브라우저로 간주합니다.');
     // 일반 브라우저로 처리하고 계속 진행
     return;
   }
   ```

2. **try-catch로 감싸기**:
   ```typescript
   try {
     const detectedType = detectInAppBrowserUtil();
     // ...
   } catch (error) {
     console.error('❌ detectInAppBrowser 호출 오류:', error);
     // 일반 브라우저로 간주하고 계속 진행
   }
   ```

### 해결책 3: LoginPage.tsx의 훅 호출 순서 보장

1. **모든 훅을 최상위에서 호출**:
   ```typescript
   export default function LoginPage() {
     // ✅ 모든 훅을 최상위에서 호출 (조건부 return 이전)
     const { user, loading } = useAuth();
     const { type: inAppBrowserType, isInApp } = useInAppBrowser();
     const navigate = useNavigate();
     // ... 다른 훅들
     
     // ✅ 조건부 return은 모든 훅 호출 후
     if (loading) return <LoadingSpinner />;
     if (BLOCK_INAPP && isInApp) return <InAppBrowserBlocker />;
     
     // ... 나머지 로직
   }
   ```

2. **useInAppBrowser 훅의 안전성 강화**:
   ```typescript
   export function useInAppBrowser(): UseInAppBrowserReturn {
     const [type, setType] = useState<InAppBrowserType>('none');
     
     useEffect(() => {
       if (typeof window === 'undefined') return;
       
       try {
         // 함수 존재 여부 확인
         if (typeof detectInAppBrowser !== 'function') {
           console.warn('⚠️ detectInAppBrowser 함수가 정의되지 않았습니다.');
           setType('none');
           return;
         }
         
         const detectedType = detectInAppBrowser();
         setType(detectedType);
       } catch (error) {
         console.error('❌ [useInAppBrowser] 오류:', error);
         setType('none'); // 안전한 기본값
       }
     }, []);
     
     return { type, isInApp: type !== 'none', isNormalBrowser: type === 'none' };
   }
   ```

### 해결책 4: authRedirect.ts의 함수 import 통일

1. **단일 소스 사용**:
   ```typescript
   // src/lib/authRedirect.ts
   import { detectInAppBrowser } from "@/utils/inAppBrowser";
   
   export function shouldUseRedirect(): boolean {
     try {
       const environment = detectInAppBrowser();
       // ...
     } catch (error) {
       console.error('❌ shouldUseRedirect 오류:', error);
       return false; // 안전한 기본값 (PC로 간주)
     }
   }
   ```

## 📝 우선순위별 수정 계획

### 1순위: detectInAppBrowser 함수 통일
- [ ] `src/lib/detectInApp.ts` 제거 또는 재export
- [ ] `src/utils/detectInAppBrowser.ts` 제거 또는 재export
- [ ] 모든 파일에서 `@/utils/inAppBrowser`에서만 import

### 2순위: 안전한 fallback 추가
- [ ] `detectInAppBrowser` 함수에 전역 fallback 추가
- [ ] 모든 호출부에 try-catch 추가
- [ ] 함수 존재 여부 확인 로직 추가

### 3순위: 훅 호출 순서 보장
- [ ] LoginPage.tsx의 모든 훅을 최상위로 이동
- [ ] 조건부 return을 모든 훅 호출 후로 이동
- [ ] useInAppBrowser 훅의 안전성 강화

### 4순위: 모바일 빌드 테스트
- [ ] 빌드 후 모바일에서 테스트
- [ ] 콘솔 오류 확인
- [ ] 로그인 플로우 테스트

---

**이 분석을 바탕으로 코드 수정을 진행하겠습니다.**

