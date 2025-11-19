# 🔄 에뮬레이터 재시작 가이드

## ❌ 현재 상태

Emulator UI에서 확인:
- ✅ Storage: ON (포트 9199)
- ❌ Firestore: OFF
- ❌ Auth: OFF
- ❌ Functions: OFF

## ✅ 해결 방법

### 방법 1: 모든 에뮬레이터 재시작 (권장)

현재 실행 중인 에뮬레이터를 종료하고 다시 시작:

```bash
# 터미널에서 Ctrl+C로 현재 에뮬레이터 종료
# 그 다음:
firebase emulators:start
```

이렇게 하면 `firebase.json`에 설정된 모든 에뮬레이터가 자동으로 시작됩니다.

### 방법 2: 필요한 에뮬레이터만 명시적으로 시작

```bash
firebase emulators:start --only storage,firestore,auth,functions
```

## 📋 시작될 에뮬레이터

`firebase.json` 설정에 따라 다음이 시작됩니다:

- ✅ Storage (포트 9199)
- ✅ Firestore (포트 8080)
- ✅ Auth (포트 9099)
- ✅ Functions (포트 5001)
- ✅ UI (포트 4001)

## 🎯 예상 결과

재시작 후 Emulator UI (`http://127.0.0.1:4001`)에서:
- ✅ Storage: ON
- ✅ Firestore: ON
- ✅ Auth: ON
- ✅ Functions: ON

모두 ON으로 표시되어야 합니다!

## 🛒 상품 등록 테스트 준비

모든 에뮬레이터가 ON이면:
1. ✅ 로그인 가능 (Auth)
2. ✅ 이미지 업로드 가능 (Storage)
3. ✅ AI 분석 실행 가능 (Functions)
4. ✅ 상품 데이터 저장 가능 (Firestore)

---

**💡 에뮬레이터를 재시작하면 모든 설정이 자동으로 적용됩니다!**

