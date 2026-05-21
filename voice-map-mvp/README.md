# 🚀 Voice Map MVP - 바로 실행 가이드

> 1번 MVP: "말로 주변 장소 찾는 지도"

---

## ⚡ 빠른 시작 (5분)

### 1. 백엔드 실행

```bash
cd server
npm install
npm start
```

서버가 `http://localhost:4000`에서 실행됩니다.

### 2. 프론트엔드 실행

1. `web/index.html` 파일 열기
2. Google Maps API 키 설정:
   - `index.html`의 `YOUR_GOOGLE_MAP_KEY`를 실제 키로 교체
3. 브라우저에서 열기 (Chrome 권장)

### 3. 테스트

1. "🎙️ 말로 장소 찾기" 버튼 클릭
2. "근처 축구장" 말하기
3. 지도에 핀 표시 확인

---

## ✅ 성공 기준

> 버튼 누르고
> "근처 축구장" 말하면
> **지도에 핀 하나라도 찍힌다**

이게 되면 **1번 MVP 성공**입니다.

---

## 📁 파일 구조

```
voice-map-mvp/
├── server/
│   ├── index.js          # Express 백엔드
│   └── package.json
└── web/
    ├── index.html        # 프론트엔드 HTML
    └── app.js            # 프론트엔드 JS
```

---

## 🔧 설정

### Google Maps API 키

1. [Google Cloud Console](https://console.cloud.google.com/)에서 API 키 생성
2. Maps JavaScript API 활성화
3. `web/index.html`의 `YOUR_GOOGLE_MAP_KEY` 교체

### CORS 설정

백엔드가 다른 포트에서 실행되므로 CORS가 활성화되어 있습니다.

---

## 🧪 테스트 케이스

### 성공 케이스

* "근처 축구장" → 축구장 핀 표시
* "헬스장" → 헬스장 핀 표시
* "배드민턴장" → 배드민턴장 핀 표시
* "카페" → 카페 핀 표시

### 실패 케이스

* "음…" → 아무 일도 없음 (조용히 복귀)
* "아이스하키장" → 결과 없음 카드 표시

---

## 🚀 다음 단계

이 코드로 **흐름 먼저 확인** 후:

1. 실제 장소 API로 `PLACES` 교체
2. 모바일(React Native / Flutter)로 이전
3. 음성 인식 실패 UX 추가

---

## 📞 필요하면 다음 바로 해줄 수 있는 것

* 📱 **모바일(React Native) 버전 코드**
* 🗺️ **카카오/네이버 지도 버전**
* 🎙️ **모바일 음성 SDK 교체 가이드**

---

## 🧠 핵심 원칙

> **지금은 잘 만드는 게 아니라
> 끝까지 만드는 단계다.**

이 MVP는
**완벽해서 출시하는 게 아니라
끝냈기 때문에 출시한다.**
