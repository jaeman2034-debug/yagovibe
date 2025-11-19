# 🚀 Step 31 — 빠른 시작 가이드

## 📋 5단계로 Slack 봇 설정하기

### 1️⃣ Slack App 만들기

1. [Slack API](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch**
3. App 이름: `YAGO VIBE AI 리포트 봇`
4. 워크스페이스 선택

### 2️⃣ Slash Commands 등록

1. **Features** → **Slash Commands** → **Create New Command**

다음 4개 명령어를 각각 추가:

#### `/report`
- **Command**: `/report`
- **Request URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
- **Short Description**: 최신 리포트 조회
- **Usage Hint**: (비워두기)

#### `/tts`
- **Command**: `/tts`
- **Request URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
- **Short Description**: 최신 TTS 음성 리포트
- **Usage Hint**: (비워두기)

#### `/pdf`
- **Command**: `/pdf`
- **Request URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
- **Short Description**: 최신 PDF 리포트
- **Usage Hint**: (비워두기)

#### `/feedback`
- **Command**: `/feedback`
- **Request URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
- **Short Description**: 피드백 전송
- **Usage Hint**: `[rating] | [내용]` (예: `5 | 좋은 기능이에요!`)

**⚠️ 중요**: Request URL은 모두 동일합니다. `/slack/events` 경로는 필요 없습니다.

### 3️⃣ Interactivity 설정

1. **Features** → **Interactivity** → **Enable**
2. **Request URL**: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
3. **Save Changes**

### 4️⃣ OAuth & Permissions

1. **OAuth & Permissions** 메뉴로 이동
2. **Scopes** → **Bot Token Scopes**에서 다음 추가:
   - `chat:write` ✅
   - `commands` ✅
3. **Install to Workspace** 클릭
4. **Bot User OAuth Token** 복사: `xoxb-...`
5. **Basic Information** → **App Credentials** → **Signing Secret** 복사

### 5️⃣ Firebase Functions 환경 변수 설정

```bash
# Firebase Secrets 설정
firebase functions:secrets:set SLACK_BOT_TOKEN
# 입력: xoxb-... (Bot User OAuth Token)

firebase functions:secrets:set SLACK_SIGNING_SECRET
# 입력: ... (Signing Secret)
```

### 6️⃣ Functions 배포

```bash
firebase deploy --only functions:slackBot,functions:feedbackApi
```

### 7️⃣ Slack에서 테스트

1. Slack 채널에서 봇 초대:
   ```
   /invite @YAGO VIBE AI 리포트 봇
   ```

2. 명령어 테스트:
   ```
   /report
   /tts
   /pdf
   /feedback 5 | 좋은 기능이에요!
   ```

### 8️⃣ 관리자 대시보드에서 피드백 확인

1. `https://[PROJECT_ID].web.app/admin` 접속
2. **베타 피드백** 카드 확인
3. Slack/웹에서 전송한 피드백이 실시간으로 표시되는지 확인

## ✅ 체크리스트

- [ ] Slack App 생성 완료
- [ ] 4개 Slash Commands 등록 완료
- [ ] Interactivity 활성화 완료
- [ ] OAuth Scopes 설정 완료
- [ ] Bot Token 복사 완료
- [ ] Signing Secret 복사 완료
- [ ] Firebase Secrets 설정 완료
- [ ] Functions 배포 완료
- [ ] Slack에서 명령어 테스트 완료
- [ ] 관리자 대시보드에서 피드백 확인 완료

## 🐛 문제 해결

### Slack 봇이 응답하지 않을 때

1. **Bot Token 확인**
   ```bash
   firebase functions:config:get
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log --only slackBot
   ```

3. **Slack App 설정 확인**
   - Request URL이 올바른지 확인
   - 봇이 채널에 초대되었는지 확인
   - OAuth Scopes가 올바르게 설정되었는지 확인

### 서명 검증 실패 시

1. **Signing Secret 확인**
   - Firebase Secrets에 올바르게 설정되었는지 확인
   - Slack App의 Signing Secret과 일치하는지 확인

2. **타임스탬프 확인**
   - 5분 이상 지난 요청은 거부됩니다
   - Slack App의 타임스탬프 설정 확인

## 📚 추가 리소스

- [Slack API 문서](https://api.slack.com/)
- [Slack Slash Commands 가이드](https://api.slack.com/interactivity/slash-commands)
- [Firebase Functions 문서](https://firebase.google.com/docs/functions)

