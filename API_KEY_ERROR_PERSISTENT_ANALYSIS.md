# 🔍 Firebase API 키 오류 지속 원인 분석

## ❌ 현재 상황

### 오류 메시지
```
FirebaseError: Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

### 확인된 사항
- ✅ `signInWithPopup` 정상 호출됨
- ✅ `.env.local` 파일 업데이트 완료
- ✅ 재빌드 및 재배포 완료
- ❌ 여전히 `auth/api-key-not-valid` 오류 발생

---

## 🔍 가능한 원인

### 1. 브라우저 캐시 문제 (가장 가능성 높음)

**문제**: 브라우저가 이전에 빌드된 JavaScript 파일을 캐시하고 있을 수 있습니다.

**해결 방법**:
1. **하드 새로고침**: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
2. **브라우저 캐시 삭제**:
   - Chrome: 설정 → 개인정보 및 보안 → 인터넷 사용 기록 삭제
   - "캐시된 이미지 및 파일" 선택
   - 삭제
3. **시크릿 모드에서 테스트**:
   - Chrome: `Ctrl + Shift + N` (Windows) / `Cmd + Shift + N` (Mac)
   - 시크릿 창에서 `https://yagovibe.com/login` 접속
   - Google 로그인 테스트

---

### 2. 빌드된 파일에 이전 API 키가 포함됨

**문제**: 빌드 시점에 환경 변수가 제대로 주입되지 않았을 수 있습니다.

**확인 방법**:
1. **빌드 로그 확인**:
   ```
   ✅ [vite.config.ts] .env.local에서 API 키 로드: AIzaSyCNxoZ...
   ```
   이 메시지가 보이면 API 키가 로드된 것입니다.

2. **빌드된 파일 확인**:
   - `dist/assets/main-*.js` 파일에서 API 키 검색
   - 새로운 API 키(`AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`)가 포함되어 있는지 확인

**해결 방법**:
```bash
# dist 폴더 삭제 후 재빌드
Remove-Item -Recurse -Force dist
npm run build
firebase deploy --only hosting
```

---

### 3. Google Cloud Console API 키 제한 설정 문제

**문제**: API 키가 웹사이트 제한사항에 포함되어 있지만, 다른 제한 설정으로 인해 차단될 수 있습니다.

**확인 사항**:
1. **API 제한사항 확인**:
   - Google Cloud Console → APIs & Services → Credentials
   - API 키 클릭
   - "API 제한사항" 섹션 확인
   - 다음 API들이 활성화되어 있는지 확인:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API

2. **API 키 상태 확인**:
   - API 키가 "활성화" 상태인지 확인
   - "비활성화" 상태라면 활성화

---

### 4. Firebase Console의 API 키와 Google Cloud Console의 API 키 불일치

**문제**: Firebase Console에서 보는 API 키와 Google Cloud Console에서 편집 중인 API 키가 다를 수 있습니다.

**확인 방법**:
1. **Firebase Console에서 API 키 확인**:
   ```
   Firebase Console → 프로젝트 설정 → 일반
   → 웹 앱 → Firebase SDK snippet
   → apiKey 값 확인
   ```

2. **Google Cloud Console에서 API 키 확인**:
   ```
   Google Cloud Console → APIs & Services → Credentials
   → "Browser key (auto created by Firebase)" 클릭
   → API 키 값 확인
   ```

3. **일치 여부 확인**:
   - 두 값이 정확히 일치해야 함
   - 일치하지 않으면 Google Cloud Console에서 올바른 API 키를 편집해야 함

---

## ✅ 해결 방법 (우선순위별)

### 1순위: 브라우저 캐시 삭제 및 하드 새로고침

1. **하드 새로고침**: `Ctrl + Shift + R`
2. **브라우저 캐시 삭제**
3. **시크릿 모드에서 테스트**

### 2순위: dist 폴더 삭제 후 재빌드

```bash
# dist 폴더 삭제
Remove-Item -Recurse -Force dist

# 재빌드
npm run build

# 재배포
firebase deploy --only hosting
```

### 3순위: Google Cloud Console API 제한사항 확인

1. **API 제한사항** 섹션에서 다음 API 활성화 확인:
   - Identity Toolkit API
   - Firebase Authentication API

2. **API 키 상태** 확인:
   - "활성화" 상태인지 확인

### 4순위: Firebase Console과 Google Cloud Console API 키 일치 확인

1. **Firebase Console**에서 API 키 확인
2. **Google Cloud Console**에서 동일한 API 키 편집 중인지 확인
3. **일치하지 않으면** 올바른 API 키로 변경

---

## 📋 체크리스트

### 즉시 확인
- [ ] 브라우저 하드 새로고침 (`Ctrl + Shift + R`)
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드에서 테스트

### 빌드 확인
- [ ] `dist` 폴더 삭제
- [ ] `npm run build` 재실행
- [ ] 빌드 로그에서 API 키 로드 확인
- [ ] `firebase deploy --only hosting` 재실행

### Google Cloud Console 확인
- [ ] API 제한사항에서 Identity Toolkit API 활성화 확인
- [ ] API 제한사항에서 Firebase Authentication API 활성화 확인
- [ ] API 키 상태가 "활성화"인지 확인

### Firebase Console 확인
- [ ] Firebase Console의 API 키와 Google Cloud Console의 API 키 일치 확인

---

## ✅ 완료

가장 가능성 높은 원인은 **브라우저 캐시**입니다. 하드 새로고침(`Ctrl + Shift + R`) 또는 시크릿 모드에서 테스트해보세요.

그래도 해결되지 않으면 `dist` 폴더를 삭제하고 재빌드하세요.

