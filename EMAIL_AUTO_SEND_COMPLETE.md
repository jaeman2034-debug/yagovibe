# 📧 PDF 이메일 자동 발송 시스템 완료

## ✅ 완료된 작업

### 1️⃣ Nodemailer 설치
- ✅ functions/package.json에 nodemailer 추가
- ✅ 의존성 설치 완료

### 2️⃣ sendReportEmail.ts (신규 생성)
- ✅ Firebase Cloud Function 생성
- ✅ Gmail SMTP 연결
- ✅ HTML 이메일 템플릿
- ✅ PDF 첨부 지원
- ✅ 에러 처리

### 3️⃣ ReportPDFButton.tsx 업데이트
- ✅ Firebase Storage 업로드
- ✅ PDF URL 생성
- ✅ Cloud Function 호출
- ✅ 이메일 발송 통합

### 4️⃣ functions/index.ts 통합
- ✅ sendReportEmail export 추가

## 🔄 완전 자동화 흐름

```
사용자가 "PDF 다운로드" 버튼 클릭
  ↓
PDF 생성
  ↓
로컬 다운로드
  ↓
Firebase Storage 업로드
  ↓
PDF URL 생성
  ↓
Cloud Function 호출 (sendReportEmail)
  ↓
Gmail SMTP로 이메일 발송
  ↓
관리자에게 리포트 전송 완료
```

## 📧 이메일 템플릿

### 제목
```
📊 YAGO VIBE AI 주간 리포트 (2025-10-27)
```

### 본문
- AI 요약 리포트
- PDF 다운로드 링크
- 첨부 파일 (선택)
- 생성일 표시

### HTML 형식
```html
<div style="font-family: Arial, sans-serif;">
  <h2>📊 YAGO VIBE AI 주간 리포트</h2>
  <div>
    <h3>🧠 AI 요약</h3>
    <FMid>{summary}</p>
  </div>
  <a href="{pdfUrl}">📄 전체 리포트 PDF 다운로드</a>
</div>
```

## 🔧 Firebase Functions 설정

### Gmail 설정 명령
```bash
firebase functions:config:set \
  gmail.user="your_email@gmail.com" \
  gmail.pass="your_app_password"
```

### 배포 명령
```bash
cd functions
npm run build
firebase deploy --only functions:sendReportEmail
```

## ⚠️ Gmail 설정 주의사항

### 1. 2단계 인증 활성화
Gmail에서 2단계 인증을 활성화해야 합니다.

### 2. 앱 비밀번호 생성
1. Google 계정 → 보안
2. 2단계 인증 → 앱 비밀번호
3. "메일" 앱 선택
4. "기타" 기기 선택
5. 앱 비밀번호 생성
6. 생성된 비밀번호를 Firebase 설정에 저장

### 3. 일반 비밀번호 사용 불가
Gmail은 일반 비밀번호로는 SMTP 연결이 차단됩니다.

## 🎯 주요 기능

### 자동 발송
- ✅ PDF 생성 즉시 이메일 발송
- ✅ 관리자에게 자동 알림
- ✅ 첨부 파일 지원

### 안전한 처리
- ✅ 환경 변수로 이메일 설정 보안
- ✅ 에러 발생 시 안전하게 처리
- ✅ PDF 다운로드는 항상 성공

### 사용자 경험
- ✅ PDF 다운로드 완료 알림
- ✅ 이메일 발송 상태 알림
- ✅ 오류 시 친절한 메시지

## 📊 Firebase Storage 구조

### 파일 경로
```
reports/{timestamp}.pdf
```

### 다운로드 URL
```
https://firebasestorage.googleapis.com/...
```

## 🚀 사용 방법

### 1. Functions 환경 변수 설정
```bash
firebase functions:config:set gmail.user="admin@example.com" gmail.pass="app_password"
```

### 2. Functions 배포
```bash
firebase deploy --only functions:sendReportEmail
```

### 3. 프론트엔드 사용
홈 페이지에서 "PDF 다운로드" 버튼 클릭

### 4. 결과 확인
- PDF 다운로드됨
- 이메일 발송됨
- 관리자 이메일 수신 확인

## ✨ 결과

### 사용자 경험
1. 버튼 클릭
2. PDF 생성 및 다운로드
3. 이메일 발송 알림
4. 관리자가 이메일 수신

### 관리자 이메일 내용
- 제목: 📊 YAGO VIBE AI 주간 리포트 (날짜)
- AI 요약 텍스트
- PDF 다운로드 링크
- 생성일

---

**🎉 PDF 이메일 자동 발송 시스템 완료!**

리포트가 생성되면 자동으로 관리자에게 이메일이 발송됩니다! 📧✨

