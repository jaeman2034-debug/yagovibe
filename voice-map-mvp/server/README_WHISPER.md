# 🎙️ Whisper STT 서버 설정

## 빠른 시작

### 1. 패키지 설치

```bash
npm install multer openai
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. 서버 실행

```bash
npm start
```

---

## API 엔드포인트

### POST `/stt`

음성 파일을 텍스트로 변환

**Request:**
- `Content-Type: multipart/form-data`
- `audio`: 음성 파일 (m4a, mp3, wav 등)

**Response:**
```json
{
  "text": "근처 축구장"
}
```

**에러 Response:**
```json
{
  "error": "음성 인식에 실패했습니다.",
  "message": "상세 에러 메시지"
}
```

---

## 파일 구조

```
server/
├── index.js      # Express 서버 + STT 엔드포인트
├── stt.js        # Whisper STT 로직
├── uploads/      # 임시 파일 저장 (자동 생성)
└── .env          # 환경 변수 (gitignore)
```

---

## 보안

- `.env` 파일은 **절대 커밋하지 마세요**
- `uploads/` 디렉토리는 임시 파일만 저장
- 파일은 STT 처리 후 **자동 삭제**

---

## 비용

- Whisper: $0.006 / 분
- 1분 녹음 ≈ $0.006
- 1000회 사용 ≈ $6

---

## 문제 해결

### "OPENAI_API_KEY is not defined"

→ `.env` 파일 확인

### "STT 변환 실패"

→ OpenAI API 키 유효성 확인
→ 파일 형식 확인 (오디오 파일만)

### "파일 크기 초과"

→ 10MB 제한 확인
→ 녹음 시간 줄이기
