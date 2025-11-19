# 🔥 모든 에뮬레이터 시작 가이드

## ❌ 현재 상태

- Storage: ON ✅
- Firestore: OFF ❌ (필요!)
- Auth: OFF ❌ (필요!)
- Functions: OFF ❌ (필요!)

## ✅ 상품 등록 테스트에 필요한 에뮬레이터

### 필수:
1. **Storage** ✅ (이미 켜져 있음)
   - 이미지 업로드용

2. **Firestore** ❌ (켜야 함!)
   - 상품 데이터 저장용
   - 포트: 8080

3. **Auth** ❌ (켜야 함!)
   - 사용자 인증용
   - 포트: 9099

4. **Functions** ❌ (켜야 함!)
   - AI 이미지 분석용
   - 포트: 5001

## 🚀 해결 방법

### 방법 1: 모든 에뮬레이터 한 번에 시작 (권장)

현재 에뮬레이터를 종료하고 다시 시작:

```bash
# 현재 에뮬레이터 종료 (Ctrl+C)
# 그 다음:
firebase emulators:start
```

이렇게 하면 `firebase.json`에 설정된 모든 에뮬레이터가 시작됩니다:
- ✅ Storage (포트 9199)
- ✅ Firestore (포트 8080)
- ✅ Auth (포트 9099)
- ✅ Functions (포트 5001)

### 방법 2: 필요한 에뮬레이터만 명시적으로 시작

```bash
firebase emulators:start --only storage,firestore,auth,functions
```

## 📋 테스트 전 체크리스트

### 에뮬레이터 상태 확인:
- [ ] Storage: ON (포트 9199)
- [ ] Firestore: ON (포트 8080)
- [ ] Auth: ON (포트 9099)
- [ ] Functions: ON (포트 5001)

### 상품 등록 테스트:
- [ ] 로그인 (Auth 필요)
- [ ] 이미지 선택 및 업로드 (Storage 필요)
- [ ] AI 분석 실행 (Functions 필요)
- [ ] 상품 데이터 저장 (Firestore 필요)

## 🎯 예상 결과

에뮬레이터를 재시작하면 Emulator UI에서:
- ✅ Storage: ON
- ✅ Firestore: ON
- ✅ Auth: ON
- ✅ Functions: ON

모두 ON으로 표시되어야 합니다!

