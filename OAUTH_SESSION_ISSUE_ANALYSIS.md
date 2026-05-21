# 🔍 OAuth 세션 관리 문제 분석 및 해결 방안

## 📊 문제 분석 결과

### **사용자 분석 확인:**
✅ **정확한 분석입니다!**

1. **OAuth 2.0 클라이언트 ID 유형 불일치 (외부 설정 문제)**
2. **인증 후 최종 리디렉션 처리 실패 (세션 누락) - 코드 문제**

---

## 🛑 발견된 문제점

### **1. 문제: getRedirectResult와 onAuthStateChanged 타이밍 충돌**

**현재 코드 구조:**
```typescript
// LoginPage.tsx
useEffect(() => {
  const handleRedirectResult = async () => {
    const result = await getRedirectResult(auth);
    if (result) {
      // Firestore 프로필 생성...
      navigate("/sports-hub", { replace: true }); // 🔥 즉시 리디렉션
    }
  };
  handleRedirectResult();
}, [navigate]);

// 동시에 실행되는 다른 useEffect
useEffect(() => {
  if (user && !hasRedirectedRef.current) {
    navigate("/sports-hub", { replace: true }); // 🔥 또 다른 리디렉션
  }
}, [user, loading, location.pathname, navigate]);
```

**문제점:**
- `getRedirectResult`가 완료되기 전에 `onAuthStateChanged`가 먼저 실행될 수 있음
- 두 개의 리디렉션이 경쟁 조건(race condition)을 일으킬 수 있음
- `hasRedirectedRef`가 제대로 동기화되지 않을 수 있음

---

### **2. 문제: AuthProvider의 초기 상태 설정 타이밍**

**현재 코드:**
```typescript
// AuthProvider.tsx
useEffect(() => {
  const initialUser = auth.currentUser;
  if (initialUser) {
    setUser(initialUser); // 🔥 초기 상태 설정
  }
  
  const unsub = onAuthStateChanged(auth, async (u) => {
    setUser(u);
    setLoading(false);
    // ...
  });
}, []);
```

**문제점:**
- `auth.currentUser`를 먼저 설정하지만, `getRedirectResult`가 완료되기 전에 실행될 수 있음
- OAuth 리디렉션 후 `auth.currentUser`가 아직 업데이트되지 않았을 수 있음
- `onAuthStateChanged`가 호출되기 전에 초기 상태가 설정되어 세션이 손실될 수 있음

---

### **3. 문제: 세션 Persistence 설정**

**현재 코드:**
```typescript
// firebase.ts
auth = initializeAuth(app, {
  popupRedirectResolver: browserPopupRedirectResolver,
  persistence: indexedDBLocalPersistence, // 🔥 indexedDB 사용
});
```

**문제점:**
- `indexedDBLocalPersistence`가 일부 브라우저(특히 인앱 브라우저)에서 작동하지 않을 수 있음
- Third-party cookie 정책으로 인해 세션이 유지되지 않을 수 있음
- `browserPopupRedirectResolver`와 `indexedDBLocalPersistence`의 조합이 문제를 일으킬 수 있음

---

### **4. 문제: 리디렉션 후 세션 토큰 처리**

**현재 흐름:**
1. Google OAuth 인증 성공
2. Firebase Handler (`/__/auth/handler`)로 리디렉션
3. `getRedirectResult` 호출
4. Firestore 프로필 생성
5. `/sports-hub`로 리디렉션

**문제점:**
- `getRedirectResult`가 완료되기 전에 페이지가 리디렉션될 수 있음
- 세션 토큰이 `onAuthStateChanged`에 전달되기 전에 리디렉션이 발생할 수 있음
- 리디렉션 후 `AuthProvider`가 세션을 복원하지 못할 수 있음

---

## 🛠️ 해결 방안

### **방안 1: getRedirectResult 우선 처리 및 세션 확인 강화**

**수정 사항:**
```typescript
// LoginPage.tsx
useEffect(() => {
  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        // Firestore 프로필 생성...
        
        // 🔥 핵심: 세션이 완전히 설정될 때까지 대기
        await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.uid === result.user.uid) {
              unsubscribe();
              resolve(user);
            }
          });
          
          // 타임아웃 설정 (5초)
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 5000);
        });
        
        // 🔥 세션 확인 후 리디렉션
        hasRedirectedRef.current = true;
        navigate("/sports-hub", { replace: true });
      }
    } catch (error) {
      console.error("❌ [LoginPage] Redirect 결과 처리 실패:", error);
    }
  };
  
  handleRedirectResult();
}, [navigate]);
```

---

### **방안 2: AuthProvider 초기 상태 설정 개선**

