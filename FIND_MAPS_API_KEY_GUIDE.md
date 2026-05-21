# 🔍 Google Cloud Console에서 Maps API 키 찾는 방법

## 📊 현재 상황

스크린샷에서 보이는 것:
- **Browser key (auto created by Firebase)**: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
  - 이것은 **Firebase Authentication용 API 키**입니다
  - Google Maps API와는 **다른 키**입니다

찾아야 하는 키:
- **Maps API 키**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`
  - 이것은 **Google Maps JavaScript API용 키**입니다

## ✅ 단계별 찾는 방법

### Step 1: Google Cloud Console 접속

1. **브라우저에서 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **프로젝트 확인**
   - 상단에 "yago-vibe-spt" 프로젝트가 선택되어 있는지 확인
   - 아니면 프로젝트 선택 드롭다운에서 "yago-vibe-spt" 선택

### Step 2: API 키 목록 확인

1. **"사용자 인증 정보" (Credentials) 페이지 확인**
   - 이미 올바른 페이지에 있습니다
   - 왼쪽 메뉴에서 "사용자 인증 정보"가 선택되어 있어야 합니다

2. **"API 키" (API Keys) 섹션 찾기**
   - 페이지 중간에 "API 키" 섹션이 있습니다
   - 현재 보이는 것: "Browser key (auto created by Firebase)" 하나만 표시됨

### Step 3: Maps API 키 찾기 (두 가지 경우)

#### 경우 1: API 키 목록에 Maps API 키가 있는 경우

1. **API 키 목록에서 확인**
   - "API 키" 섹션에서 여러 개의 키가 있을 수 있습니다
   - 각 키의 이름을 확인:
     - "Maps API key"
     - "Google Maps API key"
     - 또는 사용자가 직접 만든 이름
   - **키 값이 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`인 것을 찾기**

2. **키 값 확인 방법**
   - 각 API 키 옆에 있는 **"키 표시"** 버튼 클릭
   - 또는 키 행을 클릭하여 상세 페이지로 이동

#### 경우 2: Maps API 키가 없는 경우 (생성 필요)

만약 API 키 목록에 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`가 없다면, 이 키는:
- 삭제되었거나
- 다른 프로젝트에 속해있거나
- 아직 생성되지 않았을 수 있습니다

**해결 방법:**
1. **새 API 키 생성**
   - "+ 사용자 인증 정보 만들기" 버튼 클릭
   - "API 키" 선택
   - 생성된 키 복사

2. **기존 키 사용**
   - "Browser key"를 Maps API에도 사용할 수 있음
   - 하지만 보안상 별도의 키를 만드는 것을 권장

### Step 4: Maps API 키 편집

1. **API 키 클릭**
   - 목록에서 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` 키 찾기
   - 키 이름 또는 "편집" 아이콘(연필 아이콘) 클릭

2. **편집 화면으로 이동**
   - 키의 상세 설정 페이지가 열립니다

## 🔍 Maps API 키를 찾는 다른 방법

### 방법 1: 키 값으로 검색 (가능하면)

1. **"API 키" 섹션에서 확인**
   - 각 키 옆에 "키 표시" 버튼 클릭
   - `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`와 일치하는 키 찾기

### 방법 2: 이름으로 찾기

1. **키 이름 확인**
   - Maps API 키는 보통 다음 이름 중 하나일 수 있습니다:
     - "Maps API key"
     - "Google Maps JavaScript API key"
     - "YAGO VIBE Maps"
     - 또는 사용자가 직접 설정한 이름

2. **"Browser key" 재사용**
   - "Browser key (auto created by Firebase)"도 Maps API에 사용 가능
   - 하지만 Firebase와 Maps를 구분하기 위해 별도 키 생성 권장

### 방법 3: .env.production 파일 확인

1. **프로젝트 폴더에서 확인**
   ```
   .env.production 파일 열기
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw
   ```
   - 이 키가 실제로 존재하는지 확인

2. **Google Cloud Console에서 검색**
   - 모든 API 키를 하나씩 열어서 키 값과 비교

## ⚠️ 중요 확인 사항

### 1. API 키가 실제로 존재하는지 확인

만약 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` 키를 찾을 수 없다면:

1. **.env.production 파일 확인**
   - 실제로 이 키가 설정되어 있는지 확인

2. **다른 프로젝트에 있을 수 있음**
   - 상단 프로젝트 선택 드롭다운에서 다른 프로젝트 확인

3. **키가 삭제되었을 수 있음**
   - "삭제된 사용자 인증 정보 복원" 버튼 클릭하여 확인

### 2. Browser key를 Maps API에 사용하는 경우

만약 Maps API 키를 찾을 수 없다면, **Browser key를 Maps API에도 사용**할 수 있습니다:

1. **Browser key 편집**
   - "Browser key (auto created by Firebase)" 클릭

2. **HTTP 리퍼러 제한 설정**
   - 애플리케이션 제한사항 → HTTP 리퍼러(웹사이트) 선택
   - 웹사이트 제한사항에 도메인 추가

## 📝 체크리스트

- [ ] Google Cloud Console 접속 (`https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt`)
- [ ] 프로젝트가 "yago-vibe-spt"로 선택되어 있는지 확인
- [ ] "API 키" 섹션 확인
- [ ] `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` 키 찾기
- [ ] 키를 찾지 못하면:
  - [ ] .env.production 파일에서 실제 키 값 확인
  - [ ] 다른 프로젝트에서 찾기
  - [ ] 삭제된 키 복원 시도
  - [ ] 또는 Browser key 사용 고려

## 💡 팁

1. **키 값 일부만 확인**
   - Google Cloud Console에서 키 값의 처음 몇 자만 표시될 수 있음
   - "키 표시" 버튼을 클릭하여 전체 키 확인

2. **여러 프로젝트 확인**
   - 같은 Google 계정으로 여러 프로젝트를 사용하는 경우
   - 다른 프로젝트에도 API 키가 있을 수 있음

3. **키 이름 변경**
   - 찾은 후에 키 이름을 "Maps API key"로 변경하면 나중에 찾기 쉬움

---

**이 가이드를 따라 Maps API 키를 찾을 수 있습니다!** 🎉

