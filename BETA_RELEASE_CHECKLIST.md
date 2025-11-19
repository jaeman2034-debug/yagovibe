# 🧪 Step 31 — Beta Release 체크리스트

## 📋 배포 전 체크리스트

### 1️⃣ Slack App 설정

#### Slack App 생성
1. [Slack API](https://api.slack.com/apps)에서 새 App 생성
2. App 이름: "YAGO VIBE AI 리포트 봇"
3. 워크스페이스 선택

#### Slash Commands 설정
1. **Features** → **Slash Commands** → **Create New Command**
2. 다음 명령어들을 추가:

| 명령어 | 설명 | Request URL |
|--------|------|-------------|
| `/report` | 최신 리포트 조회 | `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot` |
| `/tts` | 최신 TTS 음성 리포트 | `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot` |
| `/pdf` | 최신 PDF 리포트 | `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot` |
| `/feedback` | 피드백 전송 | `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot` |

**참고**: Slack Events API를 사용하는 경우 Request URL은 `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`를 사용합니다. (`/slack/events` 경로는 필요 없습니다)

#### Interactivity 설정
1. **Features** → **Interactivity** → **Enable**
2. Request URL: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
   - **참고**: `/slack/events` 경로는 필요 없습니다. 함수 URL을 직접 사용합니다.
3. 저장

#### OAuth & Permissions
1. **OAuth & Permissions**에서 다음 Scopes 추가:
   - `chat:write` - 메시지 전송
   - `commands` - Slash Commands 사용
   - `app_mentions:read` - 멘션 읽기 (선택)
   - `channels:history` - 채널 히스토리 읽기 (선택)

2. **Install to Workspace** 클릭하여 워크스페이스에 설치
3. **Bot User OAuth Token** 복사: `xoxb-...`

#### Event Subscriptions (선택)
1. **Features** → **Event Subscriptions** → **Enable**
2. Request URL: `https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/slackBot`
   - **참고**: `/slack/events` 경로는 필요 없습니다. 함수 URL을 직접 사용합니다.
3. Subscribe to bot events:
   - `app_mention` (선택)
   - `message.channels` (선택)

#### Signing Secret 복사
1. **Basic Information** → **App Credentials**
2. **Signing Secret** 복사: `...`

### 2️⃣ Firebase Functions 환경 변수 설정

```bash
# Firebase Secrets 설정
firebase functions:secrets:set SLACK_BOT_TOKEN
firebase functions:secrets:set SLACK_SIGNING_SECRET

# 입력할 값:
# SLACK_BOT_TOKEN: xoxb-... (Bot User OAuth Token)
# SLACK_SIGNING_SECRET: ... (Signing Secret)
```

### 3️⃣ Firestore 보안 규칙

`firestore.rules`에 다음 규칙이 추가되어 있는지 확인:

```firestore
match /betaFeedback/{feedbackId} {
  allow read: if request.auth != null && (
    request.auth.token.role == "admin" ||
    request.auth.token.role == "manager"
  );
  allow write: if false; // Functions에서만 쓰기 가능
}
```

### 4️⃣ Functions 배포

```bash
# Functions 배포
firebase deploy --only functions

# 또는 특정 함수만 배포
firebase deploy --only functions:feedbackApi,functions:slackBot
```

### 5️⃣ 테스트

#### Slack 봇 테스트
1. Slack 채널에서 봇을 초대: `/invite @YAGO VIBE AI 리포트 봇`
2. 명령어 테스트:
   - `/report` - 최신 리포트 조회
   - `/tts` - 최신 TTS 음성 리포트
   - `/pdf` - 최신 PDF 리포트
   - `/feedback 5 | 좋은 기능이에요!` - 피드백 전송

#### 피드백 API 테스트
```bash
curl -X POST https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/feedbackApi \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "rating": 5,
    "what": "좋은 기능입니다!"
  }'
```

#### 관리자 대시보드 확인
1. `https://[PROJECT_ID].web.app/admin` 접속
2. **베타 피드백** 카드 확인
3. Slack/웹에서 전송한 피드백이 표시되는지 확인

## 🚀 배포 후 확인 사항

### ✅ Slack 봇 기능
- [ ] `/report` 명령어 정상 작동
- [ ] `/tts` 명령어 정상 작동
- [ ] `/pdf` 명령어 정상 작동
- [ ] `/feedback` 명령어 정상 작동

### ✅ 피드백 수집
- [ ] 웹에서 피드백 API 호출 가능
- [ ] Slack에서 피드백 전송 가능
- [ ] 관리자 대시보드에서 피드백 확인 가능

### ✅ 보안
- [ ] Firestore Rules 적용 확인
- [ ] Slack 서명 검증 작동 확인
- [ ] 관리자만 피드백 조회 가능 확인

## 📊 운영 팁

### 피드백 수집 전략
1. **주간 리포트에 포함**: Step 23/29 PDF 리포트에 피드백 요약 포함
2. **n8n 연동**: `betaFeedback` 생성 시 자동 분류 및 알림
3. **정기 검토**: 매주 월요일 관리자 회의에서 피드백 검토

### Slack 봇 활용
- **자동 알림**: 리포트 생성 시 Slack 채널에 자동 공유
- **빠른 접근**: `/report`, `/pdf`, `/tts`로 최신 리포트 즉시 확인
- **피드백 수집**: `/feedback` 명령어로 실시간 피드백 수집

### 베타 테스터 관리
- **베타 cohort 컬렉션**: 허용된 이메일/워크스페이스 관리 (선택)
- **피드백 분석**: 평점 분포, 주요 이슈, 아이디어 추출
- **우선순위 결정**: 피드백 빈도와 중요도에 따른 기능 개선 순서 결정

## 🔧 문제 해결

### Slack 봇이 응답하지 않을 때
1. Bot Token 확인: `SLACK_BOT_TOKEN` 환경 변수
2. Signing Secret 확인: `SLACK_SIGNING_SECRET` 환경 변수
3. Functions 로그 확인: `firebase functions:log --only slackBot`
4. Slack App 설정 확인: Request URL이 올바른지 확인

### 피드백이 저장되지 않을 때
1. Firestore Rules 확인: `betaFeedback` 컬렉션 규칙
2. Functions 로그 확인: `firebase functions:log --only feedbackApi`
3. CORS 설정 확인: `cors: true` 설정 확인

### 관리자 대시보드에서 피드백이 보이지 않을 때
1. 권한 확인: 관리자/매니저 권한 확인
2. Firestore Rules 확인: 읽기 권한 확인
3. 브라우저 콘솔 확인: 오류 메시지 확인

## 📝 참고사항

- Slack 봇은 **Slash Commands**와 **Interactivity**를 모두 지원합니다.
- 피드백은 **Slack**과 **웹 API** 두 가지 경로로 수집할 수 있습니다.
- 모든 피드백은 `betaFeedback` 컬렉션에 저장되며, 관리자만 조회 가능합니다.
- 배포 후 Slack 봇을 채널에 초대해야 명령어를 사용할 수 있습니다.

