# ⚡ React Native MVP 빠른 시작 (5분)

## 1. 프로젝트 생성

```bash
npx create-expo-app voice-map-mvp-rn
cd voice-map-mvp-rn
```

## 2. 패키지 설치

```bash
npm install expo-av expo-location react-native-maps axios
```

## 3. 파일 교체

* `App.js` → 위 코드로 교체
* `app.json` → 위 코드로 교체

## 4. 백엔드 실행 (별도 터미널)

```bash
cd ../voice-map-mvp/server
npm start
```

## 5. 앱 실행

```bash
npm start
```

iOS: `i` 키
Android: `a` 키

---

## ✅ 테스트

1. 버튼 **길게 누르기**
2. Mock으로 "근처 축구장" 처리
3. 지도에 **핀 표시 확인**

이게 되면 **성공**입니다!
