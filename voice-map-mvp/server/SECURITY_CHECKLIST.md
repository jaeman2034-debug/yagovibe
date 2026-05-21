# 🔐 API Key 보안 처리 체크리스트

## ❌ 절대 하면 안 되는 것

- [ ] 프론트엔드에 OpenAI API Key 넣기
- [ ] Expo에 직접 넣기
- [ ] `.env` 파일 커밋
- [ ] GitHub에 API Key 노출

👉 **유출 = 바로 비용 폭탄**

---

## ✅ 정답 구조 (현재 구조)

```
모바일 (React Native)
 └─ 음성 녹음만
 └─ API Key 모름

서버 (Node.js)
 ├─ Whisper STT 처리
 ├─ OpenAI API Key 보관 (.env)
 └─ 모바일은 절대 키를 모른다
```

---

## 🔐 서버 환경변수 설정

### `.env` 파일

```env
OPENAI_API_KEY=sk-xxxx
```

### ✅ 체크리스트

- [ ] `.env` 파일 생성됨
- [ ] `OPENAI_API_KEY` 설정됨
- [ ] `.gitignore`에 `.env` 추가됨
- [ ] `.env` 파일 커밋 안 됨

### 서버 코드 (`index.js`)

```javascript
import dotenv from "dotenv";
dotenv.config();

// 환경 변수 사용
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### ✅ 체크리스트

- [ ] `dotenv` 패키지 설치됨
- [ ] `dotenv.config()` 호출됨
- [ ] `process.env.OPENAI_API_KEY` 사용
- [ ] 하드코딩 없음

---

## 🔒 추가 보안 (MVP 기준)

### 1. 파일 크기 제한

```javascript
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
```

### ✅ 체크리스트

- [ ] 파일 크기 제한 설정 (5MB)
- [ ] 초과 시 에러 반환

### 2. 녹음 시간 제한

```javascript
// 프론트엔드: 5초 자동 종료
const MAX_RECORDING_DURATION = 5000;
```

### ✅ 체크리스트

- [ ] 최대 녹음 시간 제한 (5초)
- [ ] 자동 종료 타이머 설정

### 3. 무음 감지

```javascript
// 서버: 10KB 미만 = 무음
if (req.file.size < 10_000) {
  return res.json({ text: "" });
}
```

### ✅ 체크리스트

- [ ] 무음 파일 필터링
- [ ] 불필요한 STT 호출 방지

### 4. 일일 호출 제한

```javascript
// IP 기준 하루 100회
const MAX_REQUESTS_PER_IP = 100;
```

### ✅ 체크리스트

- [ ] 일일 호출 제한 설정
- [ ] 초과 시 429 에러 반환

---

## 🧪 보안 테스트

### ✅ 체크리스트

- [ ] `.env` 파일이 Git에 커밋 안 됨
- [ ] 프론트엔드 코드에 API Key 없음
- [ ] 서버 로그에 API Key 노출 안 됨
- [ ] 파일 크기 제한 작동 확인
- [ ] 일일 호출 제한 작동 확인

---

## 🐛 문제 해결

### "OPENAI_API_KEY is not defined"

1. `.env` 파일 확인
2. `dotenv.config()` 호출 확인
3. 서버 재시작

### "API Key 유출 우려"

1. GitHub에서 `.env` 파일 검색
2. 커밋 히스토리 확인
3. 유출 시 즉시 API Key 재발급

---

## ✅ 완료 판정

이 질문에 **모두 YES**면 완료:

- [ ] `.env` 파일 Git 제외됨
- [ ] 프론트엔드에 API Key 없음
- [ ] 파일 크기 제한 작동
- [ ] 일일 호출 제한 작동
