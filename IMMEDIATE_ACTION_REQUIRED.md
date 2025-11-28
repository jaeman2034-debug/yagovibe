# ⚡ 즉시 조치 필요

## 🚨 현재 오류

**URL**: `https://yago-vibe-spt.firebaseapp.com/`
**오류**: "Unable to verify that the app domain is authorized"

## 🔥 즉시 해야 할 일 (5분 이내)

### Step 1: Firebase Console (2분)

1. https://console.firebase.google.com 접속
2. 프로젝트 `yago-vibe-spt` 선택
3. **Authentication** → **Settings** 탭
4. **Authorized domains** 섹션 확인
5. **`yago-vibe-spt.firebaseapp.com`이 있는지 확인**
6. **없으면 "Add domain" 클릭 → `yago-vibe-spt.firebaseapp.com` 입력 → "Add"**
7. **`localhost`도 있는지 확인 (없으면 추가)**

### Step 2: Google Cloud Console (1분)

1. https://console.cloud.google.com 접속
2. 프로젝트 `yago-vibe-spt` 선택
3. **APIs & Services** → **Credentials**
4. OAuth 2.0 클라이언트 ID 클릭
5. **승인된 리디렉션 URI** 확인
6. **`https://yago-vibe-spt.firebaseapp.com/_/auth/handler`가 있는지 확인**
7. **없으면 추가**

### Step 3: 대기 및 테스트 (2분)

1. **1-2분 대기** (설정 적용 시간)
2. 브라우저 새로고침 (F5)
3. 다시 테스트

## ✅ 확인 체크리스트

- [ ] Firebase Console → Authorized domains에 `yago-vibe-spt.firebaseapp.com` 포함
- [ ] Firebase Console → Authorized domains에 `localhost` 포함
- [ ] Google Cloud Console → Redirect URI에 `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` 포함
- [ ] 1-2분 대기 완료
- [ ] 브라우저 새로고침 완료

## 🎯 핵심 포인트

**가장 중요한 것**: Firebase Console의 Authorized Domains에 `yago-vibe-spt.firebaseapp.com` 추가!

이것만 해도 문제가 해결됩니다!

