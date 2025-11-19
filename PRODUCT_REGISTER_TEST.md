# 🛒 상품 등록 테스트 가이드

## ✅ 필요한 에뮬레이터

상품 등록 테스트를 위해 다음 에뮬레이터가 모두 켜져 있어야 합니다:

### 필수 에뮬레이터:
1. **Storage** ❌ (현재 OFF - **필수!**)
   - 이미지 업로드용
   - 포트: 9199

2. **Firestore** ✅ (현재 ON)
   - 상품 데이터 저장용
   - 포트: 8080

3. **Auth** ✅ (현재 ON)
   - 사용자 인증용
   - 포트: 9099

4. **Functions** ✅ (현재 ON)
   - AI 이미지 분석용
   - 포트: 5003

## 🔧 해결 방법

### 방법 1: 에뮬레이터 재시작 (권장)

현재 에뮬레이터를 종료하고 다시 시작하면 Storage도 함께 시작됩니다:

```bash
# 현재 에뮬레이터 종료 (Ctrl+C)
# 그 다음:
firebase emulators:start
```

이렇게 하면 `firebase.json`에 설정된 모든 에뮬레이터가 시작됩니다:
- Functions ✅
- Firestore ✅
- Storage ✅ (이제 시작됨!)
- Auth ✅

### 방법 2: Storage만 명시적으로 시작

```bash
firebase emulators:start --only storage,firestore,auth,functions
```

## 📋 테스트 체크리스트

### 에뮬레이터 상태:
- [ ] Storage: ON (포트 9199)
- [ ] Firestore: ON (포트 8080)
- [ ] Auth: ON (포트 9099)
- [ ] Functions: ON (포트 5003)

### 상품 등록 테스트:
- [ ] 이미지 선택
- [ ] 이미지 업로드 성공
- [ ] AI 분석 결과 표시
- [ ] Firestore에 상품 저장 확인
- [ ] 상품 목록에 표시 확인

## 🚀 테스트 순서

1. **에뮬레이터 재시작**
   ```bash
   firebase emulators:start
   ```

2. **브라우저에서 접속**
   - `http://localhost:5173/market/create` 또는 상품 등록 페이지

3. **상품 등록 테스트**
   - 이미지 선택
   - 제목, 가격 입력
   - 등록 버튼 클릭

4. **결과 확인**
   - Emulator UI에서 Storage 확인: `http://127.0.0.1:4000`
   - Firestore에서 `marketProducts` 컬렉션 확인

## 💡 팁

Storage 에뮬레이터가 켜지지 않으면:
1. `firebase.json`에서 Storage 포트 확인 (9199)
2. 포트 충돌 확인: `netstat -ano | findstr :9199`
3. 에뮬레이터 재시작

