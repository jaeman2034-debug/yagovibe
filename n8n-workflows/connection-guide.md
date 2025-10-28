# 🚀 YAGO VIBE n8n 자동화 연결 가이드

## 📋 개요
YAGO VIBE 음성 지도 시스템의 일일 사용 통계를 자동으로 수집하고 Slack으로 리포트를 전송하는 n8n 워크플로입니다.

## 🔧 설정 단계

### 1️⃣ n8n 워크플로 생성
1. n8n 대시보드에 로그인
2. "New Workflow" 클릭
3. 제공된 `yago-vibe-daily-report.json` 파일을 import

### 2️⃣ Firestore REST API 연결
```bash
# Firestore REST API URL
https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/voice_logs

# 필요한 매개변수
- pageSize: 1000
- orderBy: ts desc
```

**인증 설정:**
- Google API 인증 사용
- Service Account Key 또는 OAuth 2.0 설정

### 3️⃣ Slack Node 설정
**방법 1: Incoming Webhook**
```bash
# Slack App 생성 후 Webhook URL 획득
https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

**방법 2: OAuth 2.0**
- Slack App 생성
- OAuth & Permissions 설정
- Bot Token 획득

### 4️⃣ Cron 트리거 설정
```bash
# 매일 오전 9시 실행
0 9 * * *

# 매주 월요일 오전 9시 실행
0 9 * * 1

# 매시간 실행 (테스트용)
0 * * * *
```

## 📊 데이터 처리 로직

### Code Node: 일일 로그 요약
```javascript
const logs = items[0].json.documents || [];
const today = new Date().toISOString().split("T")[0];
const count = logs.length;

const intents = {};
for (const log of logs) {
  const intent = log.fields.intent?.stringValue || "미확인";
  intents[intent] = (intents[intent] || 0) + 1;
}

return [{
  json: {
    summary: {
      date: today,
      total: count,
      intents,
    },
  },
}];
```

## 🎯 예상 결과

### Slack 메시지 예시
```
📊 [YAGO VIBE 일일 리포트]
🗓️ 날짜: 2025-01-24
🎙️ 총 음성 명령: 42건

📈 Intent 통계:
- 지도열기: 15
- 근처검색: 20
- 위치이동: 6
- 홈이동: 1

🔥 상위 키워드 Top 5:
- 편의점: 8회
- 카페: 6회
- 식당: 4회
- 약국: 2회
- 병원: 1회

⏰ 가장 활발한 시간: 14시 (12건)

📄 상세 리포트는 대시보드에서 확인하세요!
```

## 🔍 테스트 방법

### 1️⃣ 수동 실행
1. n8n 워크플로에서 "Execute Workflow" 클릭
2. 각 노드의 실행 결과 확인
3. 오류 발생 시 로그 확인

### 2️⃣ 디버깅
- Firestore API 응답 확인
- Code Node 출력 검증
- Slack 메시지 포맷 확인

## 📈 확장 가능성

### 추가 기능
1. **PDF 리포트 생성**: HTML to PDF 변환
2. **이메일 전송**: 관리자에게 상세 리포트
3. **데이터베이스 저장**: 통계 데이터 영구 저장
4. **알림 조건**: 특정 임계값 도달 시 알림
5. **다중 채널**: Discord, Teams 등 추가

### 고급 분석
1. **사용자 행동 패턴**: 시간대별, 요일별 분석
2. **성능 지표**: 응답 시간, 성공률 측정
3. **예측 분석**: 사용량 트렌드 예측
4. **A/B 테스트**: 기능별 사용량 비교

## 🛠️ 문제 해결

### 일반적인 오류
1. **Firestore 인증 실패**: Service Account Key 확인
2. **Slack 메시지 전송 실패**: Webhook URL 또는 Bot Token 확인
3. **데이터 형식 오류**: Firestore 응답 구조 확인
4. **Cron 실행 실패**: 시간대 설정 확인

### 로그 확인
- n8n 실행 로그
- Firestore API 응답
- Slack API 응답
- Code Node 출력

## 📚 참고 자료
- [n8n 공식 문서](https://docs.n8n.io/)
- [Firestore REST API](https://firebase.google.com/docs/firestore/reference/rest)
- [Slack API 문서](https://api.slack.com/)
- [Cron 표현식 가이드](https://crontab.guru/)
