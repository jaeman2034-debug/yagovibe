# 🤔 Firebase Console 클라이언트 ID가 틀릴 수 있는 이유

## 💡 가능한 원인들

### 1️⃣ 수동 입력 시 오타
- Firebase Console에서 Google 제공자를 설정할 때 **사용자가 직접 입력**해야 함
- 입력 시 오타 발생 가능:
  - `1o426` (문자 `1`, 문자 `o`) → `10426` (숫자 `1`, 숫자 `0`)로 잘못 입력
  - 복사-붙여넣기 시 일부 문자가 잘못 복사됨

### 2️⃣ Google Cloud Console에서 클라이언트 ID 재생성
- Google Cloud Console에서 OAuth 클라이언트를 삭제하고 새로 생성한 경우
- Firebase Console에는 이전 클라이언트 ID가 남아있을 수 있음

### 3️⃣ 여러 OAuth 클라이언트 ID 존재
- Google Cloud Console에 여러 개의 OAuth 클라이언트 ID가 있을 수 있음
- Firebase Console에 잘못된 클라이언트 ID를 입력했을 수 있음

### 4️⃣ 자동 연결 실패
- Firebase Console이 Google Cloud Console과 자동으로 연결되지 않을 수 있음
- 수동으로 클라이언트 ID를 입력해야 하는 경우가 있음

## 🔍 확인 방법

### Google Cloud Console에서 확인
1. Google Cloud Console → APIs & Services → Credentials
2. **모든 OAuth 2.0 클라이언트 ID** 확인
3. Firebase Console의 클라이언트 ID와 일치하는 것이 있는지 확인
4. 일치하는 것이 없다면 → Firebase Console의 값이 잘못됨
5. 일치하는 것이 있다면 → 그 클라이언트 ID를 Firebase Console에 입력

### Firebase Console에서 확인
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드 확인
3. 이 값이 Google Cloud Console의 어떤 클라이언트 ID와도 일치하지 않는다면 → 잘못된 값

## ✅ 해결 방법

### 방법 1: Google Cloud Console의 올바른 클라이언트 ID 사용
1. Google Cloud Console에서 올바른 클라이언트 ID 확인
2. Firebase Console에 정확히 입력
3. 저장

### 방법 2: Firebase Console에서 자동 연결 시도
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드를 비우고 저장
3. 다시 열어서 Google Cloud Console과 자동 연결되는지 확인
4. 자동 연결이 안 되면 수동으로 입력

## 🎯 결론

Firebase Console의 클라이언트 ID는 **사용자가 직접 입력**하는 값이므로, 오타나 잘못된 값 입력이 가능합니다.

**Google Cloud Console의 클라이언트 ID가 올바른 값**이므로, Firebase Console에 그 값을 정확히 입력해야 합니다.

