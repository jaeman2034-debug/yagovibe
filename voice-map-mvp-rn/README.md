# 📱 React Native (Expo) 음성 검색 지도 MVP

> 1번 MVP: "말로 주변 장소 찾기 + 지도 핀 표시"

---

## ⚡ 빠른 시작 (10분)

### 1. 프로젝트 설정

```bash
# Expo 프로젝트 생성 (이미 있다면 생략)
npx create-expo-app voice-map-mvp-rn
cd voice-map-mvp-rn

# 패키지 설치
npm install expo-av expo-location react-native-maps axios
```

### 2. 파일 교체

* `App.js` → 위의 코드로 교체
* `package.json` → 위의 코드로 교체 (또는 패키지 추가)
* `app.json` → 위의 코드로 교체

### 3. 백엔드 실행

```bash
# 별도 터미널에서
cd ../voice-map-mvp/server
npm start
```

백엔드가 `http://localhost:4000`에서 실행되어야 합니다.

### 4. 앱 실행

```bash
npm start
```

그 다음:
- iOS: `i` 키 또는 Expo Go 앱에서 스캔
- Android: `a` 키 또는 Expo Go 앱에서 스캔

---

## ✅ 지금 이 코드로 되는 것

✅ 앱 실행
✅ 내 위치 지도 표시
✅ 하단 버튼 누르고 말하는 제스처
✅ **mock 음성 → "근처 축구장" 처리**
✅ 지도에 **핀 1개 표시**

👉 **MVP 합격선 충족**

---

## 📱 테스트 방법

### iOS (시뮬레이터)

1. `npm start` 후 `i` 키
2. 버튼 길게 누르기 (Press and Hold)
3. "근처 축구장" mock 처리 확인

### Android (에뮬레이터/기기)

1. `npm start` 후 `a` 키
2. 버튼 길게 누르기
3. 지도에 핀 표시 확인

---

## ⚠️ MVP에서 일부러 이렇게 만든 것

### ❌ 지금 안 한 것

* **실제 STT 연결** (mock 텍스트 사용)
* 리스트
* 상태 인식
* AI 멘트

### ✅ 지금 한 것

* **음성 → 검색 → 지도 반응 흐름**
* 모바일 UX 검증
* 녹음 파일 `uri` 준비 완료

---

## 🔜 다음에 바로 붙이면 되는 것 (순서)

### 1️⃣ STT 연결

**OpenAI Whisper 예시:**

```javascript
// stopRecording 함수 내
const uri = recording.getURI();

// Whisper API 호출
const formData = new FormData();
formData.append('file', {
  uri,
  type: 'audio/m4a',
  name: 'recording.m4a',
});

const sttRes = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'multipart/form-data',
  },
  params: {
    model: 'whisper-1',
    language: 'ko',
  },
});

const text = sttRes.data.text;
await searchPlace(text);
```

**Google Speech-to-Text 예시:**

```javascript
// Google Cloud Speech API 사용
const sttRes = await axios.post(
  'https://speech.googleapis.com/v1/speech:recognize',
  {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'ko-KR',
    },
    audio: {
      content: await fs.readFile(uri, 'base64'),
    },
  },
  {
    headers: {
      'Authorization': `Bearer ${GOOGLE_API_KEY}`,
    },
  }
);
```

---

### 2️⃣ 실제 장소 API 교체

**Kakao Local API 예시:**

```javascript
// server/index.js 내 PLACES 교체
const KAKAO_API_KEY = process.env.KAKAO_API_KEY;

async function searchKakaoPlaces(category, lat, lng) {
  const res = await axios.get(
    'https://dapi.kakao.com/v2/local/search/keyword.json',
    {
      params: {
        query: category,
        x: lng,
        y: lat,
        radius: 2000,
      },
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`,
      },
    }
  );
  
  return res.data.documents.map(item => ({
    id: item.id,
    name: item.place_name,
    lat: parseFloat(item.y),
    lng: parseFloat(item.x),
    category,
    distance: parseInt(item.distance),
  }));
}
```

---

## 📋 권한 설정 체크리스트

### iOS (app.json)

- [ ] `NSLocationWhenInUseUsageDescription` 설정
- [ ] `NSMicrophoneUsageDescription` 설정

### Android (app.json)

- [ ] `ACCESS_FINE_LOCATION` 권한
- [ ] `ACCESS_COARSE_LOCATION` 권한
- [ ] `RECORD_AUDIO` 권한

---

## 🧠 지금 가장 중요한 한 문장

> **이 React Native 코드는
> '완성품'이 아니라
> "출시 가능한 방향으로 움직이고 있다는 증거"다.**

---

## 🚀 다음 단계

이 코드로 **흐름 먼저 확인** 후:

1. STT 연결 (Whisper / Google STT)
2. 실제 장소 API 교체 (Kakao / Naver)
3. 실패 UX 추가
4. 결과 카드 완성

---

## 📞 필요하면 다음 바로 해줄 수 있는 것

* 🎙️ **Whisper STT 붙이는 코드**
* 🗺️ **카카오/네이버 지도 전환**
* 📱 **iOS / Android 권한 체크리스트**
* 🔥 **MVP에서 바로 배포하는 방법**

필요한 거 **딱 하나만 말해**.
이제 진짜 **제품 만드는 단계**다.
