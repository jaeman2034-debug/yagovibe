# 🎙️ Whisper STT 통합 완료 가이드

## ✅ 완료된 작업

### 서버
- ✅ `/stt` 엔드포인트 추가
- ✅ Whisper STT 연동
- ✅ 파일 업로드 처리 (multer)
- ✅ 임시 파일 자동 삭제

### React Native
- ✅ Mock 텍스트 제거
- ✅ 실제 STT 호출 구현
- ✅ FormData 파일 업로드
- ✅ 에러 처리

---

## 🚀 바로 실행하기

### 1. 서버 설정

```bash
cd voice-map-mvp/server

# 패키지 설치
npm install

# 환경 변수 설정
echo "OPENAI_API_KEY=sk-your-api-key-here" > .env

# 서버 실행
npm start
```

**OpenAI API 키 발급:**
- https://platform.openai.com/api-keys
- 계정 생성 후 API 키 발급

### 2. React Native 설정

`App.js`의 `API_BASE_URL` 확인:

```javascript
// 로컬 개발 (같은 기기)
const API_BASE_URL = "http://localhost:4000";

// 실제 서버 (다른 기기)
const API_BASE_URL = "http://YOUR_SERVER_IP:4000";
```

**Android 에뮬레이터:**
```javascript
const API_BASE_URL = "http://10.0.2.2:4000";
```

### 3. 테스트

1. 서버 실행 확인
2. 앱 실행
3. 버튼 길게 누르기
4. "근처 축구장" 말하기
5. 지도에 핀 표시 확인

---

## 📋 전체 흐름

```
[모바일]
음성 녹음 (.m4a)
   ↓
FormData로 서버 전송
   ↓
[서버]
/stt 엔드포인트
   ↓
Whisper STT → 텍스트
   ↓
텍스트 반환
   ↓
[모바일]
/search/voice 호출
   ↓
지도에 핀 표시
```

---

## 🔧 주요 변경 사항

### 서버 (`server/index.js`)

**추가된 것:**
- `multer` 파일 업로드 처리
- `/stt` 엔드포인트
- 임시 파일 자동 삭제

**새 파일:**
- `server/stt.js` - Whisper STT 로직

### React Native (`App.js`)

**변경된 것:**
- `stopRecording` 함수 완전 교체
- Mock 텍스트 제거
- 실제 STT API 호출
- 에러 처리 개선

---

## ⚠️ 주의사항

### 1. API 키 보안

- `.env` 파일은 **절대 커밋하지 마세요**
- `.gitignore`에 `.env` 추가 확인

### 2. 네트워크 설정

**실제 기기에서 테스트:**
- 서버 IP 주소 사용
- 같은 Wi-Fi 네트워크 필요

**시뮬레이터/에뮬레이터:**
- `localhost` 사용 가능

### 3. 비용 관리

- Whisper: $0.006 / 분
- 1분 녹음 ≈ $0.006
- 1000회 사용 ≈ $6

**비용 최소화:**
- 최대 녹음 시간 제한 (5초 권장)
- 무음 감지 (나중에 추가)

---

## 🧪 테스트 체크리스트

- [ ] 서버 실행 확인 (`npm start`)
- [ ] `.env` 파일에 `OPENAI_API_KEY` 설정
- [ ] React Native `API_BASE_URL` 설정
- [ ] 음성 녹음 → STT → 검색 흐름 테스트
- [ ] 에러 처리 확인 (음성 없을 때)

---

## 🐛 문제 해결

### "OPENAI_API_KEY is not defined"

→ `.env` 파일 확인
→ `dotenv.config()` 호출 확인

### "STT 처리 실패"

→ OpenAI API 키 유효성 확인
→ 파일 형식 확인 (오디오 파일만)
→ 서버 콘솔 로그 확인

### "네트워크 오류"

→ `API_BASE_URL` 확인
→ 서버 실행 확인
→ 방화벽 설정 확인

### "파일 크기 초과"

→ 10MB 제한 확인
→ 녹음 시간 줄이기

---

## ✅ 완료 판정

이 질문에 **YES**면 끝입니다:

> ❓ "말로 '근처 축구장' 했을 때
> 키보드 안 쓰고
> 핀이 바로 찍히는가?"

**YES → 출시 가능**

---

## 🚀 다음 단계

이제 **실제 음성 인식**이 작동합니다!

다음으로 추가할 수 있는 것:
- 무음 감지
- STT 결과 캐싱
- 에러 재시도 로직
- 음성 품질 검증
- 실제 장소 API 교체

필요한 거 **딱 하나만 말해**.
지금은 이미 **제품 만드는 단계**다.
