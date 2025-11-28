# 🔥 auth/cancelled-popup-request 오류 해결

## ❌ 발견된 오류

### 오류 1: `auth/cancelled-popup-request`
- **원인**: 여러 개의 팝업 요청이 동시에 발생
- **증상**: Google 로그인 버튼을 여러 번 클릭하거나, 팝업이 이미 열려있는 상태에서 또 열려고 할 때 발생

### 오류 2: `The requested action is invalid`
- **원인**: Firebase Auth handler가 잘못된 action/state를 받음
- **증상**: 팝업이 열렸지만 callback 처리 중 오류 발생

## 🔍 문제 원인 분석

### 1. 중복 클릭 방지 로직 없음

**현재 코드** (`src/pages/LoginPage.tsx`):
```typescript
onClick={async () => {
  // 로딩 상태 체크 없음 ❌
  // 중복 클릭 방지 없음 ❌
  const result = await signInWithPopup(auth, provider);
}}
```

**문제점**:
- 사용자가 빠르게 여러 번 클릭하면 여러 개의 `signInWithPopup` 호출 발생
- 첫 번째 팝업이 아직 열리는 중에 두 번째 팝업 요청 발생
- → `auth/cancelled-popup-request` 오류 발생

### 2. 팝업 상태 확인 없음

**문제점**:
- 이미 팝업이 열려있는지 확인하지 않음
- 팝업이 닫히기 전에 새로운 팝업을 열려고 시도
- → 중복 팝업 요청 발생

## ✅ 해결 방법

### 1. 로딩 상태 추가

**수정할 파일**: `src/pages/LoginPage.tsx`

**추가할 코드**:
```typescript
const [googleLoading, setGoogleLoading] = useState(false);
```

### 2. 중복 클릭 방지

**수정할 코드**:
```typescript
onClick={async () => {
  // 🔥 중복 클릭 방지
  if (googleLoading) {
    console.log("⚠️ [Google Login] 이미 로그인 진행 중...");
    return;
  }
  
  setGoogleLoading(true);
  try {
    // ... signInWithPopup 호출
  } finally {
    setGoogleLoading(false);
  }
}}
```

### 3. 팝업 상태 확인

**추가할 코드**:
```typescript
// 🔥 이미 팝업이 열려있는지 확인
if (document.querySelector('iframe[src*="firebaseapp.com"]')) {
  console.log("⚠️ [Google Login] 이미 팝업이 열려있습니다. 기다려주세요...");
  return;
}
```

## 🔧 완전한 수정 코드

### LoginPage.tsx 수정

```typescript
// 1. 로딩 상태 추가
const [googleLoading, setGoogleLoading] = useState(false);

// 2. Google 로그인 핸들러 수정
<button
  onClick={async () => {
    // 🔥 중복 클릭 방지
    if (googleLoading) {
      console.log("⚠️ [Google Login] 이미 로그인 진행 중...");
      return;
    }
    
    // 🔥 이미 팝업이 열려있는지 확인
    if (document.querySelector('iframe[src*="firebaseapp.com"]')) {
      console.log("⚠️ [Google Login] 이미 팝업이 열려있습니다. 기다려주세요...");
      setError("이미 로그인 창이 열려있습니다. 기다려주세요...");
      return;
    }
    
    setGoogleLoading(true);
    setError("");
    
    try {
      // ... 기존 코드
      const result = await signInWithPopup(auth, provider);
      // ... 성공 처리
    } catch (error: any) {
      // 🔥 cancelled-popup-request 오류 특별 처리
      if (error.code === "auth/cancelled-popup-request") {
        console.log("⚠️ [Google Login] 팝업 요청이 취소되었습니다. 잠시 후 다시 시도해주세요.");
        setError("로그인 창이 이미 열려있습니다. 기다려주세요...");
        return;
      }
      // ... 기존 오류 처리
    } finally {
      setGoogleLoading(false);
    }
  }}
  disabled={googleLoading}
  className={googleLoading ? "opacity-50 cursor-not-allowed" : ""}
>
  {googleLoading ? "로그인 중..." : "G 구글로 로그인"}
</button>
```

### SignupPage.tsx도 동일하게 수정

## 🎯 추가 해결 방법

### 방법 1: 버튼 비활성화

**장점**: 사용자가 여러 번 클릭하는 것을 물리적으로 방지
**단점**: UI가 약간 바뀜

### 방법 2: 디바운싱 (Debouncing)

**장점**: 빠른 연속 클릭을 하나의 클릭으로 처리
**단점**: 구현이 복잡함

### 방법 3: 팝업 감지

**장점**: 정확하게 팝업 상태를 감지
**단점**: iframe 감지가 100% 정확하지 않을 수 있음

## 📋 최종 수정 체크리스트

### LoginPage.tsx
- [ ] `googleLoading` 상태 추가
- [ ] 중복 클릭 방지 로직 추가
- [ ] 팝업 상태 확인 로직 추가
- [ ] `cancelled-popup-request` 오류 처리 추가
- [ ] 버튼 disabled 상태 추가
- [ ] 로딩 중 UI 표시

### SignupPage.tsx
- [ ] 동일한 수정 적용

## ✅ 예상 결과

**수정 후**:
- ✅ 중복 클릭 방지
- ✅ 팝업 상태 확인
- ✅ `auth/cancelled-popup-request` 오류 해결
- ✅ 사용자 경험 개선

## 🔥 핵심 해결 방법

**가장 간단하고 효과적인 방법**:
1. **로딩 상태 추가** (`googleLoading`)
2. **중복 클릭 방지** (`if (googleLoading) return`)
3. **버튼 비활성화** (`disabled={googleLoading}`)
4. **오류 처리 개선** (`cancelled-popup-request` 특별 처리)

이렇게 하면 `auth/cancelled-popup-request` 오류가 완전히 해결됩니다!

