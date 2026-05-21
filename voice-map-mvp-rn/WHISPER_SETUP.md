# 🎙️ Whisper STT 설정 가이드

## 1. 서버 설정

### 패키지 설치

```bash
cd voice-map-mvp/server
npm install multer openai
```

### 환경 변수 설정

1. `.env` 파일 생성:

```bash
cp .env.example .env
```

2. OpenAI API 키 입력:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**API 키 발급:**
- https://platform.openai.com/api-keys
- 계정 생성 후 API 키 발급

### 서버 실행

```bash
npm start
```

---

## 2. React Native 설정

### API 주소 확인

`App.js`의 `API_BASE_URL`을 실제 서버 주소로 변경:

```javascript
// 로컬 개발 (같은 기기)
const API_BASE_URL = "http://localhost:4000";

// 실제 서버 (다른 기기/배포)
const API_BASE_URL = "http://YOUR_SERVER_IP:4000";
// 또는
const API_BASE_URL = "https://your-domain.com";
```

### 네트워크 권한 (Android)

`app.json`에 이미 설정되어 있지만, 실제 기기에서 테스트할 때는:

1. Android: `AndroidManifest.xml`에 인터넷 권한 확인
2. iOS: Info.plist에 네트워크 권한 확인

(Expo는 자동으로 처리)

---

## 3. 테스트

### 1. 서버 실행 확인

```bash
curl http://localhost:4000/search/voice
```

### 2. 앱에서 테스트

1. 버튼 길게 누르기
2. "근처 축구장" 말하기
3. 지도에 핀 표시 확인

---

## 4. 문제 해결

### STT 실패 시

**에러 메시지 확인:**
- 서버 콘솔 로그 확인
- `OPENAI_API_KEY` 확인
- 파일 크기 확인 (10MB 제한)

### 네트워크 오류

**React Native에서 localhost 접근 불가:**
- 실제 기기: 서버 IP 주소 사용
- 시뮬레이터: `localhost` 사용 가능

**Android 에뮬레이터:**
```javascript
const API_BASE_URL = "http://10.0.2.2:4000";
```

**iOS 시뮬레이터:**
```javascript
const API_BASE_URL = "http://localhost:4000";
```

---

## 5. 비용 관리

### Whisper 비용

- **$0.006 / 분** (입력)
- 1분 녹음 = 약 $0.006
- 1000회 사용 = 약 $6

### 비용 최소화 팁

1. **최대 녹음 시간 제한** (5초 권장)
2. **무음 감지** (나중에 추가)
3. **캐싱** (같은 음성 재사용)

---

## ✅ 완료 체크리스트

- [ ] 서버에 `multer`, `openai` 설치
- [ ] `.env` 파일에 `OPENAI_API_KEY` 설정
- [ ] 서버 실행 확인
- [ ] React Native `API_BASE_URL` 설정
- [ ] 음성 녹음 → STT → 검색 흐름 테스트

---

## 🚀 다음 단계

이제 **실제 음성 인식**이 작동합니다!

다음으로 추가할 수 있는 것:
- 무음 감지
- STT 결과 캐싱
- 에러 재시도 로직
- 음성 품질 검증
