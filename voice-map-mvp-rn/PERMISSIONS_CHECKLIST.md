# 📱 Android / iOS 권한 이슈 해결 체크리스트

## ✅ 공통 원칙

> **마이크 + 위치 권한은 "왜 필요한지" 문구가 명확해야 함**
> - iOS: 문구 없으면 빌드 자체가 거절
> - Android: 런타임 권한 요청 필수

---

## 🍎 iOS 권한 설정

### `app.json` 확인

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "주변 장소를 음성으로 검색하기 위해 마이크 접근이 필요합니다.",
        "NSLocationWhenInUseUsageDescription": "주변 장소를 음성으로 검색하기 위해 위치 정보가 필요합니다."
      }
    }
  }
}
```

### ✅ 체크리스트

- [ ] `NSMicrophoneUsageDescription` 설정됨
- [ ] `NSLocationWhenInUseUsageDescription` 설정됨
- [ ] 문구가 **명확하고 사용자 친화적**
- [ ] 빌드 후 앱 실행 시 권한 요청 팝업 정상 표시

### ❌ iOS에서 자주 나는 문제

**앱 실행하자마자 크래시**
→ 권한 문구 누락 99%
→ `app.json`의 `infoPlist` 확인

**음성 녹음 안 됨**
→ `Audio.requestPermissionsAsync()` 호출 안 함
→ `App.js`의 `startRecording` 함수 확인

---

## 🤖 Android 권한 설정

### `app.json` 확인

```json
{
  "expo": {
    "android": {
      "permissions": [
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

### ✅ 체크리스트

- [ ] `RECORD_AUDIO` 권한 추가됨
- [ ] `ACCESS_FINE_LOCATION` 권한 추가됨
- [ ] 실제 기기에서 테스트 (에뮬레이터는 마이크 인식 안 되는 경우 많음)

### ❌ Android 주의점

**에뮬레이터에서 마이크 안 됨**
→ 실제 기기 테스트 필수
→ 에뮬레이터는 위치만 테스트 가능

**권한 거부 후 재요청 안 됨**
→ 앱 설정에서 수동 권한 허용 필요
→ 사용자 안내 필요

---

## ✅ 권한 요청 코드 (정답 패턴)

### `App.js`에서

```javascript
// 위치 권한 (앱 시작 시 1번만)
useEffect(() => {
  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("위치 권한 필요", "위치 권한이 필요합니다.");
      return;
    }
    // 위치 가져오기
  })();
}, []);

// 마이크 권한 (녹음 시작 시)
const startRecording = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("마이크 권한 필요", "음성 검색을 위해 마이크 권한이 필요합니다.");
    return;
  }
  // 녹음 시작
};
```

### ✅ 체크리스트

- [ ] 위치 권한: 앱 시작 시 1번만 요청
- [ ] 마이크 권한: 녹음 시작 시 요청
- [ ] 권한 거부 시 사용자 안내 (Alert)
- [ ] 매번 요청하지 않음 (이미 허용된 경우 재요청 안 함)

---

## 🧪 테스트 체크리스트

### iOS

- [ ] 시뮬레이터에서 앱 실행
- [ ] 위치 권한 팝업 표시 확인
- [ ] 마이크 권한 팝업 표시 확인
- [ ] 권한 허용 후 기능 정상 작동 확인

### Android

- [ ] 실제 기기에서 테스트 (에뮬레이터 X)
- [ ] 위치 권한 요청 확인
- [ ] 마이크 권한 요청 확인
- [ ] 권한 거부 후 재요청 가능 확인

---

## 🐛 문제 해결

### "앱이 크래시됨"

1. `app.json`의 `infoPlist` 확인
2. 권한 문구 누락 확인
3. Expo 재빌드: `expo prebuild --clean`

### "권한 팝업이 안 나옴"

1. 이미 권한 허용된 경우 → 설정에서 확인
2. `requestPermissionsAsync()` 호출 확인
3. 권한 거부 후 재요청 → 앱 설정에서 수동 허용

### "녹음이 안 됨"

1. 마이크 권한 확인
2. 실제 기기에서 테스트 (에뮬레이터 X)
3. `Audio.setAudioModeAsync()` 호출 확인

---

## ✅ 완료 판정

이 질문에 **모두 YES**면 완료:

- [ ] iOS 빌드 성공
- [ ] Android 빌드 성공
- [ ] 권한 팝업 정상 표시
- [ ] 위치/마이크 기능 정상 작동
