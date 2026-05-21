# 🔍 Maps API 키 찾기 가이드

## ✅ 확인된 정보

### Browser key (Firebase Authentication용)
- **키 값**: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- **용도**: Firebase Authentication
- **이것은 Maps API 키가 아닙니다!**

### Maps API 키 (찾아야 하는 키)
- **키 값**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`
- **용도**: Google Maps JavaScript API
- **파일**: `.env.production`에 설정됨
- **현재 상태**: Google Cloud Console에서 찾아야 함

## 🎯 두 키가 다릅니다!

Browser key와 Maps API 키는 **완전히 다른 키**입니다:
- Browser key: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (Firebase용)
- Maps API key: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` (Maps용)

## 🔍 Maps API 키 찾는 방법

### Step 1: API 키 목록에서 다른 키 찾기

1. **Google Cloud Console에서 "API 키" 섹션 확인**
   - 현재 "Browser key" 하나만 보일 수 있음
   - **페이지를 아래로 스크롤**하여 더 많은 키가 있는지 확인

2. **각 키의 "키 표시" 버튼 클릭**
   - 모든 API 키를 하나씩 열어서 확인
   - 키 값이 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`인지 확인

### Step 2: Maps API 키를 찾지 못한 경우

#### 경우 1: 다른 프로젝트에 있을 수 있음

1. **프로젝트 선택 드롭다운 클릭**
   - 상단의 "yago-vibe-spt" 클릭

2. **다른 프로젝트 확인**
   - 다른 프로젝트에도 API 키가 있을 수 있음
   - 각 프로젝트에서 "사용자 인증 정보" 확인

#### 경우 2: 삭제되었을 수 있음

1. **"삭제된 사용자 인증 정보 복원" 버튼 클릭**
   - 페이지 상단에 있는 버튼

2. **삭제된 키 확인**
   - 최근에 삭제된 키가 있는지 확인
   - `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` 키가 있는지 확인

#### 경우 3: 새로 생성해야 함

Maps API 키를 찾을 수 없다면 새로 생성해야 합니다:

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

## 🚨 현재 상황 요약

- ✅ Browser key 확인: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- ❓ Maps API 키 찾기 필요: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`
- 🎯 목표: Maps API 키를 찾아서 HTTP 리퍼러 제한 설정

## 📝 다음 단계

1. **Google Cloud Console에서 Maps API 키 찾기**
   - API 키 목록 스크롤
   - 각 키의 "키 표시" 버튼 클릭하여 확인
   - `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw` 키 찾기

2. **찾지 못하면**
   - 다른 프로젝트 확인
   - 삭제된 키 복원 시도
   - 또는 새 API 키 생성

3. **Maps API 키를 찾은 후**
   - HTTP 리퍼러 제한 설정
   - `https://www.yagovibe.com/*` 등 도메인 추가
   - 저장 후 테스트

---

**Browser key와 Maps API 키를 구분하여 찾는 것이 중요합니다!** 🎯

