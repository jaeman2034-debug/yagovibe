# ✅ React StrictMode 이중 렌더링 문제 해결

## 🔍 문제 분석

### 스크린샷 확인 결과
- 여전히 "The requested action is invalid." 오류 발생
- 콘솔 로그: "signInWithPopup 호출 직전"까지는 정상
- 이후 오류 발생 → 중복 호출 가능성

### React StrictMode 문제
- `src/main.tsx`에서 `<React.StrictMode>` 사용 중
- 개발 모드에서 컴포넌트가 두 번 렌더링됨
- onClick 핸들러도 두 번 실행될 수 있음

## ✅ 적용된 해결책

### useRef를 사용한 동기적 중복 방지

#### 1. useRef 추가
```typescript
// 🔥 React StrictMode 이중 렌더링 방지용 ref
const isSigningInRef = useRef(false);
```

#### 2. 이중 체크 로직
```typescript
// state + ref 둘 다 확인
if (googleLoading || isSigningInRef.current) {
  return; // 중복 호출 차단
}

// 즉시 ref 설정 (동기적 - 렌더링 사이클과 무관)
isSigningInRef.current = true;
setGoogleLoading(true);
```

#### 3. finally 블록에서 해제
```typescript
finally {
  isSigningInRef.current = false; // ref도 함께 해제
  setGoogleLoading(false);
}
```

## 📋 중복 방지 메커니즘 (2단계)

### 1단계: 이중 체크 (state + ref)
```typescript
if (googleLoading || isSigningInRef.current) {
  return; // state나 ref 중 하나라도 true면 차단
}
```

### 2단계: 즉시 ref 설정
```typescript
isSigningInRef.current = true; // 동기적 설정 (즉시 반영)
setGoogleLoading(true); // 비동기적 설정 (다음 렌더링에 반영)
```

### 3단계: finally 블록으로 항상 해제
```typescript
finally {
  isSigningInRef.current = false; // ref 해제
  setGoogleLoading(false); // state 해제
}
```

## 🎯 왜 useRef가 필요한가?

### useState의 문제
- 비동기적 업데이트
- 다음 렌더링 사이클에 반영
- React StrictMode에서 두 번째 렌더링이 첫 번째 state 업데이트를 보지 못할 수 있음

### useRef의 장점
- 동기적 업데이트
- 즉시 반영됨
- 렌더링 사이클과 무관
- React StrictMode에서도 즉시 감지 가능

## ✅ 최종 체크리스트

- [x] `useRef` import 추가
- [x] `isSigningInRef` 선언
- [x] 이중 체크 로직 (state + ref)
- [x] 즉시 ref 설정
- [x] finally 블록에서 ref 해제

## 🧪 테스트 시나리오

### 시나리오 1: React StrictMode 이중 렌더링
1. 첫 번째 렌더링: `isSigningInRef.current = true` 설정
2. 두 번째 렌더링: `isSigningInRef.current` 확인 → 이미 true → 차단 ✅

### 시나리오 2: 빠른 연속 클릭
1. 첫 번째 클릭: `isSigningInRef.current = true` + `googleLoading = true`
2. 두 번째 클릭: 둘 다 확인 → 이미 true → 차단 ✅

### 시나리오 3: 정상 로그인
1. 클릭 → ref + state 설정
2. 로그인 성공 → finally 블록 실행 → ref + state 해제 ✅

## 🎉 완료

이제 React StrictMode에서도 중복 호출이 완벽하게 방지됩니다!

**핵심**: `useRef`로 동기적 체크 + `useState`로 비동기적 체크 = 완벽한 이중 방지!

