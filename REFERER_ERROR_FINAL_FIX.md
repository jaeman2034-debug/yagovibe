# 🔧 RefererNotAllowedMapError 최종 해결 가이드

## ❌ 현재 오류
```
RefererNotAllowedMapError
Your site URL to be authorized: https://www.yagovibe.com/voice-map
```

## 🔍 문제 분석

Google Cloud Console에 `https://www.yagovibe.com/*`이 등록되어 있음에도 오류가 발생하는 경우:

### 가능한 원인:
1. **변경 사항 미적용**: Google Cloud Console의 변경 사항이 아직 적용되지 않음 (최대 5분 소요)
2. **브라우저 캐시**: 브라우저가 이전 API 키 설정을 캐시하고 있음
3. **API 키 불일치**: 실제 사용 중인 API 키와 Google Cloud Console에서 수정한 키가 다를 수 있음
4. **API 제한사항**: API 키의 "API 제한사항"에서 Maps JavaScript API가 선택되지 않았을 수 있음

## ✅ 해결 방법

### 1️⃣ Google Cloud Console에서 API 키 재확인

1. **API 키 찾기**
   - Google Cloud Console → "API 및 서비스" → "사용자 인증 정보"
   - "Browser key (auto created by Firebase)" 클릭

2. **웹사이트 제한사항 재확인**
   - 다음 도메인이 **정확히** 등록되어 있는지 확인:
     ```
     https://www.yagovibe.com/*
     https://yagovibe.com/*
     https://yagovibe.vercel.app/*
     ```
   - **중요**: `https://www.yagovibe.com` (와일드카드 없음)과 `https://www.yagovibe.com/*` (와일드카드 있음) 둘 다 필요할 수 있습니다

3. **API 제한사항 확인**
   - "API 제한사항" 섹션 확인
   - "키 사용량을 특정 API로 제한" 선택
   - "Maps JavaScript API"가 체크되어 있는지 확인
   - 만약 "제한 없음"으로 되어 있다면, "Maps JavaScript API"를 명시적으로 선택

4. **저장**
   - 모든 변경 사항 저장
   - 저장 후 **5분 대기** (변경 사항 적용 시간)

### 2️⃣ 브라우저 캐시 완전 삭제

1. **개발자 도구 열기**
   - `F12` 또는 `Ctrl + Shift + I`

2. **캐시 삭제**
   - `Ctrl + Shift + Delete` (Windows) 또는 `Cmd + Shift + Delete` (Mac)
   - "캐시된 이미지 및 파일" 선택
   - "전체 기간" 선택
   - "데이터 삭제" 클릭

3. **하드 리프레시**
   - `Ctrl + F5` (Windows) 또는 `Cmd + Shift + R` (Mac)
   - 또는 개발자 도구 열린 상태에서 새로고침 버튼 우클릭 → "캐시 비우기 및 강력 새로고침"

### 3️⃣ 시크릿 모드에서 테스트

1. **시크릿 창 열기**
   - `Ctrl + Shift + N` (Chrome) 또는 `Ctrl + Shift + P` (Firefox)

2. **사이트 접속**
   - `https://www.yagovibe.com/voice-map` 접속

3. **오류 확인**
   - 개발자 도구 (F12) → Console 탭
   - `RefererNotAllowedMapError`가 사라졌는지 확인

### 4️⃣ API 키 확인

프로젝트에서 실제로 사용 중인 API 키를 확인:

1. **브라우저 콘솔에서 확인**
   ```javascript
   // 콘솔에서 실행
   console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
   ```

2. **Google Cloud Console에서 해당 키 확인**
   - 확인된 API 키가 Google Cloud Console의 "Browser key (auto created by Firebase)"와 일치하는지 확인

### 5️⃣ Maps JavaScript API 활성화 확인

1. **API 라이브러리 확인**
   - Google Cloud Console → "API 및 서비스" → "라이브러리"
   - "Maps JavaScript API" 검색
   - "사용 설정" 상태인지 확인
   - 만약 "사용 설정" 버튼이 보이면 클릭하여 활성화

### 6️⃣ 결제 계정 확인

1. **결제 설정 확인**
   - Google Cloud Console → "결제"
   - 결제 계정이 연동되어 있는지 확인
   - 연동되지 않았다면 "결제 계정 연결" 클릭

## 🔄 단계별 체크리스트

- [ ] Google Cloud Console에서 API 키 웹사이트 제한사항 재확인
- [ ] `https://www.yagovibe.com/*`이 정확히 등록되어 있는지 확인
- [ ] API 제한사항에서 "Maps JavaScript API" 선택 확인
- [ ] 저장 후 5분 대기
- [ ] 브라우저 캐시 완전 삭제
- [ ] 하드 리프레시 (`Ctrl + F5`)
- [ ] 시크릿 모드에서 테스트
- [ ] Maps JavaScript API 활성화 확인
- [ ] 결제 계정 연동 확인

## 🆘 여전히 오류가 발생하면

1. **다른 API 키 사용 확인**
   - Firebase Console에서 다른 API 키가 생성되어 있는지 확인
   - 프로젝트에서 실제로 사용 중인 API 키가 무엇인지 확인

2. **Google Cloud Console 로그 확인**
   - Google Cloud Console → "API 및 서비스" → "대시보드"
   - Maps JavaScript API 사용량 확인
   - 오류 로그 확인

3. **Firebase Console 확인**
   - Firebase Console → "프로젝트 설정" → "일반"
   - "내 앱" 섹션에서 웹 앱의 API 키 확인
   - 이 키가 Google Cloud Console에서 수정한 키와 일치하는지 확인

## 📝 참고

- Google Cloud Console의 변경 사항은 **최대 5분** 내에 적용됩니다
- 브라우저 캐시를 삭제하지 않으면 이전 설정이 계속 사용될 수 있습니다
- API 키의 "API 제한사항"에서 Maps JavaScript API를 명시적으로 선택하는 것이 좋습니다

