# 🔧 Vite + Firebase ESM 모듈 해석 문제 해결

## 🚨 문제

```
Uncaught (in promise) TypeError: Failed to resolve module specifier 'firebase/firestore'
```

이 에러는 Vite가 Firebase ESM 모듈을 사전 번들링하지 못해서 발생합니다.

---

## ✅ 해결 방법

### 1. vite.config.ts에 `firebase/functions` 추가

```typescript
optimizeDeps: {
  include: [
    "firebase/app",
    "firebase/auth",
    "firebase/firestore",
    "firebase/functions", // 🔥 추가됨
    "firebase/storage",
  ],
  esbuildOptions: {
    target: "es2020", // 🔥 ESM 모듈 해석 개선
  },
},
```

### 2. Firebase 패키지 버전 확인

```bash
npm list firebase
```

최신 버전이 아니면:
```bash
npm install firebase@latest
```

### 3. Dev 서버 완전 재시작 (필수)

```bash
# 현재 서버 종료 (Ctrl+C)
npm run dev
```

⚠️ **하드 리프레시로는 해결 안 됨. 반드시 서버 재시작 필요**

---

## ✅ 해결 후 확인

- [ ] 콘솔에 `Failed to resolve module specifier` 에러 사라짐
- [ ] Firestore 스냅샷 정상 로드
- [ ] 승인팀 생성 시 버튼 즉시 활성화
