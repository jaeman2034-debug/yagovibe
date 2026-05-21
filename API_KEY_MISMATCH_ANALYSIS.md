# 🚨 API 키 불일치 문제 발견!

## 발견된 문제

### 코드에서 사용하는 키 (올바름)
```
AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
```
- ✅ `AIzaSy...`로 시작 (올바른 형식)
- ✅ Firebase Console에서 제공한 키

### Google Cloud Console에 표시된 키 (잘못됨)
```
AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
```
- ❌ `AlzaSy...`로 시작 (잘못된 형식)
- ❌ 첫 글자가 `Al`이 아니라 `AI`여야 함

## 문제 분석

### 차이점
- **코드**: `AIzaSy...` (AI로 시작) ✅
- **Google Cloud Console**: `AlzaSy...` (Al로 시작) ❌

### 원인
Google Cloud Console에 표시된 키가 잘못되었거나, 다른 키를 보고 있는 것일 수 있습니다.

## 해결 방법

### 1단계: Google Cloud Console에서 올바른 키 찾기

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **모든 API 키 확인**
   - API keys 섹션에서 **모든 키** 확인
   - `AIzaSy...`로 시작하는 키 찾기 (코드에서 사용하는 키)

3. **잘못된 키 확인**
   - `AlzaSy...`로 시작하는 키가 있다면:
     - 이것은 잘못된 키이므로 무시하거나 삭제
     - 또는 다른 프로젝트의 키일 수 있음

### 2단계: 올바른 키의 HTTP 리퍼러 제한 설정

1. **올바른 키 선택**
   - `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` 키 클릭

2. **HTTP 리퍼러 제한 설정**
   - "애플리케이션 제한사항" → "HTTP 리퍼러(웹 사이트)" 선택
   - "웹사이트 제한"에 다음 추가:
     ```
     http://localhost:5173/*
     http://127.0.0.1:5173/*
     https://yago-vibe-spt.web.app/*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     ```

3. **API 제한사항 확인**
   - "API 제한사항" → "키 제한 안 함" 선택

4. **저장 및 대기**
   - [저장] 클릭
   - 5-10분 대기

### 3단계: 확인

브라우저 콘솔에서:
```javascript
getFirebaseApiKey()
// 예상 결과: "AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY"
```

## 중요 사항

⚠️ **Google Cloud Console에 `AlzaSy...`로 시작하는 키가 표시된다면:**
- 이것은 잘못된 키입니다
- Firebase API 키는 항상 `AIzaSy...`로 시작해야 합니다
- 이 키는 무시하고 `AIzaSy...`로 시작하는 올바른 키를 찾아야 합니다

## 결론

- **코드**: 올바른 키 사용 중 (`AIzaSy...`)
- **문제**: Google Cloud Console에서 잘못된 키를 보고 있거나, 올바른 키의 HTTP 리퍼러 제한이 설정되지 않음
- **해결**: Google Cloud Console에서 `AIzaSy...`로 시작하는 올바른 키를 찾아서 HTTP 리퍼러 제한 설정

