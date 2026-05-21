# 💸 Whisper 비용 최소화 전략

## 🎯 목표

> **"말 한 번 = 몇 원" 수준으로 고정**

---

## ✅ 1. 녹음 시간 제한 (가장 중요)

### 프론트엔드 (`App.js`)

```javascript
// 최대 5초 녹음
const MAX_RECORDING_DURATION = 5000;

// 자동 종료 타이머
recordingTimeoutRef.current = setTimeout(() => {
  stopRecording();
}, MAX_RECORDING_DURATION);
```

### ✅ 체크리스트

- [ ] 최대 녹음 시간 5초로 제한
- [ ] 자동 종료 타이머 설정
- [ ] `onPressIn / onPressOut` 방식 유지

👉 **이거 하나로 비용 50% 절감**

---

## ✅ 2. Whisper 모델 선택

### 현재 설정 (`stt.js`)

```javascript
model: "whisper-1", // $0.006/분 (가장 저렴)
```

### 모델 비교

| 모델 | 비용 | 정확도 | 추천 |
|------|------|--------|------|
| `whisper-1` | $0.006/분 | 높음 | ✅ MVP |
| `gpt-4o-mini-transcribe` | 더 저렴 | 높음 | 미래 |

### ✅ 체크리스트

- [ ] `whisper-1` 사용 (가장 저렴)
- [ ] 한국어 지원 확인

---

## ✅ 3. 무음 컷 (서버에서)

### 서버 (`index.js`)

```javascript
// 10KB 미만 = 무음으로 간주
if (req.file.size < 10_000) {
  fs.unlinkSync(req.file.path);
  return res.json({ text: "" });
}
```

### ✅ 체크리스트

- [ ] 무음 파일 필터링
- [ ] 불필요한 STT 호출 방지
- [ ] 파일 삭제 확인

---

## ✅ 4. 재시도 금지 UX

### ❌ 하지 말 것

- "다시 말해보세요" 자동 재요청
- 에러 시 자동 재시도
- 사용자 모르게 중복 호출

### ✅ 정답

- 사용자가 **다시 누를 때만** STT 호출
- 에러 시 사용자에게 알림만
- 자동 재시도 없음

### ✅ 체크리스트

- [ ] 자동 재시도 없음
- [ ] 사용자 액션으로만 재호출
- [ ] 에러 메시지 명확

---

## ✅ 5. 일일 호출 제한 (서버)

### 서버 (`index.js`)

```javascript
// IP 기준 하루 100회
const MAX_REQUESTS_PER_IP = 100;

function checkRateLimit(ip) {
  const key = getDailyKey(ip);
  const count = dailyRequestCount.get(key) || 0;
  
  if (count >= MAX_REQUESTS_PER_IP) {
    return false;
  }
  
  dailyRequestCount.set(key, count + 1);
  return true;
}
```

### ✅ 체크리스트

- [ ] 일일 호출 제한 설정 (100회)
- [ ] IP 기준 제한
- [ ] 초과 시 429 에러 반환

---

## ✅ 6. 파일 크기 제한

### 서버 (`index.js`)

```javascript
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
```

### ✅ 체크리스트

- [ ] 파일 크기 5MB로 제한
- [ ] 초과 시 에러 반환

---

## 💰 현실적인 비용 감각

### 계산

- **1회 음성 (5초)**: 약 $0.0005 (약 0.6원)
- **하루 1,000회**: 약 $0.5 (약 600원)
- **한 달 10,000회**: 약 $5 (약 6,000원)

### ✅ 체크리스트

- [ ] 비용 예상치 계산
- [ ] 일일 제한으로 비용 통제
- [ ] 모니터링 계획 수립

---

## 📊 비용 모니터링

### OpenAI 대시보드

- https://platform.openai.com/usage
- 일일/월별 사용량 확인
- 비용 알림 설정

### ✅ 체크리스트

- [ ] OpenAI 대시보드 확인
- [ ] 비용 알림 설정
- [ ] 일일 사용량 모니터링

---

## 🧪 테스트 체크리스트

- [ ] 5초 자동 종료 작동 확인
- [ ] 무음 파일 필터링 확인
- [ ] 일일 호출 제한 작동 확인
- [ ] 파일 크기 제한 작동 확인

---

## ✅ 완료 판정

이 질문에 **모두 YES**면 완료:

- [ ] 녹음 시간 5초로 제한됨
- [ ] 무음 파일 필터링됨
- [ ] 일일 호출 제한 설정됨
- [ ] 비용 예상치 계산됨

---

## 🚀 다음 단계

비용 최소화 완료 후:

- 실제 사용량 모니터링
- 필요 시 제한 조정
- Redis로 제한 시스템 고도화 (선택)
