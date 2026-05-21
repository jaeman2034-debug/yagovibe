# 🚨 구글 로그인 후 로그인 페이지로 튕기는 문제 해결

## 📊 문제 분석

### **현재 상황:**
- 구글 계정으로 로그인하면 로그인 페이지로 튕김
- 다른 브라우저에서는 익명 로그인이 됨

### **원인 분석:**

#### **1. `getRedirectResult`와 `onAuthStateChanged` 타이밍 문제 (가능성 높음)**
- `getRedirectResult`가 비동기로 실행됨
- `onAuthStateChanged`가 먼저 실행되어 `user`가 설정됨
- 하지만 `getRedirectResult`가 아직 완료되지 않아서 리디렉션이 안 됨
- 결과: 로그인 페이지로 다시 돌아옴

#### **2. `ProtectedRoute` 리디렉션 문제 (가능성 중간)**
- `ProtectedRoute`가 `user`가 없으면 `/login`으로 리디렉션
- `getRedirectResult`가 완료되기 전에 `ProtectedRoute`가 실행되어 리디렉션될 수 있음

#### **3. `hasRedirectedRef` 초기화 문제 (가능성 낮음)**
- `hasRedirectedRef`가 제대로 초기화되지 않아서 리디렉션이 안 될 수 있음

---

## 🛠️ 해결 방법

### **방법 1: `getRedirectResult` 우선 처리 (최우선)**

`getRedirectResult`를 먼저 처리하고, 성공하면 즉시 리디렉션:

```typescript
// LoginPage.tsx
useEffect(() => {
  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        // Firestore 프로필 생성...
        
        // 🔥 즉시 리디렉션 (onAuthStateChanged보다 먼저)
        hasRedirectedRef.current = true;
        navigate("/sports-hub", { replace: true });
        return; // 여기서 종료
      }
    } catch (error) {
      // 에러 처리...
    }
  };
  
  // 🔥 getRedirectResult를 먼저 처리
  handleRedirectResult();
}, []);
```

---

### **방법 2: `onAuthStateChanged` 리디렉션 로직 개선**

`onAuthStateChanged`에서도 리디렉션하되, `getRedirectResult`가 이미 처리했으면 스킵:

```typescript
// LoginPage.tsx
useEffect(() => {
  // 🔥 loading 중이면 아무것도 하지 않음
  if (loading) {
    return;
  }
  
  // 🔥 /login 경로가 아니면 아무것도 하지 않음
  if (location.pathname !== "/login") {
    return;
  }
  
  // 🔥 이미 리디렉션했으면 다시 하지 않음
  if (hasRedirectedRef.current) {
    return;
  }
  
  // 🔥 user가 있으면 리디렉션
  if (user) {
    console.log("✅ [LoginPage] 이미 로그인된 사용자 감지. /sports-hub로 이동.");
    hasRedirectedRef.current = true;
    navigate("/sports-hub", { replace: true });
    return;
  }
}, [user, loading, location.pathname, navigate]);
```

---

### **방법 3: `ProtectedRoute` 개선**

`ProtectedRoute`가 리디렉션하기 전에 `getRedirectResult`가 완료될 때까지 대기:

```typescript
// ProtectedRoute.tsx
const { user, loading } = useAuth();

// 🔥 loading 중이면 대기
if (loading) {
  return <div>로딩 중...</div>;
}

// 🔥 user가 없으면 로그인 페이지로 리디렉션
if (!user) {
  return <Navigate to="/login" replace />;
}
```

---

## 📋 구현 계획

### **1단계: `getRedirectResult` 우선 처리 (최우선)**

`LoginPage.tsx`에서 `getRedirectResult`를 먼저 처리하고, 성공하면 즉시 리디렉션:

1. `getRedirectResult`를 `useEffect`의 첫 번째로 실행
2. 성공하면 즉시 리디렉션
3. `hasRedirectedRef`를 설정하여 중복 리디렉션 방지

---

### **2단계: `onAuthStateChanged` 리디렉션 로직 개선**

`onAuthStateChanged`에서도 리디렉션하되, `getRedirectResult`가 이미 처리했으면 스킵:

1. `hasRedirectedRef`를 확인하여 이미 리디렉션했으면 스킵
2. `user`가 있으면 리디렉션

---

### **3단계: `ProtectedRoute` 확인**

`ProtectedRoute`가 올바르게 작동하는지 확인:

1. `loading` 중에는 대기
2. `user`가 없으면 `/login`으로 리디렉션

---

## ✅ 예상 결과

### **수정 후:**
- ✅ 구글 로그인 성공 후 `/sports-hub`로 정상 리디렉션
- ✅ 로그인 페이지로 튕기는 문제 해결
- ✅ 익명 로그인도 정상 작동

---

## 🎯 우선순위

1. **최우선**: `getRedirectResult` 우선 처리 및 즉시 리디렉션
2. **중간**: `onAuthStateChanged` 리디렉션 로직 개선
3. **저장**: `ProtectedRoute` 확인

---

## 💡 추가 고려사항

### **1. `getRedirectResult` 호출 타이밍**
- 페이지 로드 시 즉시 호출해야 함
- `onAuthStateChanged`보다 먼저 실행되어야 함

### **2. 리디렉션 중복 방지**
- `hasRedirectedRef`를 사용하여 중복 리디렉션 방지
- `getRedirectResult`와 `onAuthStateChanged` 모두에서 사용

### **3. 에러 처리**
- `getRedirectResult` 실패 시 사용자에게 명확한 에러 메시지 표시
- 로그인 페이지를 계속 표시

---

## 🚀 다음 단계

1. **코드 수정**: `LoginPage.tsx`에서 `getRedirectResult` 우선 처리
2. **테스트**: 구글 로그인 테스트
3. **검증**: 리디렉션이 정상 작동하는지 확인

---

## ✅ 결론

**구글 로그인 후 로그인 페이지로 튕기는 문제의 주요 원인:**

1. **`getRedirectResult`와 `onAuthStateChanged` 타이밍 문제**: `getRedirectResult`가 완료되기 전에 `onAuthStateChanged`가 실행되어 리디렉션이 안 됨
2. **리디렉션 중복 방지 로직 부족**: `hasRedirectedRef`가 제대로 작동하지 않음

**해결 방법:**
1. `getRedirectResult`를 먼저 처리하고 즉시 리디렉션
2. `onAuthStateChanged` 리디렉션 로직 개선
3. `ProtectedRoute` 확인

**예상 결과:**
- ✅ 구글 로그인 성공 후 `/sports-hub`로 정상 리디렉션
- ✅ 로그인 페이지로 튕기는 문제 해결
- ✅ 익명 로그인도 정상 작동

