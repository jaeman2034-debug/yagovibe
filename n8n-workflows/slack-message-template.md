// Slack 메시지 템플릿
// 📁 파일명: slack-message-template.md

# 📊 YAGO VIBE 일일 리포트

## 기본 템플릿
```
📊 [YAGO VIBE 일일 리포트]
🗓️ 날짜: {{ $json.summary.date }}
🎙️ 총 음성 명령: {{ $json.summary.total }}건

📈 Intent 통계:
{{ Object.entries($json.summary.intents).map(([intent, count]) => `- ${intent}: ${count}`).join('\n') }}

📄 PDF 리포트 첨부됨 (자동 생성)
```

## 고급 템플릿 (Code Node 사용)
```
📊 [YAGO VIBE 일일 리포트]
🗓️ 날짜: {{ $json.summary.date }}
🎙️ 총 음성 명령: {{ $json.summary.total }}건

📈 Intent 통계:
{{ Object.entries($json.summary.intents).map(([intent, count]) => `- ${intent}: ${count}`).join('\n') }}

🔥 상위 키워드 Top 5:
{{ $json.summary.topKeywords.map(k => `- ${k.keyword}: ${k.count}회`).join('\n') }}

⏰ 가장 활발한 시간: {{ $json.summary.peakHour }}

📄 상세 리포트는 대시보드에서 확인하세요!
```

## 이모지 및 스타일링
- 📊 통계
- 🗓️ 날짜
- 🎙️ 음성 명령
- 📈 Intent 통계
- 🔥 인기 키워드
- ⏰ 시간대 통계
- 📄 리포트
- 🚀 성과
- 💡 인사이트
- 🎯 목표
