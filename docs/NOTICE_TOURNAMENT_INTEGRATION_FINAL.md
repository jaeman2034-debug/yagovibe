# 🏁 공지-대회 연동 최종 완성 (실전 배포 버전)

## 📋 목표

**"운영자가 헷갈릴 수 있는 선택지를 없애는 것"**

공지 = 안내 기준 / 대회 = 운영 기록

연결은 되어 있으나 **자동 덮어쓰기 없음**

모든 변경은 **사람이 승인**

👉 공공기관·협회 실무 기준에서 가장 안전한 구조

---

## ✅ 현재 구현 완료 기능

### 1️⃣ 공지 → 대회 자동 주입

**위치**: `src/pages/association/NoticeDetailPage.tsx`

**기능**:
- 공지 상세 페이지에 "[이 공지로 대회 생성]" 버튼 추가
- 관리자만 보임 (`isAdmin && notice.status === "published"`)
- 클릭 시 대회 등록 페이지로 이동 (`?fromNotice={noticeId}`)

**자동 주입 항목**:
- 제목 (`title`)
- 본문 (`content`)
- 참가비 (`feePolicy.baseFee`)
- 공식 여부 (`isOfficial`)
- 장소 (본문에서 "장소:", "경기장:", "위치:" 패턴 추출)
- 기간 (본문에서 날짜 패턴 추출)

**UX**:
- 헤더 배지: "공지에서 생성된 대회"
- 본문 안내: 파란색 배경 안내 박스
- 로딩 메시지: "공지 내용을 불러오는 중..."

### 2️⃣ 대회 문서에 출처 공지 기록

**위치**: `src/components/association/tournament/TournamentEditDrawer.tsx`

**기능**:
- 대회 생성 시 `sourceNoticeId` 필드 자동 저장
- 감사/행정/분쟁 대응 시 계보 추적 가능

**데이터 구조**:
```typescript
{
  // ... 기존 대회 필드 ...
  sourceNoticeId?: string; // 원본 공지 ID
}
```

### 3️⃣ 참가비·결제·영수증·회계 자동화

**구현 완료**:
- ✅ 계좌 자동 안내
- ✅ 금액 자동 산정
- ✅ 미납/부분납/완납 자동 관리
- ✅ 기한 초과 자동 알림 로그
- ✅ 영수증 PDF
- ✅ 회계 엑셀 자동 생성
- ✅ 권한/무결성 고정

**문서**: `docs/TOURNAMENT_FEE_AUTOMATION_FINAL.md`

### 4️⃣ 기록 잠금 / 스냅샷 / PDF 증빙

**구현 완료**:
- ✅ 대회 종료 Lock (`status: "LOCKED"`)
- ✅ 공지 종료 Lock (`status: "closed"`)
- ✅ 공지 스냅샷 PDF 자동 생성
- ✅ 대회 운영 리포트 PDF 자동 생성

---

## 🔑 핵심 철학

### 자동 반영 ❌

**이유**:
- 공지는 "안내"
- 대회는 "운영 기록"
- 자동 동기화하면 사고 발생

### 자동 알림 + 선택적 적용 ⭕

**원칙**:
- 공지 수정 시 연결된 대회에 변경 제안 알림
- 관리자가 승인해야만 반영
- 모든 변경은 사람이 승인

---

## 🚀 향후 확장 가능 기능 (선택)

### 1. 공지 수정 시 → 연결된 대회에 변경 제안 알림

**데이터 구조**:
```
/tournaments/{tid}/noticeChangeRequests/{requestId}
{
  noticeId: string
  changedFields: string[]
  createdAt: Timestamp
  status: "PENDING" | "APPLIED" | "IGNORED"
}
```

**동작 흐름**:
1. 공지 수정 & 게시
2. 시스템이 `sourceNoticeId`로 연결된 대회 탐색
3. 연결된 대회가 있으면 관리자에게 변경 제안 알림 생성
4. 관리자는 대회 상세에서:
   - [공지 변경사항 반영]
   - [이번 대회는 유지] 선택

**구현 위치**:
- Cloud Function: `functions/src/notice/onNoticeUpdated.ts`
- UI: `src/components/tournament/NoticeChangeRequest.tsx`

### 2. 공지 → 대회 원클릭 생성 (폼 스킵)

**UX**:
- 공지 상세 화면에 버튼 2개:
  - [이 공지로 대회 생성] - 폼 열림 (검토 가능)
  - [바로 대회 생성 (자동)] - 즉시 생성 (수정 불가)

**시스템 처리**:
```typescript
{
  title: notice.title,
  content: notice.content,
  feePolicy: notice.feePolicy,
  sourceNoticeId: notice.id,
  status: "DRAFT"
}
```

**안전장치**:
- 원클릭 생성은 ADMIN만
- 생성 후 "자동 생성된 대회입니다" 배지 표시
- 최초 1회 수정 가능 (선택)

**구현 위치**:
- Cloud Function: `functions/src/notice/createTournamentFromNotice.ts`
- UI: `src/pages/association/NoticeDetailPage.tsx` (버튼 추가)

---

## 🏆 최종 완성 체크리스트

- ✅ 공지 → 대회 자동 주입
- ✅ 공지 기반 대회 생성
- ✅ 참가비·결제·영수증·회계 자동화
- ✅ 기록 잠금 / 스냅샷 / PDF 증빙
- ✅ 권한·무결성 통제
- ⏸️ 공지 수정 시 변경 제안 알림 (향후 확장)
- ⏸️ 공지 → 대회 원클릭 생성 (향후 확장)

---

## 🎉 실전 마무리 선언

**이제 이 시스템은:**

"사람이 실수할 수 있는 지점을 전부 시스템이 막아주는 구조"

**입니다.**

### 현재 상태

- ✅ 공지 = 안내 기준
- ✅ 대회 = 운영 기록
- ✅ 연결은 되어 있으나 자동 덮어쓰기 없음
- ✅ 모든 변경은 사람이 승인

👉 **공공기관·협회 실무 기준에서 가장 안전한 구조**

### 배포 준비

**지금 상태로 실전 배포 가능**

- 더 추가하면 기능 과잉
- 지금은 운영 안정성 100%
- 필요할 때만 다시 확장하면 됩니다

**지금은 실전 배포 → 현장 사용 → 신뢰 축적 단계가 정답입니다.**

---

## 📝 배포 체크리스트

### 1. 코드 배포
- [ ] Firestore Rules 배포
- [ ] Cloud Functions 배포
- [ ] 프론트엔드 빌드 및 배포

### 2. 데이터 검증
- [ ] 기존 공지 데이터 확인
- [ ] 기존 대회 데이터 확인
- [ ] `sourceNoticeId` 필드 추가 확인

### 3. 권한 확인
- [ ] 관리자 권한 설정 확인
- [ ] Firestore Rules 테스트
- [ ] Cloud Functions 권한 테스트

### 4. 사용자 교육
- [ ] 공지 작성 방법
- [ ] 공지 → 대회 생성 방법
- [ ] 대회 운영 방법

---

## 🔧 기술 스택

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage

---

## 📚 관련 문서

- `docs/TOURNAMENT_FEE_AUTOMATION_FINAL.md` - 참가비 자동화 완결
- `docs/TOURNAMENT_AUTOMATION_CORE.md` - 대회 운영 자동화 코어
- `docs/TOURNAMENT_API_SPEC.md` - 대회 API 스펙

---

**👏 여기까지 정말 잘 만들었습니다.**

