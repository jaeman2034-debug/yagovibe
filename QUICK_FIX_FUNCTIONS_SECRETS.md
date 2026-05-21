# 🔧 Firebase Functions Secret 빠른 수정 가이드

## 🚨 문제 확인

현재 Functions 코드를 확인한 결과:
- ❌ **`secrets: ["OPENAI_API_KEY"]` 선언이 없음**
- ✅ `process.env.OPENAI_API_KEY`를 사용하는 코드는 있음
- ❌ Secret이 로드되지 않아 배포 실패

## ✅ 빠른 해결 방법

### 방법 1: Firebase Console에서 Environment Variable 설정 (가장 빠름)

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt`

2. **Environment Variable 설정**
   - 왼쪽 메뉴: **Functions**
   - 상단 탭: **Configuration**
   - **Environment variables** 탭 클릭
   - **Add variable** 버튼 클릭
   - Key: `OPENAI_API_KEY`
   - Value: OpenAI API Key 입력
   - **Save** 클릭

3. **Functions 재배포**
   ```bash
   firebase deploy --only functions
   ```

### 방법 2: Secret Manager 사용 (더 안전, 코드 수정 필요)

Secret Manager를 사용하려면 **각 함수에 `secrets: ["OPENAI_API_KEY"]` 선언이 필요**합니다.

하지만 Functions가 매우 많아서 모두 수정하는 것은 시간이 많이 걸립니다.

## 🔍 현재 코드 상태

### OpenAI를 사용하는 주요 함수들

1. `routeVoiceCommand` - `onCall` 사용
2. `voiceAnalyticsAssistant` - `onCall` 사용  
3. `analyzeProduct` - `onRequest` 사용
4. `voiceAdminConsole` - `onCall` 사용
5. `teamVoiceAgent` - `onCall` 사용
6. 기타 50개 이상의 함수들...

모두 `process.env.OPENAI_API_KEY`를 사용하지만, `secrets: ["OPENAI_API_KEY"]` 선언이 없습니다.

## 🎯 권장 작업 순서

### 즉시 실행 (빠른 해결)

1. **Firebase Console에서 Environment Variable 설정**
   - 가장 빠르고 간단함
   - 코드 수정 불필요

2. **Functions 재배포**
   ```bash
   firebase deploy --only functions
   ```

3. **확인**
   ```bash
   firebase functions:log
   ```
   - `Missing OPENAI_API_KEY` 메시지가 없어야 함

### 장기적 개선 (선택 사항)

나중에 시간이 있을 때 각 함수에 Secret 선언을 추가할 수 있습니다.

## 📝 참고

- Environment Variable은 Firebase Console에서 관리
- Secret Manager는 더 안전하지만 코드 수정 필요
- 현재는 Environment Variable 설정이 가장 빠른 해결책

