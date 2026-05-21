# 월간 리포트 이메일 자동 발송 설정 가이드

## ✅ 구현 완료 항목

1. **이메일 발송 서비스** (`functions/src/services/associationReportMailer.ts`)
   - SendGrid 직접 사용 (우선)
   - Gmail 폴백 지원
   - 협회 관리자 이메일 자동 조회
   - HTML 이메일 템플릿 (협회용, 간결)

2. **스케줄러 통합** (`functions/src/schedulers/monthlyReportScheduler.ts`)
   - PDF 생성 후 자동 이메일 발송
   - 이메일 발송 실패 시 non-blocking (로그만 남김)

3. **의존성 설치**
   - `@sendgrid/mail` 패키지 설치 완료

---

## 🔧 환경 변수 설정

### 방법 1: SendGrid 사용 (권장)

Firebase Functions 환경 변수 설정:

```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
```

또는 Firebase Console에서:
1. Firebase Console → Functions → Configuration
2. Environment variables 추가:
   - Key: `SENDGRID_API_KEY`
   - Value: `your_sendgrid_api_key`

### 방법 2: Gmail 사용

Firebase Functions 환경 변수 설정:

```bash
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.pass="your_app_password"
```

또는 Firebase Console에서:
1. Firebase Console → Functions → Configuration
2. Environment variables 추가:
   - `GMAIL_USER`: `your-email@gmail.com`
   - `GMAIL_PASS`: `your_app_password` (앱 비밀번호 사용)

---

## 📧 협회 이메일 주소 설정

협회 문서(`associations/{associationId}`)에 이메일 주소를 추가하세요:

```typescript
{
  name: "노원구축구협회",
  
  // 방법 1: 배열 (여러 수신자)
  adminEmails: [
    "admin@nowon-football.kr",
    "secretary@nowon-football.kr",
  ],
  
  // 방법 2: 단일 이메일
  email: "admin@nowon-football.kr",
  
  // 방법 3: 연락처 이메일
  contactEmail: "contact@nowon-football.kr",
}
```

**우선순위**: `adminEmails` → `email` → `contactEmail`

---

## 🚀 배포 체크리스트

### 1. 환경 변수 확인
```bash
# 현재 설정된 환경 변수 확인
firebase functions:config:get
```

### 2. Functions 배포
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:monthlyReportScheduler
```

### 3. 테스트 (수동 트리거)

#### 방법 1: Cloud Console에서 테스트
1. Firebase Console → Functions
2. `monthlyReportScheduler` 선택
3. "Test" 버튼 클릭

#### 방법 2: Callable 함수로 테스트
```typescript
// 프론트엔드 또는 Functions 테스트 코드
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const generateReport = httpsCallable(functions, "generateMonthlyReportPdf");
const result = await generateReport({
  associationId: "assoc-nowon-football",
  year: 2026,
  month: 1,
});
console.log("PDF URL:", result.data.pdfUrl);
```

---

## 📋 자동화 흐름

```
매월 1일 오전 9시 (Asia/Seoul)
    ↓
Cloud Scheduler 트리거
    ↓
PDF 리포트 생성
    ↓
Firebase Storage 저장
    ↓
협회 관리자 이메일 조회
    ↓
이메일 발송 (SendGrid 우선 → Gmail 폴백)
    ↓
협회 담당자 수신 ✅
```

---

## 🔍 이메일 발송 실패 대비

### 실패 처리 방식

1. **SendGrid 실패 시**: 자동으로 Gmail로 폴백
2. **전체 실패 시**: 
   - 에러 로그 기록 (Firebase Functions Logs)
   - PDF는 이미 Storage에 저장되어 있음
   - 수동 재전송 가능

### 로그 확인

```bash
# Firebase Functions 로그 확인
firebase functions:log --only monthlyReportScheduler

# 또는 Cloud Console에서
# Firebase Console → Functions → Logs
```

### 수동 재전송 (추후 확장 예정)

현재는 로그만 남기지만, 추후 `report_send_logs` 컬렉션에 기록하여:
- 발송 실패 이력 조회
- 재전송 버튼 제공
- 발송 상태 대시보드

---

## ✅ 성공 기준

- ✅ 매월 1일 오전 이메일 도착
- ✅ 제목/본문/링크 정상
- ✅ PDF 바로 열림
- ✅ 협회 반응: "리포트 알아서 오네요."

---

## 🎯 이메일 템플릿

### 제목
```
[노원구축구협회] 2026년 1월 월간 운영 리포트 (자동 생성)
```

### 본문
- 간결한 인사말
- PDF 다운로드 링크 (큰 버튼)
- 리포트 내용 요약 (1-2줄)
- "YAGO VIBE 운영 시스템" 서명

---

## 📝 참고 사항

### SendGrid API 키 발급
1. [SendGrid](https://sendgrid.com) 가입
2. Settings → API Keys
3. "Create API Key" 클릭
4. "Full Access" 권한 선택
5. API Key 복사 (한 번만 보여줌!)

### Gmail 앱 비밀번호 발급
1. Google Account → Security
2. 2-Step Verification 활성화
3. App passwords 생성
4. "Mail" 선택
5. 생성된 16자리 비밀번호 사용

---

## 🔗 관련 파일

- `functions/src/services/associationReportMailer.ts` - 이메일 발송 서비스
- `functions/src/schedulers/monthlyReportScheduler.ts` - 월간 리포트 스케줄러
- `functions/src/services/monthlyReportService.ts` - PDF 생성 서비스

---

**한 문장 요약**: 이메일이 자동으로 날아가는 순간, YAGO VIBE는 '업무를 없애는 시스템'이 된다. ✅

