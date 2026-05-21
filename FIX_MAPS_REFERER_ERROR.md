# 🗺️ Maps API RefererNotAllowedMapError 해결 가이드

## ✅ 확인된 정보

`.env.production` 파일에서 확인:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw
```

**문제**: `www.yagovibe.com/voice-map`에서 `RefererNotAllowedMapError` 발생

## 🎯 해결 방법

### Step 1: Google Cloud Console에서 Maps API 키 찾기

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **현재 화면 확인**
   - 이미 "사용자 인증 정보" 페이지에 있음
   - "API 키" 섹션에 "Browser key" 하나만 보임
   - Browser key 값: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`

3. **Maps API 키 찾기**

   **⚠️ 중요**: Browser key와 Maps API 키는 **다른 키**입니다!
   - Browser key: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (Firebase용)
   - Maps API key: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` (Maps용)

   **찾는 방법**:
   
   a) **각 키의 "키 표시" 버튼 클릭**
   - "Browser key" 옆 "키 표시" 클릭
   - 키 값이 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`인지 확인
   - 만약 Browser key의 값이 이것과 다르다면, 다른 키를 찾아야 함

   b) **페이지 스크롤하여 더 많은 키 확인**
   - "API 키" 섹션 아래로 스크롤
   - 다른 키가 있는지 확인

   c) **모든 키 하나씩 열어서 확인**
   - 각 키의 "키 표시" 버튼을 클릭하여 키 값 비교

### Step 2: Maps API 키를 찾지 못한 경우

#### 경우 1: Maps API 키가 없는 경우 (새로 생성)

1. **"+ 사용자 인증 정보 만들기" 버튼 클릭**
   - 페이지 상단 파란색 버튼

2. **"API 키" 선택**
   - 드롭다운 메뉴에서 "API 키" 선택

3. **생성된 키 복사**
   - 키 값 복사

4. **키 이름 변경 (편집)**
   - 생성된 키 클릭하여 편집
   - 이름을 "Maps API key"로 변경

5. **.env.production 파일 업데이트**
   ```
   VITE_GOOGLE_MAPS_API_KEY=생성된_새_키_값
   ```

#### 경우 2: Browser key와 동일한 키를 사용하는 경우

만약 Browser key가 Maps API에도 사용된다면:

1. **"Browser key (auto created by Firebase)" 클릭**
   - 편집 화면으로 이동

2. **HTTP 리퍼러 제한 설정**
   - 애플리케이션 제한사항 → "HTTP 리퍼러(웹사이트)" 선택
   - 웹사이트 제한사항에 Maps API 도메인 추가

**⚠️ 하지만**: Browser key의 값이 `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`이고,
Maps API 키는 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`이므로 **다른 키**입니다.
따라서 Maps API 키를 별도로 찾아야 합니다.

### Step 3: HTTP 리퍼러 제한 설정 (가장 중요!)

Maps API 키를 찾은 후:

1. **키 편집**
   - Maps API 키 클릭하여 편집 화면으로 이동

2. **애플리케이션 제한사항 설정**
   - "애플리케이션 제한사항" 섹션에서:
     - **"HTTP 리퍼러(웹사이트)"** 선택
     - (현재 "없음"으로 되어 있다면 이것을 변경해야 함)

3. **웹사이트 제한사항에 도메인 추가**

   다음 항목들을 **한 줄씩** 추가하세요:
   ```
   https://www.yagovibe.com/*
   https://yagovibe.com/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   ```

   **⚠️ 중요 포인트**:
   - 각 항목을 **한 줄씩** 입력
   - `/*` 와일드카드 **반드시** 포함
   - `https://` 또는 `http://` 프로토콜 명시
   - `www.yagovibe.com`과 `yagovibe.com` **둘 다** 추가
   - 앞뒤 공백 없이 입력

4. **저장 버튼 클릭**
   - 화면 하단 또는 상단의 "저장" 버튼 클릭
   - 변경 사항 저장 확인

### Step 4: 설정 전파 대기

- **5-10분 대기** (Google 서버에 설정이 전파되는 시간)
- 때로는 **최대 15분**까지 소요될 수 있음

### Step 5: 브라우저 캐시 삭제 및 테스트

1. **브라우저 캐시 삭제**
   - PC: Ctrl + Shift + Delete
   - 모바일: 브라우저 설정 → 캐시 삭제

2. **시크릿 모드에서 테스트**
   - 새로운 시크릿 창 열기
   - `https://www.yagovibe.com/voice-map` 접속

## 🔍 Maps API 키가 보이지 않는 경우 - 추가 확인

### 확인 사항 1: 다른 프로젝트에 있을 수 있음

1. **프로젝트 선택 드롭다운 클릭**
   - 상단의 "yago-vibe-spt" 클릭

2. **다른 프로젝트 확인**
   - 다른 프로젝트에도 API 키가 있을 수 있음
   - 각 프로젝트에서 "사용자 인증 정보" 확인

### 확인 사항 2: 삭제되었을 수 있음

1. **"삭제된 사용자 인증 정보 복원" 버튼 클릭**
   - 페이지 상단에 있는 버튼

2. **삭제된 키 확인**
   - 최근에 삭제된 키가 있는지 확인
   - `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` 키가 있는지 확인

### 확인 사항 3: 키 이름이 다를 수 있음

- Maps API 키의 이름이 예상과 다를 수 있음
- 예: "Maps API key", "Google Maps JavaScript API key", "YAGO VIBE Maps" 등
- 모든 키를 하나씩 열어서 키 값 확인

## 📝 체크리스트

- [ ] Google Cloud Console 접속
- [ ] "API 키" 섹션 확인
- [ ] 각 키의 "키 표시" 버튼 클릭하여 키 값 확인
- [ ] `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` 키 찾기
- [ ] 키를 찾지 못하면:
  - [ ] 다른 프로젝트 확인
  - [ ] 삭제된 키 복원 시도
  - [ ] 새 API 키 생성 고려
- [ ] 찾은 키 편집
- [ ] HTTP 리퍼러 제한 활성화 ("HTTP 리퍼러(웹사이트)" 선택)
- [ ] `https://www.yagovibe.com/*` 추가
- [ ] `https://yagovibe.com/*` 추가
- [ ] 다른 도메인들 추가
- [ ] 저장 버튼 클릭
- [ ] 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com/voice-map` 테스트

## 💡 중요 참고사항

- **Maps API 키**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`
- **Browser key**: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (다른 키!)
- **프로젝트**: `yago-vibe-spt`
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

---

**이 가이드를 따라 Maps API 키를 찾고 HTTP 리퍼러 제한을 설정하면 오류가 해결됩니다!** 🎉

