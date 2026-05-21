# 🔍 Google Cloud Console에서 Maps API 키 찾는 방법 - 단계별 가이드

## 📊 현재 상황 분석

스크린샷에서 확인된 정보:
- **Browser key (auto created by Firebase)**: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
  - 이것은 **Firebase Authentication용 API 키**입니다
  - Google Maps API와는 **별도의 키**입니다

찾아야 하는 키:
- **Maps API 키**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`
  - 이것은 **Google Maps JavaScript API용 키**입니다

## ✅ 단계별 찾는 방법 (스크린샷 기준)

### Step 1: 현재 페이지 확인

이미 올바른 페이지에 있습니다!
- 페이지 제목: **"사용자 인증 정보" (Credentials)**
- 왼쪽 메뉴: **"사용자 인증 정보"**가 선택되어 있음
- 프로젝트: **"yago-vibe-spt"**

### Step 2: API 키 섹션 확인

1. **"API 키" (API Keys) 섹션 찾기**
   - 페이지 중간에 "API 키" 섹션이 있습니다
   - 현재 보이는 키: "Browser key (auto created by Firebase)" 하나만 표시됨

2. **더 많은 키가 있을 수 있음**
   - 페이지를 아래로 스크롤하여 더 많은 키가 있는지 확인
   - 또는 다른 페이지에 Maps API 키가 있을 수 있음

### Step 3: Maps API 키 찾기 (3가지 방법)

#### 방법 1: 키 값으로 직접 찾기

1. **각 API 키 옆 "키 표시" 버튼 클릭**
   - "Browser key (auto created by Firebase)" 옆에 있는 **"키 표시"** 버튼 클릭
   - 키 값이 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`인지 확인

2. **다른 키가 있다면**
   - "API 키" 섹션에 여러 키가 있을 수 있음
   - 각 키마다 "키 표시" 버튼을 클릭하여 키 값 확인

#### 방법 2: 이름으로 찾기

1. **키 이름 확인**
   - Maps API 키는 보통 다음과 같은 이름일 수 있습니다:
     - "Maps API key"
     - "Google Maps JavaScript API key"
     - "YAGO VIBE Maps"
     - 또는 사용자가 직접 만든 이름

2. **현재 보이는 키 확인**
   - "Browser key (auto created by Firebase)" - 이것은 Firebase용
   - 다른 키 이름이 있는지 확인

#### 방법 3: 새로 생성하기

만약 Maps API 키를 찾을 수 없다면:

1. **"+ 사용자 인증 정보 만들기" 버튼 클릭**
   - 페이지 상단에 있는 파란색 버튼

2. **"API 키" 선택**
   - 드롭다운 메뉴에서 "API 키" 선택

3. **키 이름 설정**
   - 생성된 키의 이름을 "Maps API key"로 변경 (편집)

4. **HTTP 리퍼러 제한 설정**
   - 편집 화면에서:
     - 애플리케이션 제한사항 → "HTTP 리퍼러(웹사이트)" 선택
     - 웹사이트 제한사항에 도메인 추가

### Step 4: Browser key를 Maps API에도 사용하기 (권장하지 않음)

만약 Maps API 전용 키를 찾을 수 없다면:

1. **"Browser key (auto created by Firebase)" 클릭**
   - 키 이름 또는 행을 클릭하여 편집 화면으로 이동

2. **HTTP 리퍼러 제한 설정**
   - 애플리케이션 제한사항 → "HTTP 리퍼러(웹사이트)" 선택
   - 웹사이트 제한사항에 Maps API 도메인도 추가

⚠️ **주의**: Firebase와 Maps를 같은 키로 사용하는 것은 보안상 권장하지 않습니다.

## 🔍 추가 확인 방법

### 1. .env.production 파일 확인

프로젝트 폴더에서 실제로 사용 중인 키 확인:

```
.env.production 파일 열기
VITE_GOOGLE_MAPS_API_KEY 확인
```

### 2. 다른 프로젝트 확인

1. **프로젝트 선택 드롭다운 클릭**
   - 상단의 "yago-vibe-spt" 클릭

2. **다른 프로젝트 확인**
   - 다른 프로젝트에도 API 키가 있을 수 있음

### 3. 삭제된 키 복원

1. **"삭제된 사용자 인증 정보 복원" 버튼 클릭**
   - 페이지 상단에 있는 버튼

2. **삭제된 키 확인**
   - 최근에 삭제된 키가 있는지 확인

## 📝 체크리스트

- [ ] Google Cloud Console 접속 완료 (이미 접속됨)
- [ ] "API 키" 섹션 확인
- [ ] "Browser key" 옆 "키 표시" 버튼 클릭하여 키 값 확인
- [ ] `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` 키 찾기
- [ ] 키를 찾지 못하면:
  - [ ] .env.production 파일에서 실제 키 값 확인
  - [ ] 다른 프로젝트에서 찾기
  - [ ] 삭제된 키 복원 시도
  - [ ] 또는 새 API 키 생성

## 💡 팁

1. **키 값 부분 확인**
   - Google Cloud Console에서는 키의 처음 몇 자만 보일 수 있음
   - "키 표시" 버튼을 클릭하여 전체 키 확인

2. **키 이름 변경**
   - 찾은 후에 키 이름을 "Maps API key"로 변경하면 나중에 찾기 쉬움

3. **키 복사**
   - "키 표시" 버튼을 클릭하면 키 옆에 복사 아이콘이 나타남
   - 클릭하여 키 복사

---

**이 가이드를 따라 Maps API 키를 찾을 수 있습니다!** 🎉

