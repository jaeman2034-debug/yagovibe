# 🔧 InvalidKeyMapError 최종 해결 가이드

## 📊 현재 상황
- ✅ 스크립트 로드: 성공
- ✅ 지도 초기화: 성공 (Map 객체 생성됨)
- ❌ 실제 렌더링: 실패 (API 키 거부)

**결론**: API 키는 있지만 Google에서 권한을 거부하고 있습니다.

## 🎯 단계별 해결 방법

### Step 1: Google Cloud Console 접속

1. **프로젝트 선택**
   ```
   https://console.cloud.google.com
   → 상단에서 올바른 프로젝트 선택
   (Firebase 프로젝트와 동일한 것이 좋음)
   ```

### Step 2: Maps JavaScript API 활성화 (필수!)

1. **API 라이브러리로 이동**
   ```
   왼쪽 메뉴 > API 및 서비스 > 라이브러리
   ```

2. **Maps JavaScript API 검색 및 활성화**
   ```
   검색창에 "Maps JavaScript API" 입력
   → 클릭
   → "사용 설정" 버튼 클릭
   ```

3. **활성화 확인**
   - "사용 설정됨" 또는 "관리" 버튼이 보이면 활성화된 것
   - "사용 설정" 버튼이 보이면 아직 비활성화

### Step 3: API 키 도메인 제한 설정 (가장 중요!)

1. **API 키 목록으로 이동**
   ```
   API 및 서비스 > 사용자 인증 정보
   ```

2. **API 키 클릭 (편집)**
   - 목록에서 해당 API 키 클릭
   - 또는 키 옆의 연필 아이콘(편집) 클릭

3. **애플리케이션 제한사항 설정**
   ```
   애플리케이션 제한사항:
   → "HTTP 리퍼러(웹사이트)" 선택
   ```

4. **웹사이트 제한사항 추가** ⚠️ 필수!
   
   "웹사이트 제한사항" 섹션에서 "항목 추가"를 클릭하고
   **다음 항목들을 모두 추가**:

   ```
   http://localhost:5178/*
   http://localhost:5179/*
   http://127.0.0.1:5178/*
   http://127.0.0.1:5179/*
   https://localhost:5178/*
   https://localhost:5179/*
   ```

   **⚠️ 중요 포인트**:
   - 각 항목을 한 줄씩 입력
   - `*`는 와일드카드 (모든 경로 허용)
   - 프로토콜 구분 (`http://`, `https://`)
   - 포트 번호 포함 (`5178`, `5179`)

5. **저장 클릭**
   - 하단의 "저장" 또는 "완료" 버튼 클릭
   - 변경사항 적용까지 1-2분 소요될 수 있음

### Step 4: 결제 계정 확인

1. **결제 메뉴로 이동**
   ```
   왼쪽 메뉴 > 결제
   또는
   상단 메뉴 > 결제
   ```

2. **결제 계정 확인**
   - "결제 계정 연결" 또는 "결제 계정" 확인
   - 계정이 없으면 새로 생성/연결
   - Google Maps Platform은 결제 계정 필수
   - (무료 크레딧 $200 제공)

### Step 5: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### Step 6: 브라우저 캐시 클리어

- **강제 새로고침**: `Ctrl + Shift + R`
- 또는 개발자 도구 > Application > Clear storage

## 🔍 빠른 확인 체크리스트

Google Cloud Console에서 다음을 모두 확인하세요:

- [ ] **Maps JavaScript API** - "사용 설정됨" 상태
- [ ] **API 키** - 편집 페이지 열림
- [ ] **애플리케이션 제한사항** - "HTTP 리퍼러(웹사이트)" 선택
- [ ] **웹사이트 제한사항** - 다음 항목 **모두** 포함:
  - [ ] `http://localhost:5178/*`
  - [ ] `http://localhost:5179/*`
  - [ ] `http://127.0.0.1:5178/*`
  - [ ] `http://127.0.0.1:5179/*`
  - [ ] `https://localhost:5178/*`
  - [ ] `https://localhost:5179/*`
- [ ] **저장** 버튼 클릭 완료
- [ ] **결제 계정** 연결됨
- [ ] **개발 서버 재시작** 완료

## 🚨 가장 흔한 실수

1. **웹사이트 제한사항에 항목을 추가하지 않음**
   - "제한 없음"으로 두거나
   - 항목을 추가했지만 저장하지 않음

2. **도메인 형식 오류**
   - `localhost:5179` (프로토콜 없음) ❌
   - `http://localhost:5179` (와일드카드 없음) ❌
   - `http://localhost:5179/*` (올바름) ✅

3. **저장하지 않음**
   - 설정을 변경했지만 저장 버튼을 누르지 않음

## 🔧 API 키 재발급 (최후의 수단)

위 방법이 안 되면:

1. **새 API 키 생성**
   ```
   API 및 서비스 > 사용자 인증 정보
   → "+ 사용자 인증 정보 만들기" > "API 키"
   ```

2. **즉시 설정**
   - Maps JavaScript API 활성화 확인
   - 도메인 제한 설정 (위 Step 3 참고)
   - 저장

3. **.env.local 업데이트**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=새로운_API_키
   ```

4. **서버 재시작**
   ```bash
   npm run dev
   ```

## 📝 디버깅

브라우저 콘솔에서 확인:

```javascript
// 현재 URL 확인
console.log("현재 URL:", window.location.href);
// → https://localhost:5179/voice-map 이어야 함

// API 키 확인 (일부만)
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
console.log("API 키:", apiKey ? apiKey.substring(0, 20) + "..." : "❌ 없음");
```

## ✅ 성공 확인

올바르게 설정되면:
- ✅ InvalidKeyMapError 사라짐
- ✅ 지도가 정상적으로 표시됨
- ✅ 콘솔에 오류 없음

---

**99% 확률로 "웹사이트 제한사항" 설정 문제입니다!**
Google Cloud Console에서 API 키의 웹사이트 제한사항에 `http://localhost:5179/*`와 `https://localhost:5179/*`를 **반드시 추가**하세요!

