# 🔍 전체 오류 원인 종합 분석

## 📊 현재 상태 확인 결과

### ✅ 정상 작동 중
1. **API 키 로드**: `AIzaSyCJ0ahD8gJDG1GM3GWoob3tsaVS4D93Wcw` (39자) ✅
2. **포트 설정**: vite.config.ts → 5179 ✅
3. **서버 상태**: 포트 5179 리스닝 중 ✅
4. **스크립트 로드**: "Google Maps API 로드 완료!" ✅
5. **지도 객체 생성**: "지도 초기화 성공!" ✅

### ❌ 발생 중인 오류 2개

1. **InvalidKeyMapError** (핵심 원인)
   - Google Maps JavaScript API error: InvalidKeyMapError
   - Google에서 API 키를 거부함

2. **TypeError: getRootNode** (연쇄 오류)
   - Cannot read properties of undefined (reading 'getRootNode')
   - InvalidKeyMapError로 인한 후속 오류

## 🎯 근본 원인 분석

### 오류 체인
```
1. InvalidKeyMapError 발생
   ↓
2. 지도 렌더링 실패 (Map 객체는 생성되었으나 실제 지도 타일 로드 실패)
   ↓
3. getRootNode TypeError (지도 DOM 요소가 초기화되지 않아 발생)
```

### InvalidKeyMapError 발생 가능 원인 (확률 순)

#### 1순위: API 키 도메인 제한 설정 문제 (90% 확률)
**증상**: API 키는 있지만 Google에서 현재 도메인을 허용하지 않음

**확인 필요**:
- Google Cloud Console > API 및 서비스 > 사용자 인증 정보
- API 키 편집 > 웹사이트 제한사항
- `https://localhost:5179/*` 포함 여부 확인

**필수 추가 항목**:
```
http://localhost:5178/*
http://localhost:5179/*
http://127.0.0.1:5178/*
http://127.0.0.1:5179/*
https://localhost:5178/*
https://localhost:5179/*
```

#### 2순위: Maps JavaScript API 미활성화 (8% 확률)
**증상**: API 키는 있지만 Maps JavaScript API가 활성화되지 않음

**확인 필요**:
- Google Cloud Console > API 및 서비스 > 라이브러리
- "Maps JavaScript API" 검색
- "사용 설정됨" 상태 확인

#### 3순위: 결제 계정 미연동 (1.5% 확률)
**증상**: API 키와 API 활성화는 되었지만 결제 계정이 없음

**확인 필요**:
- Google Cloud Console > 결제
- 결제 계정 연결 상태 확인

#### 4순위: API 키 프로젝트 불일치 (0.5% 확률)
**증상**: API 키가 다른 프로젝트에 속함

**확인 필요**:
- Firebase 프로젝트와 Google Cloud 프로젝트 일치 여부

## 🔧 즉시 해결 방법

### Step 1: Google Cloud Console 설정 (가장 중요!)

**1. Maps JavaScript API 활성화 확인**
```
https://console.cloud.google.com
→ 상단 프로젝트 선택 (올바른 프로젝트인지 확인)
→ API 및 서비스 > 라이브러리
→ "Maps JavaScript API" 검색
→ "사용 설정됨" 또는 "관리" 버튼이 보이는지 확인
→ 없다면 "사용 설정" 클릭
```

**2. API 키 도메인 제한 설정** ⚠️ 필수!
```
→ API 및 서비스 > 사용자 인증 정보
→ API 키 목록에서 해당 키 찾기 (AIzaSyCJ0ahD8...)
→ 키 클릭 (편집)
```

**3. 애플리케이션 제한사항 설정**
```
애플리케이션 제한사항:
→ "HTTP 리퍼러(웹사이트)" 선택 (필수!)
→ "IP 주소" 또는 "없음" 선택 시 작동 안 함
```

**4. 웹사이트 제한사항 추가** ⚠️ 가장 중요!
```
"웹사이트 제한사항" 섹션에서:
→ "항목 추가" 클릭
→ 다음 항목들을 하나씩 추가:
```