**수정 사항:**
```typescript
// AuthProvider.tsx
useEffect(() => {
  // 🔥 초기 상태 설정 제거 - onAuthStateChanged가 먼저 실행되도록 함
  // const initialUser = auth.currentUser;
  // if (initialUser) {
  //   setUser(initialUser);
  // }
  
  const unsub = onAuthStateChanged(auth, async (u) => {
    console.log("🔄 [AuthProvider] onAuthStateChanged 콜백 호출:", {
      hasUser: !!u,
      userUid: u?.uid,
      userEmail: u?.email,
      currentUser: auth.currentUser?.uid, // 🔥 현재 세션 확인
    });
    
    setUser(u);
    setLoading(false);
    
    // 🔥 세션 토큰 확인
    if (u) {
      try {
        const token = await u.getIdToken();
        console.log("✅ [AuthProvider] 세션 토큰 확인:", {
          tokenExists: !!token,
          tokenLength: token?.length,
        });
      } catch (tokenError) {
        console.error("❌ [AuthProvider] 세션 토큰 가져오기 실패:", tokenError);
      }
    }
  });
  
  return () => unsub();
}, []);
```

---

### **방안 3: 세션 Persistence 폴백 강화**

**수정 사항:**
```typescript
// firebase.ts
let persistenceToUse = indexedDBLocalPersistence;

try {
  const isIndexedDBAvailable = typeof indexedDB !== "undefined";
  const isLocalStorageAvailable = typeof localStorage !== "undefined";
  
  // 🔥 인앱 브라우저 감지
  const isInAppBrowser = /kakaotalk|instagram|fb_iab|line|naver/i.test(navigator.userAgent);
  
  if (isInAppBrowser) {
    // 🔥 인앱 브라우저에서는 sessionPersistence 사용 (세션 유지 보장)
    persistenceToUse = browserSessionPersistence;
    console.log("💾 [firebase.ts] 인앱 브라우저 감지 → browserSessionPersistence 사용");
  } else if (isIndexedDBAvailable) {
    persistenceToUse = indexedDBLocalPersistence;
  } else if (isLocalStorageAvailable) {
    persistenceToUse = browserLocalPersistence;
  } else {
    persistenceToUse = browserSessionPersistence;
  }
} catch (pErr) {
  persistenceToUse = browserSessionPersistence;
}
```

---

### **방안 4: 리디렉션 후 세션 복원 확인**

**수정 사항:**
```typescript
// LoginPage.tsx
useEffect(() => {
  // 🔥 리디렉션 후 세션 복원 확인
  if (location.pathname === "/sports-hub" && !user && !loading) {
    console.log("⚠️ [LoginPage] /sports-hub 접근 시 세션 없음 - 세션 복원 시도");
    
    // 🔥 세션 복원 대기 (최대 3초)
    const checkSession = async () => {
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (auth.currentUser) {
          console.log("✅ [LoginPage] 세션 복원 성공");
          return;
        }
      }
      console.warn("⚠️ [LoginPage] 세션 복원 실패 - 로그인 페이지로 리디렉션");
      navigate("/login", { replace: true });
    };
    
    checkSession();
  }
}, [location.pathname, user, loading, navigate]);
```

---

## ✅ 우선순위별 해결 방안

### **최우선: 방안 1 (getRedirectResult 우선 처리)**
- 세션이 완전히 설정될 때까지 대기
- `onAuthStateChanged`와 동기화

### **중간: 방안 2 (AuthProvider 초기 상태 개선)**
- 초기 상태 설정 제거
- `onAuthStateChanged`가 먼저 실행되도록 함

### **저장: 방안 3 (세션 Persistence 폴백)**
- 인앱 브라우저에서 `browserSessionPersistence` 사용
- 세션 유지 보장

### **추가: 방안 4 (리디렉션 후 세션 복원 확인)**
- 리디렉션 후 세션 복원 확인
- 실패 시 로그인 페이지로 리디렉션

---

## 🎯 예상 결과

### **수정 후:**
- ✅ OAuth 리디렉션 후 세션이 완전히 설정될 때까지 대기
- ✅ `getRedirectResult`와 `onAuthStateChanged` 동기화
- ✅ 세션 토큰 확인 및 검증
- ✅ 인앱 브라우저에서 세션 유지 보장

---

## 📝 추가 확인 사항

### **1. Google Cloud Console 확인**
- OAuth 2.0 클라이언트 ID 유형이 **'웹 애플리케이션'**인지 확인
- 다른 유형의 클라이언트 ID가 활성화되어 있지 않은지 확인

### **2. Firebase 콘솔 확인**
- 승인된 도메인 확인
- OAuth 리디렉션 URI 확인

### **3. 브라우저 콘솔 확인**
- 세션 토큰이 제대로 설정되는지 확인
- `onAuthStateChanged`가 정상적으로 호출되는지 확인

---

## 🚀 다음 단계

1. **코드 수정**: 방안 1부터 순차적으로 적용
2. **테스트**: OAuth 로그인 테스트
3. **검증**: 세션 유지 확인
4. **모니터링**: 사용자 피드백 수집

