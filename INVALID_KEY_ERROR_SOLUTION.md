# 🔍 InvalidKeyMapError 원인 및 해결 방법

## 현재 상황 분석

콘솔 메시지를 보면:
- ✅ "Google Maps API 로드 완료!" - 스크립트는 정상 로드
- ✅ "지도 초기화 시작..." - 초기화 시도
- ✅ "지도 초기화 성공!" - Map 객체 생성 성공
- ❌ "InvalidKeyMapError" - 실제 렌더링 시점에 API 키 거부

**결론**: API 키는 로드되지만, Google에서 권한을 거부하고 있습니다.

## 🎯 가능한 원인 5가지

### 1️⃣ Maps JavaScript API가 활성화되지 않음 (가장 흔한 원인)
### 2️⃣ API 키의 도메인 제한 설정 문제 (두 번째로 흔한 원인)
### 3️⃣ API 키가 유효하지 않음 (삭제/비활성화됨)
### 4️⃣ 결제 계정 미연동
### 5️⃣ API 키가 다른 프로젝트의 것임

## ✅ 단계별 해결 방법

### Step 1: Google Cloud Console 확인

1. **프로젝트 선택**
   - https://console.cloud.google.com 접속
   - 상단에서 올바른 프로젝트 선택 (Firebase 프로젝트와 동일한 것이 좋음)

2. **Maps JavaScript API 활성화** ⚠️ 필수!
   ```
   API 및 서비스 > 라이브러리
   → "Maps JavaScript API" 검색
   → "사용 설정" 클릭
   ```
   
   **확인 방법**: "사용 설정됨" 또는 "관리" 버튼이 보이면 활성화된 것

3. **API 키 확인 및 설정**
   ```
   API 및 서비스 > 사용자 인증 정보
   → API 키 목록에서 해당 키 찾기
   → 키를 클릭하여 편집
   ```

### Step 2: API 키 도메인 제한 설정 (중요!)

**애플리케이션 제한사항**:
- "HTTP 리퍼러(웹사이트)" 선택

**웹사이트 제한사항**에 **반드시 추가**:
```
http://localhost:5178/*
http://localhost:5179/*
http://127.0.0.1:5178/*
http://127.0.0.1:5179/*
https://localhost:5178/*
https://localhost:5179/*
```

**⚠️ 주의**:
- `*`는 와일드카드 (예: `/voice-map`, `/home` 등 모든 경로 허용)
- 프로토콜(`http://`, `https://`) 구분 필요
- 포트 번호 포함 (`5178`, `5179`)

**저장** 클릭!

### Step 3: 결제 계정 확인

1. **결제 메뉴**로 이동
2. **결제 계정 연동** 확인
   - Google Maps Platform은 결제 계정이 필요합니다
   - 무료 크레딧($200) 제공되지만 계정 연결은 필수

### Step 4: 개발 서버 재시작

```bash
# 서버 완전히 중지 (Ctrl + C)
npm run dev
```

### Step 5: 브라우저 캐시 클리어

- **강제 새로고침**: `Ctrl + Shift + R` (Windows) 또는 `Cmd + Shift + R` (Mac)
- 또는 개발자 도구 > Application > Clear storage

## 🔧 빠른 진단 방법

브라우저 콘솔에서 실행:

```javascript
// 1. API 키 확인 (일부만 표시)
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
console.log("API 키:", apiKey ? apiKey.substring(0, 20) + "..." : "❌ 없음");

// 2. 현재 URL 확인
console.log("현재 URL:", window.location.href);

// 3. API 키 형식 확인 (AIzaSy로 시작해야 함)
if (apiKey && !apiKey.startsWith("AIzaSy")) {
    console.error("❌ API 키 형식이 올바르지 않습니다!");
}
```

## 🎯 가장 가능성 높은 원인

**1순위: 도메인 제한 설정 미완료**
- Google Cloud Console에서 API 키 설정을 열었지만
- 웹사이트 제한사항에 `localhost:5179`를 추가하지 않았을 가능성이 높습니다

**2순위: Maps JavaScript API 미활성화**
- API 키는 있지만 Maps JavaScript API가 활성화되지 않았을 수 있습니다

## ✅ 최종 체크리스트

다음 항목을 모두 확인하세요:

- [ ] Google Cloud Console 접속 완료
- [ ] 올바른 프로젝트 선택됨
- [ ] Maps JavaScript API **"사용 설정됨"** 상태
- [ ] API 키 편집 페이지 열림
- [ ] 애플리케이션 제한사항: **"HTTP 리퍼러(웹사이트)"** 선택
- [ ] 웹사이트 제한사항에 다음 **모두 추가**:
  - `http://localhost:5178/*`
  - `http://localhost:5179/*`
  - `http://127.0.0.1:5178/*`
  - `http://127.0.0.1:5179/*`
- [ ] **저장** 버튼 클릭 완료
- [ ] 결제 계정 연동 확인
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 강제 새로고침 (Ctrl + Shift + R)

## 🚨 그래도 안 되면

1. **API 키 재발급**
   - 새 키 생성
   - 동일한 설정 적용
   - `.env.local` 업데이트
   - 서버 재시작

2. **무제한 키로 테스트** (개발 환경에서만!)
   - API 키 설정에서 "제한 없음" 선택
   - 작동하면 → 도메인 제한 문제
   - 작동 안 하면 → API 키 또는 결제 문제

---

**99% 확률로 "도메인 제한 설정" 문제입니다!**
Google Cloud Console에서 API 키의 웹사이트 제한사항을 다시 확인하세요.