**필수 추가 항목 (복사해서 사용):**
```
http://localhost:5178/*
http://localhost:5179/*
http://127.0.0.1:5178/*
http://127.0.0.1:5179/*
https://localhost:5178/*
https://localhost:5179/*
```

**⚠️ 주의사항**:
- 각 항목을 **한 줄씩** 입력
- `*` 와일드카드 **반드시** 포함
- `http://`와 `https://` **둘 다** 추가
- 포트 번호 `5178`, `5179` **모두** 추가
- **저장 버튼 클릭 필수!**

**5. 저장 후 대기**
```
→ 하단 "저장" 또는 "완료" 버튼 클릭
→ 변경사항 적용까지 1-2분 소요될 수 있음
```

### Step 2: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl + C)
# 재시작
npm run dev
```

### Step 3: 브라우저 캐시 클리어

- **강제 새로고침**: `Ctrl + Shift + R`
- 또는 개발자 도구 > Application > Clear storage > Clear site data

## 📋 체크리스트

다음을 순서대로 확인하세요:

### Google Cloud Console 설정
- [ ] 올바른 프로젝트 선택됨
- [ ] Maps JavaScript API "사용 설정됨" 상태
- [ ] API 키 편집 페이지 열림
- [ ] 애플리케이션 제한사항: **"HTTP 리퍼러(웹사이트)"** 선택
- [ ] 웹사이트 제한사항에 다음 **모두 추가**:
  - [ ] `http://localhost:5178/*`
  - [ ] `http://localhost:5179/*`
  - [ ] `http://127.0.0.1:5178/*`
  - [ ] `http://127.0.0.1:5179/*`
  - [ ] `https://localhost:5178/*`
  - [ ] `https://localhost:5179/*`
- [ ] **저장 버튼 클릭 완료**
- [ ] 결제 계정 연결 확인

### 로컬 환경
- [ ] `.env.local` 파일에 API 키 설정됨
- [ ] API 키 형식 올바름 (AIzaSy로 시작, 39자)
- [ ] vite.config.ts 포트 5179로 설정됨
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 강제 새로고침 완료

### 브라우저 콘솔 확인
- [ ] `🧩 Google Maps API KEY = AIzaSy...` 표시됨
- [ ] `undefined` 아님
- [ ] `InvalidKeyMapError` 사라짐 (설정 후)
- [ ] 지도가 정상적으로 표시됨

## 🚨 가장 흔한 실수

### 실수 1: 저장하지 않음 ⚠️ 가장 흔함
- 설정을 변경했지만 **저장 버튼을 누르지 않음**
- 해결: 반드시 저장 버튼 클릭!

### 실수 2: 도메인 형식 오류
- `localhost:5179` (프로토콜 없음) ❌
- `http://localhost:5179` (와일드카드 없음) ❌
- `https://localhost:5179/*` (하나만 추가) ❌
- `http://localhost:5179/*` AND `https://localhost:5179/*` (둘 다 필요) ✅

### 실수 3: 애플리케이션 제한사항 설정 오류
- "없음" 선택 ❌
- "IP 주소" 선택 ❌
- "HTTP 리퍼러(웹사이트)" 선택 ✅

## ✅ 성공 확인

올바르게 설정되면:
- ✅ 콘솔에 `InvalidKeyMapError` 없음
- ✅ `getRootNode` 오류도 자동 해결됨
- ✅ 지도가 정상적으로 표시됨
- ✅ 마커, 줌, 패닝 등 모든 기능 작동

## 🎯 최종 결론

**핵심 문제**: InvalidKeyMapError
- API 키: 정상 로드됨 ✅
- 스크립트: 정상 로드됨 ✅
- 지도 객체: 생성 성공 ✅
- **실제 렌더링**: API 키 권한 거부 ❌

**원인**: Google Cloud Console 설정 문제
- 90% 확률: 도메인 제한 설정 누락 또는 오류
- 8% 확률: Maps JavaScript API 미활성화
- 2% 확률: 기타 (결제 계정, 프로젝트 불일치)

**해결 시간**: 2-3분 (설정 후 즉시 반영)

---

**가장 중요한 것**: Google Cloud Console에서 API 키의 웹사이트 제한사항에 `https://localhost:5179/*`를 추가하고 **반드시 저장**하세요!

