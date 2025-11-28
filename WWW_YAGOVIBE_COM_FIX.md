# 🔧 www.yagovibe.com Google Maps 오류 해결

## ❌ 현재 오류

```
RefererNotAllowedMapError
Your site URL to be authorized: https://www.yagovibe.com
```

## ✅ 해결 방법 (단계별)

### 1️⃣ Google Cloud Console 접속

1. **Google Cloud Console 열기**
   - https://console.cloud.google.com 접속
   - 프로젝트: `yago-vibe-spt` 선택

### 2️⃣ Firebase Browser Key 찾기

1. **사용자 인증 정보 메뉴**
   - 왼쪽 메뉴: **"API 및 서비스"** → **"사용자 인증 정보"**
   - 또는 직접 링크: https://console.cloud.google.com/apis/credentials

2. **Firebase Browser Key 찾기**
   - API 키 목록에서 **"Browser key (auto created by Firebase)"** 찾기
   - 또는 키 값이 `AIzaSyCNxoZLo5si4EvLqw1eIUgjf3MzMHYxDY`인 키 클릭

### 3️⃣ 웹사이트 제한사항에 도메인 추가

1. **애플리케이션 제한사항 확인**
   - **"애플리케이션 제한사항"** 섹션 확인
   - **"HTTP 리퍼러(웹사이트)"** 선택되어 있는지 확인

2. **웹사이트 제한사항에 도메인 추가**
   - **"웹사이트 제한사항"** 섹션에서 **"항목 추가"** 클릭
   - 다음 도메인들을 **각각 한 줄씩** 추가:

   ```
   https://www.yagovibe.com/*
   https://yagovibe.com/*
   ```

   **⚠️ 중요:**
   - `www.yagovibe.com`과 `yagovibe.com`은 **별도로** 추가해야 합니다
   - 각 도메인은 **별도의 줄**에 입력
   - `https://` 포함
   - 경로까지 포함하려면 끝에 `/*` 추가
   - `www.yagovibe.com`과 `yagovibe.com`은 **다른 도메인**으로 인식됩니다

3. **저장**
   - **"저장"** 버튼 클릭
   - 변경 사항은 **즉시 적용**됩니다 (최대 5분 소요)

### 4️⃣ 기존 도메인 확인

현재 등록되어 있을 수 있는 도메인:
- `https://yagovibe.vercel.app/*` (이미 있을 가능성 높음)
- `http://localhost:5173/*` (개발 환경)

**추가해야 할 도메인:**
- `https://www.yagovibe.com/*` ⚠️ **필수**
- `https://yagovibe.com/*` ⚠️ **필수**

### 5️⃣ 테스트

1. **브라우저 캐시 삭제**
   - `Ctrl + Shift + Delete` (Windows) 또는 `Cmd + Shift + Delete` (Mac)
   - 또는 시크릿 모드에서 테스트

2. **사이트 접속**
   - `https://www.yagovibe.com/voice-map` 접속
   - 개발자 도구 (F12) → Console 탭
   - `RefererNotAllowedMapError` 오류가 사라졌는지 확인

3. **지도 확인**
   - Google Maps가 정상적으로 로드되는지 확인
   - 지도가 표시되고 인터랙션이 가능한지 확인

## 📋 체크리스트

- [ ] Google Cloud Console 접속
- [ ] Firebase Browser Key 찾기
- [ ] "웹사이트 제한사항"에 `https://www.yagovibe.com/*` 추가
- [ ] "웹사이트 제한사항"에 `https://yagovibe.com/*` 추가
- [ ] 저장
- [ ] 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com/voice-map` 테스트
- [ ] 콘솔 오류 확인 (오류 없어야 함)

## ⚠️ 중요 참고사항

1. **도메인은 정확히 일치해야 합니다**
   - `https://www.yagovibe.com/*` ≠ `https://yagovibe.com/*`
   - 둘 다 별도로 추가해야 합니다

2. **프로토콜 포함**
   - `https://`를 포함해야 합니다

3. **와일드카드 사용**
   - 경로까지 포함하려면 `/*`를 끝에 추가
   - 예: `https://www.yagovibe.com/*`

4. **변경 사항 적용 시간**
   - 즉시 적용되지만, 최대 5분까지 소요될 수 있습니다
   - 브라우저 캐시를 삭제하면 더 빠르게 적용됩니다

## 🎯 예상 결과

도메인을 추가한 후:
- ✅ `RefererNotAllowedMapError` 오류 사라짐
- ✅ `InvalidKeyMapError` 오류 사라짐
- ✅ Google Maps 정상 로드
- ✅ 지도 인터랙션 정상 작동

