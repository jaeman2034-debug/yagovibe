# 🚀 YAGO VIBE AI 자동 리포트 시스템

## 📋 목차

- [빠른 시작](#빠른-시작)
- [주요 기능](#주요-기능)
- [시스템 구조](#시스템-구조)
- [테스트 방법](#테스트-방법)

---

## ⚡ 빠른 시작

### 1단계: Firebase Emulator 실행

새 PowerShell 터미널:

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start --only firestore,auth,functions
```

✅ **완료 확인**: http://localhost:4000 접속 가능

---

### 2단계: 개발 서버 실행

**또 다른** 새 PowerShell 터미널:

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
npm run dev
```

✅ **완료 확인**: http://localhost:5173 접속 가능

---

### 3단계: Firestore 테스트 데이터 추가

**브라우저**에서:

1. http://localhost:4000 접속
2. "Firestore" 탭 클릭
3. 자세한 방법: `FIRESTORE_DATA_GUIDE.md` 참고

**또는** PowerShell에서:

```powershell
Invoke-RestMethod -Uri "http://localhost:5003/yago-vibe-spt/asia-northeast3/generateWeeklyReportAPI" -Method GET
```

---

### 4단계: 홈 페이지 접속 및 PDF 생성

**브라우저**에서:

1. http://localhost:5173/home 접속
2. "📸 전체 대시보드 스크린샷 PDF 저장" 클릭
3. PDF 다운로드 확인

---

## 🎯 주요 기능

### ✅ 완료된 기능

1. **AI 자동 리포트 생성**
   - Firebase Functions로 매주 자동 생성
   - Firestore에 자동 저장
   - Slack/Telegram 자동 알림

2. **실시간 대시보드**
   - Firestore onSnapshot으로 실시간 업데이트
   - AI 요약 리포트 카드
   - 주간 통계 그래프 (Chart.js)

3. **음성 기능 (Web Speech API)**
   - 🎙️ TTS: AI 리포트 음성 낭독
   - 🎤 STT: 음성 명령 인식
   - 🧠 대화형 AI 어시스턴트

4. **PDF 생성**
   - 📸 스크린샷 PDF (html2canvas)
   - 📄 데이터 기반 PDF (jsPDF)
   - 다중 페이지 자동 분할

5. **자동 알림**
   - Slack Webhook
   - Telegram Bot
   - 실시간 음성 알림

---

## 🏗️ 시스템 구조

### Firebase Functions

- `generateWeeklyReportJob`: 매주 월요일 9시 자동 실행
- `generateWeeklyReportAPI`: HTTP 트리거 (수동 실행)

### React 컴포넌트

- `AIWeeklySummary`: AI 요약 + TTS
- `AdminSummaryChart`: 실시간 통계 그래프
- `ReportPDFButton`: 데이터 기반 PDF
- `VoiceAssistantButton`: 전역 음성 명령
- `AIReportAssistant`: 대화형 AI
- `AdminVoiceNotifier`: 자동 음성 알림

---

## 📂 Firestore 구조

```
reports/
  └── weekly/
      └── data/
          ├── summary
          │   ├── newUsers
          │   ├── activeUsers
          │   ├── growthRate
          │   ├── highlight
          │   └── recommendation
          │
          └── analytics
              ├── labels
              ├── newUsers
              ├── activeUsers
              └── generatedAt
```

---

## 🧪 테스트 방법

### PDF 기능 테스트

1. 홈 페이지 접속
2. "📸 전체 대시보드 스크린샷 PDF 저장" 클릭
3. 다운로드된 PDF 확인

### 음성 기능 테스트

1. 홈 페이지 접속
2. 🎙️ "리포트 듣기" 클릭
3. AI가 리포트를 음성으로 읽어줌

### 대화형 AI 테스트

1. 홈 페이지 접속
2. "🧠 AI 리포트 어시스턴트" 섹션
3. 🎤 "질문하기" 클릭
4. "이번 주 활동률 어땠어?" 물어보기

---

## 📚 주요 문서

- `QUICK_START.md`: 빠른 시작 가이드
- `FIRESTORE_DATA_GUIDE.md`: Firestore 데이터 추가 가이드
- `PDF_EXPORT_COMPLETE.md`: PDF 기능 완성 문서
- `START_EMULATORS.md`: 에뮬레이터 실행 가이드

---

## 🆘 문제 해결

### 에뮬레이터 실행 안 됨

```powershell
# 기존 프로세스 종료
Get-Process | Where-Object {$_.ProcessName -eq "java"} | Stop-Process -Force

# 재시작
firebase emulators:start --only firestore,auth,functions
```

### 개발 서버 실행 안 됨

```powershell
# 포트 확인
netstat -ano | findstr "5173"

# 프로세스 종료
Stop-Process -Id <PID> -Force
```

### "리포트를 준비 중입니다..." 표시

Firestore에 데이터가 없습니다.
→ `FIRESTORE_DATA_GUIDE.md`의 방법으로 데이터 추가

---

## 🎉 완료!

**Genius Mode 1-7 모든 기능이 구현되었습니다!**

- ✅ 자동 리포트 생성
- ✅ 실시간 UI
- ✅ 음성 기능 (TTS/STT/NLU)
- ✅ PDF 생성
- ✅ 자동 알림
- ✅ 대화형 AI

---

**개발 완료: 2025-11-02**  
**버전: 1.0.0**

