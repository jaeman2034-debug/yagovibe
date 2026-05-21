# 🔧 핫 리로드 안 될 때 해결 방법

## 현재 문제
- 파일 수정해도 화면이 안 바뀜
- "Welcome!" 화면이 계속 보임

## 해결 방법 (순서대로)

### 1. Expo 서버 재시작 (캐시 클리어)

**PowerShell에서:**
```powershell
cd mobileApp
npx expo start --clear
```

또는:

```powershell
cd mobileApp
npx expo start -c
```

### 2. 폰에서 앱 완전 종료 후 재시작

**Expo Go 앱:**
- 앱 완전 종료
- 다시 열기
- QR 코드 다시 스캔

### 3. 번들 캐시 클리어

**터미널에서 `r` 키 누르기**
- 또는 Expo Go에서 흔들기 → "Reload"

### 4. 그래도 안 되면

**다른 파일 경로 확인:**
- `mobileApp/app/(tabs)/index.tsx`가 실제로 사용되는 파일인지
- `app-example` 폴더가 있으면 그게 실행될 수도

**확인 방법:**
- 터미널에서 "Reloading apps" 메시지 확인
- 번들링 성공 메시지 확인

## 현재 파일 상태

`mobileApp/app/(tabs)/index.tsx`:
- 검은 배경
- 빨간색 큰 텍스트 "🔥 YAGO MOBILE 🔥"
- 하단에 "화면이 바뀌었나요?" 텍스트

이게 보이면 성공입니다!
