# 🌐 웹 Mock 전략 (전략적 판단)

## ✅ 결정 사항

> **웹은 mock으로 두고 모바일 테스트 집중**

---

## 🎯 이유

### 현재 구조

- ✅ **모바일 앱이 메인**
- ✅ Whisper STT는 **서버 + 모바일용**
- 웹은 **관리/데모/보조**

### Web Speech API 문제

- PC 웹에서 음성 인식은 조건이 까다로움
- Chrome 최신 버전 필요
- HTTPS 또는 localhost 필요
- 유저 클릭 이벤트 안에서만 작동
- 브라우저별 지원 차이

### 전략적 판단

- 웹 음성 인식에 집착할 이유 없음
- 모바일 앱이 본게임
- 웹은 데모/관리용으로 충분

---

## 🔧 구현

### 웹 (`web/app.js`)

```javascript
// 웹에서는 mock 처리
voiceBtn.onclick = async () => {
  voiceBtn.innerText = "듣고 있어요…";
  
  setTimeout(async () => {
    const mockText = "근처 축구장"; // 웹 데모용
    await searchPlace(mockText);
  }, 1000);
};
```

### 모바일 앱 (`App.js`)

```javascript
// 모바일에서는 실제 Whisper STT 사용
const stopRecording = async () => {
  const uri = recording.getURI();
  const formData = new FormData();
  formData.append("audio", {...});
  
  const sttRes = await fetch(`${API_BASE_URL}/stt`, {...});
  const { text } = await sttRes.json();
  await searchPlace(text);
};
```

---

## ✅ 장점

1. **빠른 개발**: 웹 음성 인식 문제 해결 시간 절약
2. **안정성**: 브라우저 호환성 문제 없음
3. **명확한 역할**: 모바일 = 실제 사용, 웹 = 데모/관리
4. **비용 절감**: 웹에서 불필요한 STT 호출 없음

---

## 📋 체크리스트

- [ ] 웹 mock 처리 구현 완료
- [ ] 모바일 앱에서 실제 STT 작동 확인
- [ ] 웹 데모용으로 충분한지 확인

---

## 🚀 다음 단계

웹 mock 처리 완료 후:
- 모바일 앱 테스트 집중
- TestFlight 테스터 초대
- 첫 7일 지표 수집

---

## 🧠 핵심 원칙

> **웹은 데모용, 모바일이 본게임**
